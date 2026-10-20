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

const legendLabel = (entry: { name: string; count: number }): string =>
  entry.count > 1 ? `${entry.name}(×${entry.count})` : entry.name;
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
            </div>
            <span
              data-bar-value
              class="value-cell font-mono text-foreground"
              :class="isLocal(row.model) ? 'font-semibold' : ''"
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
    --bar-value-w: 44px;
  }
}
</style>
