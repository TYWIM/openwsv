<script setup lang="ts">
import { computed, ref } from 'vue';
import type { CompositeDimKey, ModelResult } from '../data/benchmarkData';

type MetricKey = 'composite' | CompositeDimKey;

interface MetricOption {
  key: MetricKey;
  label: string;
}

const METRICS: MetricOption[] = [
  { key: 'composite', label: '综合分' },
  { key: 'change_top1', label: '变化识别' },
  { key: 'change_balance', label: '变化平衡' },
  { key: 'relation_type', label: '关系类型' },
  { key: 'rel_pos', label: '空间方位' },
  { key: 'attrs', label: '接触支撑' },
  { key: 'event_f1', label: '事件F1' },
  { key: 'state_consistency', label: '状态一致性' },
];

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

interface BarRow {
  model: ModelResult;
  value: number | null;
}

/** 按当前指标从高到低重排；N/A 行排最后（不当作 0 分）。 */
const rows = computed<BarRow[]>(() =>
  props.models
    .map((model) => ({ model, value: metricValue(model, activeMetric.value) }))
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

const rowFillClass = (row: BarRow): string => {
  if (row.value == null) return 'opacity-20 group-hover:opacity-35';
  return isLocal(row.model) ? 'opacity-100' : 'opacity-[0.55] group-hover:opacity-100';
};

const activeKey = computed(() => activeMetric.value);
</script>

<template>
  <section class="mt-8 border border-border bg-card/40 p-4 sm:p-5">
    <!-- 分段选择器：综合分 + 7 个分维度 -->
    <div
      class="inline-flex max-w-full flex-wrap border border-border bg-background p-0.5"
      role="group"
      aria-label="选择指标"
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
                class="h-4 rounded-[3px] transition-[width] duration-300 ease-out"
                :class="rowFillClass(row)"
                :style="{
                  width: `${widthOf(row)}%`,
                  backgroundColor:
                    row.value == null
                      ? 'var(--muted-foreground)'
                      : isLocal(row.model)
                        ? 'var(--color-starlife)'
                        : '#64748b',
                }"
              />
            </div>
            <span
              data-bar-value
              class="value-cell font-mono"
              :class="isLocal(row.model) ? 'font-semibold text-foreground' : 'text-muted-foreground'"
            >
              {{ valueLabel(row) }}
            </span>
          </div>
        </div>

        <!-- 底部 0/25/50/75/100 轴标签 -->
        <div class="axis-labels mt-1" aria-hidden="true">
          <span v-for="tick in [0, 25, 50, 75, 100]" :key="`label-${tick}`" data-axis-label>{{ tick }}</span>
        </div>
      </div>
    </div>

    <p data-chart-note class="mt-2 text-[11px] leading-relaxed text-muted-foreground">
      综合分 = 7 项等权平均（0-100，缺项剔除）；切换上方指标可看各维度单项分数。
    </p>
  </section>
</template>

<style scoped>
.bars {
  --bar-label-w: 104px;
  --bar-value-w: 40px;
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
  font-size: 10px;
  text-align: right;
  white-space: nowrap;
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
    --bar-value-w: 44px;
  }
}
</style>
