import raw from './confidence_intervals.json';

export type ConfidenceMetricKey =
  | 'composite'
  | 'change_top1'
  | 'change_balance'
  | 'relation_type'
  | 'rel_pos'
  | 'attrs'
  | 'event_f1'
  | 'state_consistency';

export interface ConfidenceInterval {
  value: number;
  lo: number;
  hi: number;
}

interface ConfidenceModel {
  id: string;
  intervals: Record<ConfidenceMetricKey, ConfidenceInterval>;
}

/** 图下口径：逐字固定文案。 */
export const CONFIDENCE_NOTE =
  '灰色浮动区间 = 95% bootstrap 置信区间（对 60 对重采样 1000 次）；区间重叠时不代表名次确定。';

const MODEL_INDEX: Map<string, ConfidenceModel> = new Map(
  (raw.models as unknown as ConfidenceModel[]).map((model) => [model.id, model]),
);

/** 取某模型某指标的 95% bootstrap 区间；缺失时返回 null（不画 whisker）。 */
export const confidenceFor = (
  modelId: string,
  key: ConfidenceMetricKey,
): ConfidenceInterval | null => {
  const interval = MODEL_INDEX.get(modelId)?.intervals?.[key];
  if (!interval || !Number.isFinite(interval.value)) return null;
  if (!Number.isFinite(interval.lo) || !Number.isFinite(interval.hi)) return null;
  return interval;
};
