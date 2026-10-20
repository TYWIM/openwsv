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

/** Fixed note shown under the chart. */
export const CONFIDENCE_NOTE =
  'Grey floating range = 95% bootstrap confidence interval (1,000 resamples of the 60 pairs). Overlapping intervals do not establish a rank difference.';

/** English labels for the backend metricLabels (Chinese keys never reach the UI). */
const EN_METRIC_LABELS: Record<ConfidenceMetricKey, string> = {
  composite: 'Overall',
  change_top1: 'Change detection',
  change_balance: 'Change balance',
  relation_type: 'Relation type',
  rel_pos: 'Spatial position',
  attrs: 'Contact & support',
  event_f1: 'Event F1',
  state_consistency: 'State consistency',
};

export const confidenceMetricLabel = (key: ConfidenceMetricKey): string =>
  EN_METRIC_LABELS[key];

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
