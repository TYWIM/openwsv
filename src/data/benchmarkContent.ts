/**
 * 静态方法论文案（非评测数据）。
 *
 * 这里只放两类内容：
 *  - TaskExample：5 个判别任务的定义，描述真实输入/输出与判分口径；
 *  - MethodologyPoint：评测方法说明（冻结主干 + 5 个分类头、事件级指标、状态回放、60 对云端对照）。
 *
 * 所有"结果数字"都不在这里：模型榜单只从 `./leaderboard.generated.json` 读取，
 * 该文件由 starlife_eval 的 report/leaderboard.py 生成；缺失维度必须为 null（前端渲染 N/A）。
 */

export interface TaskExample {
  /** 与 starlife_eval 的 head 名称对齐：change / type / relation / rel_pos / attrs */
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
      'Given a before/after RGB frame pair from the same synthetic 3D tabletop scene and the before-frame entity table (slot → bbox, type), classify every slot into none / appeared / displaced / disappeared.',
    repoOrDomain: 'dataset_spatial_v2 · changes[]',
    modality: 'RGB pair 1024×768',
    sceneType: 'Synthetic 3D tabletop',
    difficulty: 'Standard',
    groundTruthType: 'manifest changes[] (4 classes, non-none only listed)',
    keyVerification: 'Top-1 accuracy and 4-class macro-F1 over the test split',
    samplePrompt:
      'Input: before/after image pair + JSON entity table with slots, pixel bboxes and types.\nOutput: {\"slot_change\": {\"<slot>\": \"none|appeared|displaced|disappeared\"}}',
  },
  {
    id: 'type',
    title: 'Object Type Classification (22-way)',
    description:
      'Assign each post-change entity to one of the 22 object-type keys of the dataset vocabulary (table, chair, monitor, mug, …), using the frozen backbone features of the after frame.',
    repoOrDomain: 'dataset_spatial_v2 · type_keys',
    modality: 'RGB pair 1024×768',
    sceneType: 'Synthetic 3D tabletop',
    difficulty: 'Standard',
    groundTruthType: 'meta.type_keys (22 classes) per slot',
    keyVerification: 'Top-1 accuracy and 22-class macro-F1 (slots whose GT type is in vocabulary)',
    samplePrompt:
      'Input: before/after image pair + entity table.\nOutput: {\"slot_type\": {\"<slot>\": \"<one of the 22 type keys>\"}}',
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
    groundTruthType: 'manifest relations[] type (11 relations + none negatives)',
    keyVerification: 'Top-1 and 12-class macro-F1 including 2× sampled negatives (seed 20261020)',
    samplePrompt:
      'Input: before/after image pair + entity table.\nOutput: [{\"from\": <slot>, \"to\": <slot>, \"relation\": \"<relation key>\"}]\nPairs that are not related must be labelled \"none\".',
  },
  {
    id: 'rel_pos',
    title: 'Relative Position Prediction (10-way)',
    description:
      'For a real (non-none) relation pair, predict the relative position class of the two objects (front / back / left / right / above / below / near / far …). This is a conditioned protocol: the GT relation type is provided as a one-hot input.',
    repoOrDomain: 'dataset_spatial_v2 · rel_pos_keys',
    modality: 'RGB pair 1024×768',
    sceneType: 'Synthetic 3D tabletop',
    difficulty: 'Hard',
    groundTruthType: 'manifest relations[] rel_pos (10 classes)',
    keyVerification: 'Top-1 and 10-class macro-F1, evaluated on non-none GT relations only',
    samplePrompt:
      'Input: before/after image pair + ground-truth relation type for each pair.\nOutput: {\"<from>-<to>\": \"<relative position key>\"}',
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
    title: 'Frozen Backbone, Five Heads',
    subtitle: 'Qwen3.8-27B (frozen) → change / type / relation / rel_pos / attrs',
    body:
      'Every run reuses the frozen multimodal backbone — no fine-tuning and no cached online model — and trains five small classification heads on top of the pooled 5120-d features of the before/after frames. Features, checkpoints and the dataset manifest are real artifacts loaded from a --data-root tree; nothing is synthesised at evaluation time.',
  },
  {
    number: '02',
    title: 'Head-Level Metrics on the Real Test Split',
    subtitle: 'top-1 accuracy · macro-F1, with the training-time negative sampling replayed',
    body:
      'Change (4 classes), type (22), relation (11 + none) and rel_pos (10) are scored with top-1 accuracy and macro-F1 exactly as in training: relation evaluation re-creates the same same-pair negative pairs with seed 20261020, and rel_pos is a conditioned protocol using the ground-truth relation type as one-hot input. Affordance reports the mean of binary contact/support macro-F1.',
  },
  {
    number: '03',
    title: 'Event-Level F1 and World-State Replay',
    subtitle: 'predictions → WorldEvent subset → P/R/F1 + five-dimension replay consistency',
    body:
      'Per-pair predictions are translated into the same four-kind WorldEvent contract as the runtime (StateChanged, EntityCreated, RelationAdded, RelationRemoved) with monotonic timestamps and stable per-pair entity ids. Event P/R/F1 is computed per kind and macro-averaged, then predictions are replayed into a minimal WorldStore and compared against the ground-truth after-scene on object existence, types, changes, relation set/type and attributes. Dimensions the v2 annotations cannot support (RelationRemoved, before-relation deltas) are reported as N/A with a reason instead of being scored as zero.',
  },
  {
    number: '04',
    title: '60-Pair Head-to-Head Against Cloud VLMs',
    subtitle: 'same sample, same ground truth, no placeholders',
    body:
      'A deterministic random sample of 60 test pairs (seed 20261020, sorted) is replayed to every baseline: the offline DeepSeek-Flash raw cache and OpenAI-compatible cloud VLMs configured in the run config. Comparison uses relation matching by (from_slot, to_slot) with the cloud change macro-F1 convention. Leaderboard score is 100 × event macro-F1; topology F1 = relation-type accuracy; affordance = attribute accuracy; state dynamics = change top-1. Any dimension without a real measurement is null and rendered as N/A — never filled with a placeholder.',
  },
];
