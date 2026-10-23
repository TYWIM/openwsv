/**
 * OpenWSV 数据层。
 *
 * 唯一的数据来源是 `./openwsv.generated.json`（由评测流水线从冻结框架
 * `openwsv-1` 的结果产物生成）。本文件只做类型收窄、排序与格式化，
 * 不包含任何写死的排行榜数值。
 */

import raw from './openwsv.generated.json';

export interface WsvBenchmark {
  name: string;
  short: string;
  version: string;
  framework: string;
  updated: string;
}

export interface BoardRow {
  id: string;
  label: string;
  /** 0–1 的指标值（accuracy）。 */
  value: number;
  /** 95% CI（0–1）；未计算时为 null。 */
  ci: [number, number] | null;
  /** 完整回答覆盖的题目比例（0–1）；未报告时为 null。 */
  coverage: number | null;
  /** 该行模型是否读取冻结检测器输出的 bbox（VLM 行为 false）。 */
  usesHarnessBoxes: boolean;
}

export interface Board {
  id: string;
  label: string;
  n: number | null;
  /** 'pending' = 尚未出分，不显示任何分数。 */
  state?: 'pending';
  note?: string;
  rows?: BoardRow[];
}

export interface CompositeInfo {
  label: string;
  method: string;
}

export interface ProtocolRow {
  name: string;
  value: string;
}

export interface DatasetSuite {
  id: string;
  name: string;
  n: string;
  desc: string;
}

export interface ReproInfo {
  command: string;
  repo: string;
}

export interface WsvData {
  benchmark: WsvBenchmark;
  composite: CompositeInfo;
  defaultBoard: string;
  boards: Board[];
  protocol: ProtocolRow[];
  datasets: DatasetSuite[];
  repro: ReproInfo;
}

export const DATA = raw as unknown as WsvData;
export const BENCHMARK = DATA.benchmark;
export const COMPOSITE = DATA.composite;
export const BOARDS = DATA.boards;
export const PROTOCOL = DATA.protocol;
export const DATASETS = DATA.datasets;
export const REPRO = DATA.repro;

export const isPending = (board: Board): boolean => board.state === 'pending';

export const rowsOf = (board: Board): BoardRow[] => board.rows ?? [];

/** 按指标值降序。 */
export const sortedRows = (board: Board): BoardRow[] =>
  rowsOf(board).slice().sort((a, b) => b.value - a.value);

export const findBoard = (id: string): Board | undefined => BOARDS.find((board) => board.id === id);

/** 默认 tab：优先数据里的 defaultBoard，缺失则第一个。 */
export const DEFAULT_BOARD: string =
  findBoard(DATA.defaultBoard)?.id ?? BOARDS[0]?.id ?? 'overall';

export const SHIPPED_BOARDS = BOARDS.filter((board) => !isPending(board));
export const PENDING_BOARDS = BOARDS.filter(isPending);

export const MODEL_COUNT = new Set(SHIPPED_BOARDS.flatMap((board) => rowsOf(board).map((row) => row.id)))
  .size;

export const fmtCount = (n: number): string => n.toLocaleString('en-US');

/** 0–1 → 百分比（默认两位小数）。 */
export const fmtPct = (value: number, digits = 2): string => `${(value * 100).toFixed(digits)}%`;

export const fmtCi = (ci: [number, number] | null): string =>
  ci ? `[${fmtPct(ci[0])} – ${fmtPct(ci[1])}]` : '—';

/** 覆盖率：整数不补小数，其余两位。 */
export const fmtCoverage = (coverage: number | null): string => {
  if (coverage == null) return '—';
  const pct = coverage * 100;
  return Number.isInteger(pct) ? `${pct}%` : `${pct.toFixed(2)}%`;
};

export const isIncompleteCoverage = (row: BoardRow): boolean =>
  row.coverage != null && row.coverage < 1;

/** 模型 id → 家族色（仅视觉映射，不参与口径）。 */
const MODEL_COLORS: Array<[RegExp, string]> = [
  [/^qwen/i, 'var(--color-qwen)'],
  [/^deepseek/i, 'var(--color-deepseek)'],
  [/^glm/i, 'var(--color-zhipu)'],
  [/^minimax/i, 'var(--color-minimax)'],
  [/^mimo/i, 'var(--color-xiaomi)'],
];

export const modelColor = (id: string): string => {
  for (const [pattern, color] of MODEL_COLORS) {
    if (pattern.test(id)) return color;
  }
  return 'var(--muted-foreground)';
};