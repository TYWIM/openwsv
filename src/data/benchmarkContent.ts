/**
 * 静态文案（非评测数据）。
 *
 * 这里只放：
 *  - BenchmarkCopy：基准的标题/副题/一句话定位（任何视觉语言模型都能提交）；
 *  - TaskExample：4 个判别任务的定义，描述真实输入/输出与判分口径；
 *  - MethodologyPoint：评测方法说明（冻结主干 + 4 个基准分类头、事件级指标、状态回放、60 对云端对照）；
 *  - CompositeDimGuide / WorldModelLayer：综合分 7 维的人话说明，以及本基准在世界模型六层中的位置。
 *
 * 所有"结果数字"都不在这里：模型榜单只从 `./leaderboard.generated.json` 读取，
 * 该文件由 starlife_eval 的 report/leaderboard.py 生成；缺失维度必须为 null（前端渲染 N/A）。
 */

export const BENCHMARK_TITLE = '空间理解与关系推理基准';
export const BENCHMARK_SUBTITLE = 'Spatial & Relational Understanding Benchmark';
export const BENCHMARK_POSITIONING =
  '任何视觉语言模型都能提交：给定两帧画面 + 槽位表，测的是模型能否输出正确的变化、空间关系、接触支撑，并组装成结构化的世界状态更新。StarLife-1-WSV-Lite 只是榜单里的一个参赛条目（本地头），不是这个基准的全部。';

export interface TaskExample {
  /** 与 starlife_eval 的 head 名称对齐：change / relation / rel_pos / attrs */
  id: string;
  title: string;
  description: string;
  /** 真实产物位置（数据集/协议），不是外部 demo 仓库 */
  repoOrDomain: string;
  modality: string;
  sceneType: string;
  difficulty: 'Standard' | 'Hard' | 'Extreme';
  /** 真值来源 */
  groundTruthType: string;
  /** 判分口径 */
  keyVerification: string;
  /** 模型实际看到的输入（云端 VLM 的 build_prompt 口径；本地头走特征/npz 口径） */
  samplePrompt: string;
}

export interface MethodologyPoint {
  number: string;
  title: string;
  subtitle: string;
  body: string;
}

export const TASK_EXAMPLES: TaskExample[] = [
  {
    id: 'change',
    title: 'Object Change Detection (4-way)',
    description:
      'Given a before/after RGB frame pair from the same synthetic 3D tabletop scene and the before-frame entity table (slot → bbox), classify every slot into none / appeared / displaced / disappeared.',
    repoOrDomain: 'dataset_spatial_v2 · changes[]',
    modality: 'RGB pair 1024×768',
    sceneType: 'Synthetic 3D tabletop',
    difficulty: 'Standard',
    groundTruthType: 'manifest changes[] (4 classes, non-none only listed)',
    keyVerification: 'Top-1 accuracy and 4-class macro-F1 over the test split',
    samplePrompt:
      'Input: before/after image pair + JSON entity table with slots and pixel bboxes.\nOutput: {\"slot_change\": {\"<slot>\": \"none|appeared|displaced|disappeared\"}}',
  },
  {
    id: 'relation',
    title: 'Spatial Relation Prediction (11 + none)',
    description:
      'For each candidate object pair, predict one of 11 exclusive spatial relations (on, inside, occludes, near, left_of, right_of, above, below, behind, in_front_of, touching …) plus the none class. Evaluation adds same-pair negative pairs sampled with the training seed.',
    repoOrDomain: 'dataset_spatial_v2 · relations[]',
    modality: 'RGB pair 1024×768',
    sceneType: 'Synthetic 3D tabletop',
    difficulty: 'Hard',
    groundTruthType: 'manifest relations[] relation class (11 relations + none negatives)',
    keyVerification: 'Top-1 and 12-class macro-F1 including 2× sampled negatives (seed 20261020)',
    samplePrompt:
      'Input: before/after image pair + entity table.\nOutput: [{\"from\": <slot>, \"to\": <slot>, \"relation\": \"<relation key>\"}]\nPairs that are not related must be labelled \"none\".',
  },
  {
    id: 'rel_pos',
    title: 'Relative Position Prediction (10-way)',
    description:
      'For a real (non-none) relation pair, predict the relative position class of the two objects (front / back / left / right / above / below / near / far …). This is a conditioned protocol: the ground-truth relation class is provided as a one-hot input.',
    repoOrDomain: 'dataset_spatial_v2 · rel_pos_keys',
    modality: 'RGB pair 1024×768',
    sceneType: 'Synthetic 3D tabletop',
    difficulty: 'Hard',
    groundTruthType: 'manifest relations[] rel_pos (10 classes)',
    keyVerification: 'Top-1 and 10-class macro-F1, evaluated on non-none GT relations only',
    samplePrompt:
      'Input: before/after image pair + ground-truth relation class for each pair.\nOutput: {\"<from>-<to>\": \"<relative position key>\"}',
  },
  {
    id: 'attrs',
    title: 'Affordance Attributes (contact / support)',
    description:
      'For each real relation pair, predict two binary physical attributes: whether the two objects are in contact, and whether one supports the other. Reported as the mean of the two binary macro-F1 scores.',
    repoOrDomain: 'dataset_spatial_v2 · contact/support',
    modality: 'RGB pair 1024×768',
    sceneType: 'Synthetic 3D tabletop',
    difficulty: 'Hard',
    groundTruthType: 'manifest relations[] contact / support (binary)',
    keyVerification: 'macro-F1(contact) and macro-F1(support), averaged; real relations only',
    samplePrompt:
      'Input: before/after image pair + entity table.\nOutput: [{\"from\": <slot>, \"to\": <slot>, \"contact\": true|false, \"support\": true|false}]',
  },
];

export const METHODOLOGY_POINTS: MethodologyPoint[] = [
  {
    number: '01',
    title: 'Frozen Backbone, Four Benchmark Heads',
    subtitle: 'Qwen3.8-27B (frozen) → change / relation / rel_pos / attrs',
    body:
      'The local entry reuses a frozen multimodal backbone — no fine-tuning and no cached online model — and trains four small classification heads for change / relation / rel_pos / attrs on top of the pooled 5120-d features of the before/after frames. Features, checkpoints and the dataset manifest are real artifacts loaded from a --data-root tree; nothing is synthesised at evaluation time. The benchmark itself is open to any vision-language model that outputs changes and relations — zero-shot or dedicated heads.',
  },
  {
    number: '02',
    title: 'Head-Level Metrics on the Real Test Split',
    subtitle: 'top-1 accuracy · macro-F1, with the training-time negative sampling replayed',
    body:
      'Change (4 classes), relation (11 + none) and rel_pos (10) are scored with top-1 accuracy and macro-F1 exactly as in training: relation evaluation re-creates the same same-pair negative pairs with seed 20261020, and rel_pos is a conditioned protocol using the ground-truth relation class as one-hot input. Affordance reports the mean of binary contact/support macro-F1.',
  },
  {
    number: '03',
    title: 'Event-Level F1 and World-State Replay',
    subtitle: 'predictions → WorldEvent subset → P/R/F1 + five-dimension replay consistency',
    body:
      'Per-pair predictions are translated into the same four-kind WorldEvent contract as the runtime (StateChanged, EntityCreated, RelationAdded, RelationRemoved) with monotonic timestamps and stable per-pair entity ids. Event P/R/F1 is computed per kind and macro-averaged, then predictions are replayed into a minimal WorldStore and compared against the ground-truth after-scene on object existence, changes, relation set and attributes. Dimensions the v2 annotations cannot support (RelationRemoved, before-relation deltas) are reported as N/A with a reason instead of being scored as zero.',
  },
  {
    number: '04',
    title: '60-Pair Head-to-Head Against Cloud VLMs',
    subtitle: 'same sample, same ground truth, no placeholders',
    body:
      'A deterministic random sample of 60 test pairs (seed 20261020, sorted) is replayed to every baseline: the offline DeepSeek-Flash raw cache and OpenAI-compatible cloud VLMs configured in the run config. Comparison uses relation matching by (from_slot, to_slot) with the cloud change macro-F1 convention. The leaderboard is ranked by the 7-dimension equal-weight composite score (change top-1, change macro-F1, relation class, relative position, contact/support, event F1, world-state consistency); the compatible event-level score (100 × event macro-F1), topology F1, affordance accuracy, state dynamics and head/pair/event/replay details stay available in each row. Any dimension without a real measurement is null and rendered as N/A — never filled with a placeholder.',
  },
];

// ------------------------------------------------------------ 综合分维度说明
//
// 后端在 `leaderboard.generated.json` 里给每个模型 7 个维度（0–100）与等权综合分，
// 这里只放"这一维测什么 / 结果怎么读"的人话说明；数值一律来自数据文件。

export type CompositeDimKey =
  | 'change_top1'
  | 'change_balance'
  | 'relation_type'
  | 'rel_pos'
  | 'attrs'
  | 'event_f1'
  | 'state_consistency';

export interface CompositeDimGuide {
  key: CompositeDimKey;
  /** 中文短语（与后端 dim.group 对齐；后端缺失时作为缺省） */
  group: string;
  /** 一句话：这一维到底测什么 */
  oneLiner: string;
  /** 一句话：结果怎么读 */
  howToRead: string;
}

/** 综合分的 7 个维度，顺序即等权综合分的展示顺序。 */
export const COMPOSITE_DIM_ORDER: CompositeDimKey[] = [
  'change_top1',
  'change_balance',
  'relation_type',
  'rel_pos',
  'attrs',
  'event_f1',
  'state_consistency',
];

export const COMPOSITE_FORMULA_FALLBACK = '7 项等权平均（各项 0-100，缺项自动从分母剔除）';

export const COMPOSITE_DIM_GUIDE: Record<CompositeDimKey, CompositeDimGuide> = {
  change_top1: {
    key: 'change_top1',
    group: '变化识别',
    oneLiner: '两帧之间每个物体到底发生了什么（出现 / 消失 / 被挪动 / 没变）。',
    howToRead: '认对的比例，越高越好；满分 100。',
  },
  change_balance: {
    key: 'change_balance',
    group: '变化平衡性',
    oneLiner: '不只看常见情况，稀有变化（比如"消失"）也判得准吗。',
    howToRead: '防止模型"全猜没变"刷高分，越接近变化识别分说明越均衡。',
  },
  relation_type: {
    key: 'relation_type',
    group: '关系类型',
    oneLiner: '两个物体之间属于哪一类空间关系（11 类，如在上 / 在下 / 相邻）。',
    howToRead: '必须先找对"哪两个物体"，再说对关系才算对。',
  },
  rel_pos: {
    key: 'rel_pos',
    group: '空间方位',
    oneLiner: '关系对了以后，方位（前 / 后 / 左 / 右 / 上 / 下…）说得对不对。',
    howToRead: '只统计关系类型判对的关系对。',
  },
  attrs: {
    key: 'attrs',
    group: '接触/支撑',
    oneLiner: '两个物体是否接触、是否互相支撑。',
    howToRead: '这是"能不能往上放东西 / 会不会掉"这类交互推断的地基。',
  },
  event_f1: {
    key: 'event_f1',
    group: '事件级F1',
    oneLiner:
      '把判断写成结构化事件流（状态变化事件 + 新关系事件）后，事件的查准率与查全率的调和平均。',
    howToRead: '只有本地模型和云端模型都能产出的两类事件参与（另两类缺标注，记 N/A）。',
  },
  state_consistency: {
    key: 'state_consistency',
    group: '世界状态一致性',
    oneLiner:
      '把预测的事件"回放"到世界里，重建出的新状态（有哪些物体 / 发生什么变化 / 关系 / 接触属性）跟真实状态对不对得上。',
    howToRead: '四个维度逐项算一致率再平均。',
  },
};

// ------------------------------------------------------- 世界模型六层中的位置
//
// 这段是"这测的是世界模型哪一环"的静态解释，不含结果数字。

export interface WorldModelLayer {
  /** ①–⑥ */
  index: string;
  title: string;
  description: string;
  /** false = 作为给定条件（冻结编码器），不在本榜单计分范围内 */
  measured: boolean;
}

export const WORLD_MODEL_LAYERS: WorldModelLayer[] = [
  {
    index: '①',
    title: '感知编码',
    description: '把像素变成实体与属性。',
    measured: false,
  },
  {
    index: '②',
    title: '状态估计',
    description: '此刻世界有什么。',
    measured: true,
  },
  {
    index: '③',
    title: '变化识别',
    description: '两帧之间发生了什么。',
    measured: true,
  },
  {
    index: '④',
    title: '关系与拓扑',
    description: '物体之间怎么摆、怎么接触。',
    measured: true,
  },
  {
    index: '⑤',
    title: '事件化',
    description: '把判断变成下游能吃的事件流。',
    measured: true,
  },
  {
    index: '⑥',
    title: '世界状态一致性',
    description: '回放事件后世界状态是否自洽。',
    measured: true,
  },
];

export const WORLD_MODEL_SCOPE = {
  title: '这测的是世界模型哪一环',
  eyebrow: 'Where this benchmark sits',
  intro:
    '世界模型一般分六层：① 感知编码（把像素变成实体与属性）② 状态估计（此刻世界有什么）③ 变化识别（两帧之间发生了什么）④ 关系与拓扑（物体之间怎么摆、怎么接触）⑤ 事件化（把判断变成下游能吃的事件流）⑥ 世界状态一致性（回放事件后世界状态是否自洽）。',
  focus:
    '本基准覆盖第 ②～⑥ 层（尤其是 ③④⑤）：给定视觉输入（编码器可任意，含冻结 backbone），考察模型能否把"看见的画面"变成可被机器人/仿真消费的结构化世界状态更新。',
  givenLabel: '作为给定条件（冻结编码器）',
  measuredLabel: '本榜单计分',
};
