<script setup lang="ts">
import { computed, ref } from 'vue';
import type { CompositeDimKey, ModelResult } from '../data/benchmarkData';
import {
  CONFIDENCE_NOTE,
  confidenceFor,
  type ConfidenceInterval,
} from '../data/confidenceData';

type MetricKey = 'composite' | CompositeDimKey;

interface MetricOption {
  key: MetricKey;
  label: string;
}

const METRICS: MetricOption[] = [
  { key: 'composite', label: 'Overall' },
  { key: 'change_top1', label: 'Change detection' },
  { key: 'change_balance', label: 'Change balance' },
  { key: 'relation_type', label: 'Relation type' },
  { key: 'rel_pos', label: 'Spatial position' },
  { key: 'attrs', label: 'Contact & support' },
  { key: 'event_f1', label: 'Event F1' },
  { key: 'state_consistency', label: 'State consistency' },
];

/** Fixed notes shown under the chart; follows the active metric. */
const METRIC_NOTES: Record<MetricKey, string> = {
  composite:
    "Overall = equal-weight average of the 7 dimensions (0-100, missing dimensions excluded). Switch the tabs above to see each dimension's score.",
  change_top1:
    'Change detection: for every object, whether it appeared / disappeared / moved / stayed the same — scored object by object. Read it together with Change balance so a model that always answers "no change" cannot score high.',
  change_balance:
    'Change balance: macro-average F1 over change classes (no change / appeared / displaced / disappeared, equal weight). The closer it is to Change detection, the more evenly the classes are handled.',
  relation_type:
    'Relation type: which of the 11 spatial relations a pair of objects has. The pair must be matched first; only then can the relation type count as correct.',
  rel_pos:
    'Spatial position: on relation pairs whose type is correct, whether front / behind / left / right / above / below is right.',
  attrs:
    'Contact & support: accuracy of the two boolean judgements (contact / mutual support) on relations.',
  event_f1:
    'Event F1: after turning predictions into a structured event stream, the harmonic mean of precision and recall over the two event kinds every model can emit.',
  state_consistency:
    'State consistency: replay predicted changes and relations to rebuild the after-frame state, then measure agreement on presence / type / relations / attributes (type is local-head only and excluded for cloud models).',
};

const props = withDefaults(
  defineProps<{
    models: ModelResult[];
    /** 仅测试用：预置选中的指标（默认综合分）。 */
    initialMetric?: MetricKey;
  }>(),
  { initialMetric: undefined },
);

const activeMetric = ref<MetricKey>(props.initialMetric ?? 'composite');

const metricValue = (model: ModelResult, key: MetricKey): number | null => {
  if (key === 'composite') {
    return model.compositeScore != null && Number.isFinite(model.compositeScore)
      ? model.compositeScore
      : null;
  }
  const dim = model.composite?.dims.find((item) => item.key === key);
  if (!dim || !dim.available || !Number.isFinite(dim.value)) return null;
  return dim.value;
};

const isLocal = (model: ModelResult) => /local/i.test(model.mode) || model.family === 'StarLife';

/** providerColor 缺失时回退到 benchmarkData.ts 的家族色口径（同 var 名）。 */
const FAMILY_FALLBACKS: Record<string, string> = {
  StarLife: 'var(--color-starlife)',
  Anthropic: 'var(--color-anthropic)',
  Zhipu: 'var(--color-zhipu)',
  OpenAI: 'var(--color-openai)',
  Xiaomi: 'var(--color-xiaomi)',
  ByteDance: 'var(--color-bytedance)',
  Google: 'var(--color-gemini)',
  DeepSeek: 'var(--color-deepseek)',
  Qwen: 'var(--color-qwen)',
};

/**
 * 仅用于可读性判断的代表色：优先取 providerColor 里自带的 hex fallback；
 * 没有 hex 时用家族色的浅色主题值估算。深色卡片背景（≈#1b1b1b）对比度 < 3
 * 的家族（数据里的 ByteDance #325ab4 即属此类）柱体提亮 25%，避免糊在背景里。
 */
const FAMILY_CONTRAST_HEX: Record<string, string> = {
  StarLife: '#0284c7',
  Anthropic: '#cc6543',
  Zhipu: '#0d9488',
  OpenAI: '#10a37f',
  Xiaomi: '#f97316',
  ByteDance: '#325ab4',
  Google: '#1a73e8',
  DeepSeek: '#3366ff',
  Qwen: '#615ced',
};

const familyColor = (model: ModelResult): string =>
  model.providerColor?.trim() || FAMILY_FALLBACKS[model.family] || 'var(--color-muted, #8b93a7)';

const hexFromColor = (color: string): string | null => /#([0-9a-fA-F]{6})/.exec(color)?.[0] ?? null;

const relativeLuminance = (hex: string): number => {
  const value = hex.replace('#', '');
  const channels = [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16) / 255);
  const [r, g, b] = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const darkContrast = (hex: string): number => {
  const background = 0.0116; // 深色卡片 #1b1b1b 的相对亮度
  return (relativeLuminance(hex) + 0.05) / (background + 0.05);
};

const readableFill = (model: ModelResult): string => {
  const color = familyColor(model);
  const hex = hexFromColor(color) ?? FAMILY_CONTRAST_HEX[model.family] ?? null;
  if (!hex) return color;
  return darkContrast(hex) < 3 ? `color-mix(in oklab, ${color} 75%, white)` : color;
};

interface BarRow {
  model: ModelResult;
  value: number | null;
  ci: ConfidenceInterval | null;
}

/** 按当前指标从高到低重排；N/A 行排最后（不当作 0 分）。 */
const rows = computed<BarRow[]>(() =>
  props.models
    .map((model) => ({
      model,
      value: metricValue(model, activeMetric.value),
      ci: confidenceFor(model.id, activeMetric.value),
    }))
    .sort((a, b) => {
      if (a.value == null && b.value == null) return 0;
      if (a.value == null) return 1;
      if (b.value == null) return -1;
      return b.value - a.value;
    }),
);

const widthOf = (row: BarRow): number => {
  if (row.value == null) return 100;
  return Math.min(100, Math.max(0, row.value));
};

const valueLabel = (row: BarRow): string => (row.value == null ? 'N/A' : row.value.toFixed(1));

const baseBarOpacity = (row: BarRow): number => {
  if (row.value == null) return 0.2;
  return isLocal(row.model) ? 1 : 0.7;
};

/** 家族图例：按数据里首次出现的顺序（与榜单顺序一致），同家族只列一次。 */
const legendFamilies = computed(() => {
  const map = new Map<string, { name: string; count: number; model: ModelResult }>();
  for (const model of props.models) {
    const entry = map.get(model.family);
    if (entry) {
      entry.count += 1;
    } else {
      map.set(model.family, { name: model.family, count: 1, model });
    }
  }
  return [...map.values()];
});

const activeKey = computed(() => activeMetric.value);

const activeNote = computed(() => METRIC_NOTES[activeMetric.value]);

const fmt1 = (value: number): string => value.toFixed(1);

const ciTitle = (interval: ConfidenceInterval | null): string =>
  interval ? `95% CI ${fmt1(interval.lo)}–${fmt1(interval.hi)}` : '95% CI —';

/** 数值标签后的区间：宽屏 [lo–hi]，窄屏 ±half。 */
const ciFull = (interval: ConfidenceInterval): string =>
  `[${fmt1(interval.lo)}–${fmt1(interval.hi)}]`;

const ciHalf = (interval: ConfidenceInterval): string => {
  const round1 = (value: number) => Number(value.toFixed(1));
  return `±${((round1(interval.hi) - round1(interval.lo)) / 2).toFixed(1)}`;
};

const legendLabel = (entry: { name: string; count: number }): string =>
  entry.count > 1 ? `${entry.name}(×${entry.count})` : entry.name;
</script>

<template>
  <section class="mt-8 border border-border bg-card/40 p-4 sm:p-5">
    <!-- 分段选择器：综合分 + 7 个分维度 -->
    <div
      class="inline-flex max-w-full flex-wrap border border-border bg-background p-0.5"
      role="group"
      aria-label="Select metric"
      data-metric-tabs
    >
      <button
        v-for="metric in METRICS"
        :key="metric.key"
        type="button"
        data-metric-tab
        :data-metric-key="metric.key"
        class="h-6 px-2 text-[11px] transition-colors cursor-pointer"
        :class="
          activeMetric === metric.key
            ? 'bg-foreground text-background'
            : 'text-muted-foreground hover:text-foreground'
        "
        :aria-pressed="activeMetric === metric.key"
        @click="activeMetric = metric.key"
      >
        {{ metric.label }}
      </button>
    </div>

    <!-- 横向条形图：每行一个模型，按当前指标降序 -->
    <div class="bars mt-3" :data-active-metric="activeKey">
      <div class="relative pb-5">
        <!-- 竖向浅灰网格（0/25/50/75/100），只覆盖条形区域 -->
        <div class="chart-grid" aria-hidden="true">
          <span v-for="tick in [0, 25, 50, 75, 100]" :key="`grid-${tick}`" />
        </div>

        <div class="relative space-y-0.5">
          <div
            v-for="row in rows"
            :key="row.model.id"
            data-bar-row
            :data-model-id="row.model.id"
            :data-value="row.value == null ? 'N/A' : row.value.toFixed(1)"
            :title="ciTitle(row.value == null ? null : row.ci)"
            class="bar-row group rounded-[3px] px-0.5 transition-colors hover:bg-accent/40 focus-visible:bg-accent/40"
          >
            <span
              class="bar-label text-muted-foreground group-hover:text-foreground"
              :class="isLocal(row.model) ? 'font-medium text-foreground' : ''"
              :title="row.model.name"
              data-bar-label
            >
              {{ row.model.name }}
            </span>
            <div class="relative h-4 min-w-0">
              <div
                data-bar-fill
                :data-bar-color="row.value == null ? 'var(--muted-foreground)' : readableFill(row.model)"
                :data-bar-opacity="baseBarOpacity(row).toFixed(2)"
                class="bar-fill h-4 rounded-[3px]"
                :class="isLocal(row.model) ? 'bar-local' : ''"
                :style="{
                  width: `${widthOf(row)}%`,
                  '--bar-fill':
                    row.value == null ? 'var(--muted-foreground)' : readableFill(row.model),
                  '--bar-opacity': baseBarOpacity(row).toFixed(2),
                }"
              />
              <!-- 浮动区间画在柱子上层：细灰线 + 两端竖帽 + 柱末端深色点估计竖线 -->
              <div
                v-if="row.value != null && row.ci"
                data-ci-whisker
                :data-ci-value="row.ci.value.toFixed(2)"
                :data-ci-lo="row.ci.lo.toFixed(2)"
                :data-ci-hi="row.ci.hi.toFixed(2)"
                class="ci-layer pointer-events-none absolute inset-0"
                aria-hidden="true"
              >
                <template v-if="row.ci.hi > row.ci.lo">
                  <span
                    data-ci-range
                    class="ci-range absolute top-1/2 h-[1.5px] -translate-y-1/2"
                    :style="{
                      left: `${row.ci.lo.toFixed(2)}%`,
                      width: `${(row.ci.hi - row.ci.lo).toFixed(2)}%`,
                    }"
                  />
                  <span
                    data-ci-cap
                    class="ci-cap absolute top-1/2 h-[6px] w-[1.5px] -translate-y-1/2"
                    :style="{ left: `${row.ci.lo.toFixed(2)}%` }"
                  />
                  <span
                    data-ci-cap
                    class="ci-cap absolute top-1/2 h-[6px] w-[1.5px] -translate-y-1/2"
                    :style="{ left: `${row.ci.hi.toFixed(2)}%` }"
                  />
                </template>
                <span
                  data-ci-point
                  class="ci-point absolute top-1/2 h-[10px] w-[1.5px] -translate-y-1/2"
                  :style="{ left: `${row.ci.value.toFixed(2)}%` }"
                />
              </div>
            </div>
            <span class="value-cell font-mono text-foreground">
              <span
                data-bar-value
                :class="isLocal(row.model) ? 'font-semibold' : ''"
              >{{ valueLabel(row) }}</span>
              <span
                v-if="row.value != null && row.ci"
                data-ci-label
                class="ci-label text-muted-foreground"
              >
                <span data-ci-label-full class="ci-label-full">{{ ciFull(row.ci) }}</span>
                <span data-ci-label-short class="ci-label-short">{{ ciHalf(row.ci) }}</span>
              </span>
            </span>
          </div>
        </div>

        <!-- 底部 0/25/50/75/100 轴标签 -->
        <div class="axis-labels mt-1" aria-hidden="true">
          <span v-for="tick in [0, 25, 50, 75, 100]" :key="`label-${tick}`" data-axis-label>{{ tick }}</span>
        </div>
      </div>
    </div>

    <!-- 家族图例：非交互，仅说明柱子颜色；同家族只列一次 -->
    <div
      data-family-legend
      class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] leading-none text-muted-foreground"
    >
      <span
        v-for="entry in legendFamilies"
        :key="`legend-${entry.name}`"
        data-legend-item
        :data-family="entry.name"
        class="inline-flex items-center gap-1"
      >
        <span
          data-legend-dot
          :data-legend-color="readableFill(entry.model)"
          class="inline-block size-2 shrink-0 rounded-full"
          :style="{ backgroundColor: readableFill(entry.model) }"
          aria-hidden="true"
        />
        <span data-legend-text>{{ legendLabel(entry) }}</span>
      </span>
    </div>

    <p
      data-chart-note
      class="mt-2 min-h-[2.75rem] text-[12px] leading-relaxed text-muted-foreground"
    >
      {{ activeNote }}
    </p>

    <p data-ci-note class="mt-1 text-[11px] leading-relaxed text-muted-foreground">
      {{ CONFIDENCE_NOTE }}
    </p>
  </section>
</template>

<style scoped>
.bars {
  --bar-label-w: 104px;
  --bar-value-w: 86px;
  --bar-gap: 8px;
}

.bar-row {
  display: grid;
  grid-template-columns: var(--bar-label-w) minmax(0, 1fr) var(--bar-value-w);
  align-items: center;
  gap: var(--bar-gap);
  min-height: 26px;
}

.bar-label {
  display: -webkit-box;
  overflow: hidden;
  overflow-wrap: anywhere;
  font-size: 11px;
  line-height: 1.25;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.value-cell {
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 3px;
  font-size: 10px;
  white-space: nowrap;
}

.ci-label {
  font-size: 11px;
  line-height: 1;
  white-space: nowrap;
}

.ci-label-short {
  display: none;
}

.ci-layer {
  opacity: 0.65;
  transition: opacity 150ms ease-out;
}

/* hover 行时 whisker 提升到不透明；默认 65% 让位给柱子。 */
.group:hover .ci-layer {
  opacity: 1;
}

.ci-point {
  background-color: var(--foreground);
  opacity: 0.9;
}

.ci-range,
.ci-cap {
  background-color: var(--foreground);
  opacity: 0.4;
}

.bar-fill {
  background-color: var(--bar-fill);
  opacity: var(--bar-opacity, 1);
  transition:
    width 300ms ease-out,
    opacity 300ms ease-out;
}

/* hover 时该行柱子升到不透明（本地柱本来就是 1）。 */
.group:hover .bar-fill {
  opacity: 1;
}

/* 本地头保留轻微描边，强化“唯一本地”的视觉优先级。 */
.bar-local {
  box-shadow: 0 0 0 1px color-mix(in oklab, var(--bar-fill) 60%, transparent);
}

.chart-grid {
  position: absolute;
  top: 0;
  right: calc(var(--bar-value-w) + var(--bar-gap));
  bottom: 22px;
  left: calc(var(--bar-label-w) + var(--bar-gap));
  display: flex;
  justify-content: space-between;
  pointer-events: none;
}

.chart-grid span {
  border-left: 1px solid var(--border);
  opacity: 0.7;
}

.axis-labels {
  display: flex;
  justify-content: space-between;
  margin-right: calc(var(--bar-value-w) + var(--bar-gap));
  margin-left: calc(var(--bar-label-w) + var(--bar-gap));
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 9px;
  color: var(--muted-foreground);
  opacity: 0.8;
}

@media (min-width: 640px) {
  .bars {
    --bar-label-w: 136px;
    --bar-value-w: 118px;
  }
}

@media (max-width: 639px) {
  .ci-label-full {
    display: none;
  }

  .ci-label-short {
    display: inline;
  }
}
</style>
