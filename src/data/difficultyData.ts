import curve from './difficulty_curve.json';
import type { CompositeDimKey, ModelFamily } from './benchmarkData';

export interface DifficultyBucket {
  key: string;
  label: string;
  rank: number;
  n: number;
  difficulty: [number, number];
  changed_mean: number;
  relations_mean: number;
}

export type DifficultyDims = Partial<Record<CompositeDimKey, number | null>>;

export interface DifficultyPoint {
  bucket: string;
  composite: number | null;
  dims: DifficultyDims;
}

export interface DifficultyModel {
  id: string;
  name: string;
  family: ModelFamily;
  mode: string;
  kind?: string;
  points: DifficultyPoint[];
}

interface DifficultyCurveFile {
  schemaVersion: number;
  metric: string;
  generatedFrom: string;
  xAxis: {
    key: string;
    label: string;
    definition: string;
    buckets: DifficultyBucket[];
  };
  yAxis: { key: string; label: string; range: [number, number] };
  note: string;
  models: DifficultyModel[];
}

export const DIFFICULTY_CURVE = curve as unknown as DifficultyCurveFile;

/** 难度档按 rank 升序（最易 → 最难）。 */
export const DIFFICULTY_BUCKETS: DifficultyBucket[] = [...DIFFICULTY_CURVE.xAxis.buckets].sort(
  (a, b) => a.rank - b.rank,
);

export const DIFFICULTY_MODELS: DifficultyModel[] = DIFFICULTY_CURVE.models;

const BY_ID = new Map(DIFFICULTY_MODELS.map((model) => [model.id, model]));

/** 按模型 id 取分档曲线；数据缺失时返回 null（图表跳过该模型）。 */
export const difficultyFor = (id: string): DifficultyModel | null => BY_ID.get(id) ?? null;

export const DIFFICULTY_DIMS: Array<{ key: CompositeDimKey; label: string; short: string }> = [
  { key: 'change_top1', label: '变化识别', short: '变化' },
  { key: 'change_balance', label: '变化平衡', short: '平衡' },
  { key: 'relation_type', label: '关系类型', short: '关系' },
  { key: 'rel_pos', label: '空间方位', short: '方位' },
  { key: 'attrs', label: '接触支撑', short: '接触' },
  { key: 'event_f1', label: '事件F1', short: '事件F1' },
  { key: 'state_consistency', label: '状态一致性', short: '一致性' },
];

export const DIFFICULTY_NOTE =
  '按 GT 难度分档（难度 = 2×变化物体数 + 关系对数），每档 15 对；档内样本少，档间差 <5 分不作为结论。';
