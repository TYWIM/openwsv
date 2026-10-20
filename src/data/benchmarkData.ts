/**
 * 前端数据层（契约见 starlife_eval/ARCHITECTURE.md §5.6 / §8）。
 *
 * 唯一的"结果数据"来源是 `./leaderboard.generated.json`，由
 * starlife_eval/report/leaderboard.py 生成（真实评测产物，不是 mock）。
 * 所有数值字段允许 null：null 表示该维度**没有真实测量值**，
 * 组件必须渲染为 N/A（详见下方 fmt* 工具），禁止用 0 / 占位值替代。
 *
 * 本文件不含任何写死的评测结果；静态方法论文案在 ./benchmarkContent.ts。
 */

import {
  BENCHMARK_POSITIONING,
  BENCHMARK_SUBTITLE,
  BENCHMARK_TITLE,
  COMPOSITE_DIM_GUIDE,
  COMPOSITE_DIM_ORDER,
  COMPOSITE_FORMULA_FALLBACK,
  METHODOLOGY_POINTS,
  TASK_EXAMPLES,
  WORLD_MODEL_LAYERS,
  WORLD_MODEL_SCOPE,
  type CompositeDimGuide,
  type CompositeDimKey,
  type MethodologyPoint,
  type TaskExample,
  type WorldModelLayer,
} from './benchmarkContent';

export {
  BENCHMARK_POSITIONING,
  BENCHMARK_SUBTITLE,
  BENCHMARK_TITLE,
  COMPOSITE_DIM_GUIDE,
  COMPOSITE_DIM_ORDER,
  COMPOSITE_FORMULA_FALLBACK,
  METHODOLOGY_POINTS,
  TASK_EXAMPLES,
  WORLD_MODEL_LAYERS,
  WORLD_MODEL_SCOPE,
};
export type { CompositeDimGuide, CompositeDimKey, MethodologyPoint, TaskExample, WorldModelLayer };

// ---------------------------------------------------------------- model 数据

export type ModelFamily =
  | 'StarLife'
  | 'Google'
  | 'OpenAI'
  | 'Anthropic'
  | 'Qwen'
  | 'DeepSeek'
  | 'Mistral'
  | 'Meta'
  | 'Community';

export type MetricSectionValue = number | string | null | Array<number | string>;

export interface ModelMetrics {
  head?: Record<string, MetricSectionValue>;
  pair?: Record<string, MetricSectionValue>;
  event?: Record<string, MetricSectionValue>;
  state?: Record<string, MetricSectionValue>;
  [section: string]: Record<string, MetricSectionValue> | undefined;
}

export interface ModelResult {
  id: string;
  name: string;
  family: ModelFamily;
  provider: string;
  providerColor: string;
  mode: string;
  /**
   * 事件级 macro-F1 × 100（ARCHITECTURE §5.6），作为**明细**保留。
   * null = 事件级指标不可用。
   */
  score: number | null;
  /** 榜单主分：7 维等权综合分（0–100）；null = 后端未提供综合分。 */
  compositeScore: number | null;
  /** 综合分的构成（7 个维度、权重、公式）；null = 旧版数据没有该段。 */
  composite: Composite | null;
  /** 95% bootstrap CI；当前没有测，恒为 null，UI 隐藏。 */
  confidence: number | null;
  /** 100 × pair_protocol.relation_type_acc */
  topologyF1: number | null;
  /** 100 × pair_protocol.attrs_acc */
  affordanceAcc: number | null;
  /** 100 × pair_protocol.change_top1 */
  stateTransitionAcc: number | null;
  /** 实测毫秒延迟（每事件端到端，含特征抽取 / API 往返）。唯一的运行时指标。 */
  latency: number | null;
  /** 明细指标（表格行可展开）；后端未提供则为 null。 */
  metrics: ModelMetrics | null;
  /** 评测版本标签。真实数据当前统一为 v1.1；保留字段用于后续对照。 */
  version: string;
  /** 同 family 内综合分最高的模型（后端提供；缺失时前端按综合分推导）。 */
  isBest: boolean;
  /** 字段级 N/A 原因（只保留与本基准相关的口径说明，例如 head-level 未测）。 */
  na: Record<string, string>;
}

/** 综合分的一个维度（数值已经 ×100，0–100）。 */
export interface CompositeDim {
  key: CompositeDimKey;
  /** 中文短语：变化识别 / 变化平衡性 / 关系类型 / 空间方位 / 接触支撑 / 事件级F1 / 世界状态一致性 */
  group: string;
  /** 表格列头用的短名 */
  label: string;
  value: number;
  /** 口径出处，如 "pair_protocol.change_top1" */
  source: string;
  available: boolean;
}

export interface Composite {
  method: string;
  weights: number[];
  available: number;
  total: number;
  dims: CompositeDim[];
}

// --------------------------------------------------------------- 榜单元信息

export interface LeaderboardMeta {
  benchmark: string;
  split: string | null;
  nPairs: number | null;
  nTestPairs: number | null;
  dataset: string | null;
  checkpoints: string | null;
  sampleSeed: number | null;
  generatedAt: string | null;
  sourceRun: string | null;
  /** 综合分口径（后端 meta.composite）；旧版数据为 null。 */
  composite: CompositeMeta | null;
}

export interface CompositeMeta {
  name: string;
  method: string;
  dims: number;
  formula: string;
  /** 后端对"综合分依赖权重"的说明（meta.composite.note）。 */
  note: string;
}

export interface TelemetryStat {
  label: string;
  value: string;
}

// --------------------------------------------------------------- 原始 JSON 类型

interface RawModel {
  id?: unknown;
  name?: unknown;
  family?: unknown;
  provider?: unknown;
  providerColor?: unknown;
  mode?: unknown;
  score?: unknown;
  compositeScore?: unknown;
  composite?: unknown;
  confidence?: unknown;
  topologyF1?: unknown;
  affordanceAcc?: unknown;
  stateTransitionAcc?: unknown;
  latency?: unknown;
  metrics?: unknown;
  version?: unknown;
  isBest?: unknown;
  na?: unknown;
}

interface RawLeaderboard {
  schemaVersion?: unknown;
  meta?: unknown;
  models?: unknown;
}

/** 后端可以写 `{meta, models}`，也兼容只写一个 model 数组。 */
type RawLeaderboardFile = RawLeaderboard | RawModel[];

// --------------------------------------------------------------- 归一化工具

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/**
 * 数值归一化：只接受有限数字（也接受数字字符串）。
 * 其他一律 null —— null 是"未测量"，不是 0。
 */
const toNum = (v: unknown): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

const toStr = (v: unknown, fallback: string): string =>
  typeof v === 'string' && v.trim() !== '' ? v : fallback;

const FAMILY_COLORS: Record<string, string> = {
  StarLife: 'var(--color-starlife)',
  Google: 'var(--color-gemini)',
  OpenAI: 'var(--color-openai)',
  Anthropic: 'var(--color-anthropic)',
  Qwen: 'var(--color-qwen)',
  DeepSeek: 'var(--color-deepseek)',
  Mistral: 'var(--color-mistral)',
  Meta: 'var(--color-meta)',
};

const KNOWN_FAMILIES: ModelFamily[] = [
  'StarLife',
  'Google',
  'OpenAI',
  'Anthropic',
  'Qwen',
  'DeepSeek',
  'Mistral',
  'Meta',
  'Community',
];

const toFamily = (v: unknown): ModelFamily =>
  KNOWN_FAMILIES.includes(v as ModelFamily) ? (v as ModelFamily) : 'Community';

const normalizeMetrics = (v: unknown): ModelMetrics | null => {
  if (!isRecord(v)) return null;
  const out: ModelMetrics = {};
  let hasSection = false;
  for (const [section, rawSection] of Object.entries(v)) {
    // 后端把 metrics.state 直接写成数字（state_acc），不是分组对象。
    if (
      typeof rawSection === 'number' ||
      typeof rawSection === 'string' ||
      Array.isArray(rawSection)
    ) {
      const value: MetricSectionValue = Array.isArray(rawSection)
        ? rawSection.filter(
            (item): item is number | string =>
              typeof item === 'number' || typeof item === 'string',
          )
        : typeof rawSection === 'number' || typeof rawSection === 'string'
          ? rawSection
          : null;
      out[section] = { [section === 'state' ? 'state_acc' : 'value']: value };
      hasSection = true;
      continue;
    }
    if (!isRecord(rawSection)) continue;
    const clean: Record<string, MetricSectionValue> = {};
    for (const [key, value] of Object.entries(rawSection)) {
      if (Array.isArray(value)) {
        clean[key] = value.filter(
          (item): item is number | string =>
            typeof item === 'number' || typeof item === 'string',
        );
      } else if (typeof value === 'number' || typeof value === 'string') {
        clean[key] = value;
      } else if (value === null) {
        clean[key] = null;
      }
      // 嵌套对象（如 per_kind）在前端明细里不展开，直接忽略
    }
    if (Object.keys(clean).length > 0) {
      out[section] = clean;
      hasSection = true;
    }
  }
  return hasSection ? out : null;
};

const normalizeNa = (v: unknown): Record<string, string> => {
  if (!isRecord(v)) return {};
  const out: Record<string, string> = {};
  for (const [key, reason] of Object.entries(v)) {
    if (typeof reason === 'string' && reason.trim() !== '') out[key] = reason;
  }
  return out;
};

// ------------------------------------------------------- 读取生成文件（构建期）

/**
 * 用 import.meta.glob 而不是静态 import：文件缺失时得到空集而不是构建失败，
 * 这样空态（"尚无评测结果"）在"后端还没生成文件"时也能渲染。
 * 文件存在时 eager 引入，等价于 `import file from './leaderboard.generated.json'`。
 */
const generatedFiles = import.meta.glob<RawLeaderboardFile>(
  './leaderboard.generated.json',
  { eager: true, import: 'default' },
);

const rawFile: RawLeaderboardFile | undefined = Object.values(generatedFiles)[0];

/** 兼容 `{ models: [...] }` 与裸数组两种顶层结构。 */
const rawModelList: unknown[] = Array.isArray(rawFile)
  ? rawFile
  : Array.isArray(rawFile?.models)
    ? (rawFile.models as unknown[])
    : [];

// ------------------------------------------------------------- 榜单模型列表

const normalizeCompositeDim = (raw: unknown): CompositeDim | null => {
  if (!isRecord(raw)) return null;
  const key = toStr(raw.key, '') as CompositeDimKey;
  if (!COMPOSITE_DIM_ORDER.includes(key)) return null;
  const guide = COMPOSITE_DIM_GUIDE[key];
  const value = toNum(raw.value);
  return {
    key,
    group: toStr(raw.group, guide.group),
    label: toStr(raw.label, guide.group),
    value: value ?? 0,
    source: toStr(raw.source, ''),
    available: typeof raw.available === 'boolean' ? raw.available : value != null,
  };
};

/** 综合分构成：7 维、等权权重、缺项自动从分母剔除。缺失/空段 -> null。 */
const normalizeComposite = (raw: unknown): Composite | null => {
  if (!isRecord(raw)) return null;
  const dimsRaw = Array.isArray(raw.dims) ? raw.dims : [];
  const dims = dimsRaw
    .map(normalizeCompositeDim)
    .filter((dim): dim is CompositeDim => dim != null);
  if (dims.length === 0) return null;
  const weightsRaw = Array.isArray(raw.weights)
    ? raw.weights.map(toNum).filter((w): w is number => w != null)
    : [];
  return {
    method: toStr(raw.method, 'equal-weight'),
    weights: weightsRaw,
    available: toNum(raw.available) ?? dims.filter((dim) => dim.available).length,
    total: toNum(raw.total) ?? dims.length,
    dims,
  };
};

/**
 * 榜单主分：优先综合分；旧版数据没有综合分时回退到可比事件分（明细字段），
 * 保证后端升级完成前页面仍然可读，而不是整列 N/A。
 */
export const primaryScore = (model: ModelResult): number | null =>
  model.compositeScore ?? model.score;

const bestScore = (() => {
  const scores: number[] = [];
  for (const raw of rawModelList) {
    if (!isRecord(raw)) continue;
    const score = toNum(raw.compositeScore) ?? toNum(raw.score);
    if (score != null) scores.push(score);
  }
  return scores.length > 0 ? Math.max(...scores) : null;
})();

const normalizeModel = (raw: RawModel): ModelResult => {
  const family = toFamily(raw.family);
  const id = toStr(raw.id, toStr(raw.name, 'unknown-model'));
  const score = toNum(raw.score);
  const compositeScore = toNum(raw.compositeScore);
  const hasBestFlag = typeof raw.isBest === 'boolean';
  const bestCandidate = compositeScore ?? score;
  // 颜色以 family 为准（family 是分类口径，颜色只是它的视觉映射）；后端若给了
  // providerColor 只在 family 未识别（Community/自定义）时作为兜底。
  const providerColor =
    FAMILY_COLORS[family] ?? toStr(raw.providerColor, 'var(--color-muted, #8b93a7)');
  return {
    id,
    name: toStr(raw.name, id),
    family,
    provider: toStr(raw.provider, family),
    providerColor,
    mode: toStr(raw.mode, '—'),
    score,
    compositeScore,
    composite: normalizeComposite(raw.composite),
    confidence: toNum(raw.confidence),
    topologyF1: toNum(raw.topologyF1),
    affordanceAcc: toNum(raw.affordanceAcc),
    stateTransitionAcc: toNum(raw.stateTransitionAcc),
    latency: toNum(raw.latency),
    metrics: normalizeMetrics(raw.metrics),
    version: toStr(raw.version, 'v1.1'),
    isBest: hasBestFlag ? raw.isBest === true : bestCandidate != null && bestCandidate === bestScore,
    na: normalizeNa(raw.na),
  };
};

export const BENCHMARK_MODELS: ModelResult[] = rawModelList
  .filter(isRecord)
  .map((raw) => normalizeModel(raw))
  .filter((model, index, all) => all.findIndex((m) => m.id === model.id) === index);

export const HAS_RESULTS = BENCHMARK_MODELS.length > 0;

/** 数据里实际出现过的版本，降序（v1.1 在 v1 前）。 */
export const DATA_VERSIONS: string[] = Array.from(
  new Set(BENCHMARK_MODELS.map((m) => m.version)),
).sort((a, b) => b.localeCompare(a));

// -------------------------------------------------------------------- meta

const rawMeta =
  !Array.isArray(rawFile) && isRecord(rawFile?.meta) ? rawFile.meta : {};

/** 数据契约版本（后端 schemaVersion）；旧文件为 null。 */
export const SCHEMA_VERSION: number | null = Array.isArray(rawFile)
  ? null
  : toNum(rawFile?.schemaVersion);

export const LEADERBOARD_META: LeaderboardMeta = {
  benchmark: toStr(rawMeta.benchmark, '空间理解与关系推理基准'),
  split: toStr(rawMeta.split, '') || null,
  nPairs: toNum(rawMeta.nPairs),
  nTestPairs: toNum(rawMeta.nTestPairs),
  dataset: toStr(rawMeta.dataset, '') || null,
  checkpoints: toStr(rawMeta.checkpoints, '') || null,
  sampleSeed: toNum(rawMeta.sampleSeed),
  generatedAt: toStr(rawMeta.generatedAt, '') || null,
  sourceRun: toStr(rawMeta.sourceRun, '') || null,
  composite: (() => {
    const raw = isRecord(rawMeta.composite) ? rawMeta.composite : null;
    if (!raw) return null;
    return {
      name: toStr(raw.name, '综合分'),
      method: toStr(raw.method, 'equal-weight'),
      dims: toNum(raw.n_dims) ?? toNum(raw.dims) ?? COMPOSITE_DIM_ORDER.length,
      formula: toStr(raw.formula, COMPOSITE_FORMULA_FALLBACK),
      note: toStr(raw.note, ''),
    };
  })(),
};

/** 综合分公式（优先后端 meta.composite.formula，否则用静态兜底文案）。 */
export const COMPOSITE_FORMULA: string =
  LEADERBOARD_META.composite?.formula ?? COMPOSITE_FORMULA_FALLBACK;

/** 生成时间的人读格式；不可解析则 null（UI 隐藏而不是写死日期）。 */
export const GENERATED_AT_LABEL: string | null = (() => {
  if (!LEADERBOARD_META.generatedAt) return null;
  const date = new Date(LEADERBOARD_META.generatedAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
})();

// ---------------------------------------------------------------- telemetry

/**
 * Hero 顶部的计数：只展示后端提供的真实计数（meta.telemetry），
 * 取不到的键直接隐藏，不写死。
 */
const TELEMETRY_ORDER = ['tasks', 'scenes', 'pairs', 'testPairs', 'models'];

const TELEMETRY_LABELS: Record<string, string> = {
  tasks: 'Tasks',
  scenes: 'Scenes',
  pairs: 'Pairs',
  testPairs: 'Test pairs',
  models: 'Models',
  slots: 'Slots',
  relations: 'Relations',
};

export const TELEMETRY_STATS: TelemetryStat[] = (() => {
  const raw = isRecord(rawMeta.telemetry) ? rawMeta.telemetry : null;
  if (!raw) return [];
  const entries = Object.entries(raw).filter(([, value]) => {
    const n = toNum(value);
    return n != null;
  });
  entries.sort(([a], [b]) => {
    const ia = TELEMETRY_ORDER.indexOf(a);
    const ib = TELEMETRY_ORDER.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  return entries.map(([label, value]) => ({
    label: TELEMETRY_LABELS[label] ?? label,
    value: String(toNum(value)),
  }));
})();

// ------------------------------------------------------------------ 格式化

export const NA = 'N/A';

export const fmtNumber = (value: number | null | undefined, digits = 2): string =>
  value == null || !Number.isFinite(value) ? NA : value.toFixed(digits);

export const fmtPct = (value: number | null | undefined, digits = 1): string =>
  value == null || !Number.isFinite(value) ? NA : `${value.toFixed(digits)}%`;

export const fmtLatency = (value: number | null | undefined): string =>
  value == null || !Number.isFinite(value) ? NA : `${Math.round(value)}ms`;

/** 明细指标：0–1 比例自动显示成百分比，其余数字保留两位小数。 */
export const fmtMetricValue = (value: MetricSectionValue | undefined): string => {
  if (value == null) return NA;
  if (Array.isArray(value)) return value.length > 0 ? value.join(' / ') : NA;
  if (typeof value === 'string') return value;
  if (!Number.isFinite(value)) return NA;
  return Math.abs(value) <= 1 ? `${(value * 100).toFixed(1)}%` : value.toFixed(2);
};

// ------------------------------------------------------------ 图表维度支持

/** 运行时指标只有延迟（每事件端到端）。 */
export type MetricKey = 'latency';

export const METRIC_LABELS: Record<MetricKey, string> = {
  latency: 'Latency',
};

export const METRIC_UNAVAILABLE_REASONS: Record<MetricKey, string> = {
  latency: '无实测延迟',
};

export const metricValue = (model: ModelResult, metric: MetricKey): number | null => {
  if (metric === 'latency') return model.latency;
  return null;
};

export const hasMetricData = (models: ModelResult[], metric: MetricKey): boolean =>
  models.some((model) => metricValue(model, metric) != null);

export const firstAvailableMetric = (models: ModelResult[]): MetricKey | null =>
  hasMetricData(models, 'latency') ? 'latency' : null;
