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
  METHODOLOGY_POINTS,
  TASK_EXAMPLES,
  type MethodologyPoint,
  type TaskExample,
} from './benchmarkContent';

export { METHODOLOGY_POINTS, TASK_EXAMPLES };
export type { MethodologyPoint, TaskExample };

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
   * 事件级 macro-F1 × 100（ARCHITECTURE §5.6）。
   * null = 事件级指标不可用。
   */
  score: number | null;
  /** 95% bootstrap CI；当前没有测，恒为 null，UI 隐藏。 */
  confidence: number | null;
  /** 100 × pair_protocol.relation_type_acc */
  topologyF1: number | null;
  /** 100 × pair_protocol.attrs_acc */
  affordanceAcc: number | null;
  /** 100 × pair_protocol.change_top1 */
  stateTransitionAcc: number | null;
  /** $ per task；本地自有硬件为 0，云端无计费口径为 null。 */
  cost: number | null;
  /** 展示用 token 数，如 "1.2k"；本地头无 token 口径为 null。 */
  tokens: string | null;
  /** 真实 token 数；未知为 null。 */
  tokenNum: number | null;
  /** 实测毫秒延迟。 */
  latency: number | null;
  /** 明细指标（表格行可展开）；后端未提供则为 null。 */
  metrics: ModelMetrics | null;
  /** 评测版本标签。真实数据当前统一为 v1.1；保留字段用于后续对照。 */
  version: string;
  /** 同 family 内 score 最高的模型（后端提供；缺失时前端按 score 推导）。 */
  isBest: boolean;
  /** 字段级 N/A 原因，例如 { "cost": "云端无公开计价口径" }。 */
  na: Record<string, string>;
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
  confidence?: unknown;
  topologyF1?: unknown;
  affordanceAcc?: unknown;
  stateTransitionAcc?: unknown;
  cost?: unknown;
  tokens?: unknown;
  tokenNum?: unknown;
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

const bestScore = (() => {
  const scores: number[] = [];
  for (const raw of rawModelList) {
    if (!isRecord(raw)) continue;
    const score = toNum(raw.score);
    if (score != null) scores.push(score);
  }
  return scores.length > 0 ? Math.max(...scores) : null;
})();

const normalizeModel = (raw: RawModel): ModelResult => {
  const family = toFamily(raw.family);
  const id = toStr(raw.id, toStr(raw.name, 'unknown-model'));
  const score = toNum(raw.score);
  const hasBestFlag = typeof raw.isBest === 'boolean';
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
    confidence: toNum(raw.confidence),
    topologyF1: toNum(raw.topologyF1),
    affordanceAcc: toNum(raw.affordanceAcc),
    stateTransitionAcc: toNum(raw.stateTransitionAcc),
    cost: toNum(raw.cost),
    tokens: typeof raw.tokens === 'string' && raw.tokens.trim() !== '' ? raw.tokens : null,
    tokenNum: toNum(raw.tokenNum),
    latency: toNum(raw.latency),
    metrics: normalizeMetrics(raw.metrics),
    version: toStr(raw.version, 'v1.1'),
    isBest: hasBestFlag ? raw.isBest === true : score != null && score === bestScore,
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

export const LEADERBOARD_META: LeaderboardMeta = {
  benchmark: toStr(rawMeta.benchmark, 'StarLife-1-WSV'),
  split: toStr(rawMeta.split, '') || null,
  nPairs: toNum(rawMeta.nPairs),
  nTestPairs: toNum(rawMeta.nTestPairs),
  dataset: toStr(rawMeta.dataset, '') || null,
  checkpoints: toStr(rawMeta.checkpoints, '') || null,
  sampleSeed: toNum(rawMeta.sampleSeed),
  generatedAt: toStr(rawMeta.generatedAt, '') || null,
  sourceRun: toStr(rawMeta.sourceRun, '') || null,
};

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

export const fmtCost = (value: number | null | undefined): string =>
  value == null || !Number.isFinite(value) ? NA : `$${value.toFixed(2)}`;

export const fmtLatency = (value: number | null | undefined): string =>
  value == null || !Number.isFinite(value) ? NA : `${Math.round(value)}ms`;

export const fmtTokens = (model: Pick<ModelResult, 'tokens' | 'tokenNum'>): string => {
  if (model.tokens) return model.tokens;
  if (model.tokenNum == null || !Number.isFinite(model.tokenNum)) return NA;
  return model.tokenNum >= 1000
    ? `${(model.tokenNum / 1000).toFixed(1)}k`
    : String(Math.round(model.tokenNum));
};

/** 明细指标：0–1 比例自动显示成百分比，其余数字保留两位小数。 */
export const fmtMetricValue = (value: MetricSectionValue | undefined): string => {
  if (value == null) return NA;
  if (Array.isArray(value)) return value.length > 0 ? value.join(' / ') : NA;
  if (typeof value === 'string') return value;
  if (!Number.isFinite(value)) return NA;
  return Math.abs(value) <= 1 ? `${(value * 100).toFixed(1)}%` : value.toFixed(2);
};

// ------------------------------------------------------------ 图表维度支持

export type MetricKey = 'cost' | 'tokens' | 'latency';

export const METRIC_LABELS: Record<MetricKey, string> = {
  cost: 'Cost',
  tokens: 'Output tokens',
  latency: 'Latency',
};

export const METRIC_UNAVAILABLE_REASONS: Record<MetricKey, string> = {
  cost: '无真实成本口径（云端无公开计价，本地自有硬件）',
  tokens: '无真实 token 统计',
  latency: '无实测延迟',
};

export const metricValue = (model: ModelResult, metric: MetricKey): number | null => {
  if (metric === 'cost') return model.cost;
  if (metric === 'tokens') return model.tokenNum;
  return model.latency;
};

export const hasMetricData = (models: ModelResult[], metric: MetricKey): boolean =>
  models.some((model) => metricValue(model, metric) != null);

/** 默认优先展示测量覆盖最广的维度。 */
export const firstAvailableMetric = (models: ModelResult[]): MetricKey | null =>
  (['latency', 'cost', 'tokens'] as MetricKey[]).find((metric) =>
    hasMetricData(models, metric),
  ) ?? null;
