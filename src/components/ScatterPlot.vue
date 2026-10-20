<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  NA,
  METRIC_LABELS,
  firstAvailableMetric,
  fmtLatency,
  fmtPct,
  metricValue,
  primaryScore,
  type LeaderboardMeta,
  type MetricKey,
  type ModelResult,
} from '../data/benchmarkData';
import { ChevronDown } from 'lucide-vue-next';

const props = defineProps<{
  models: ModelResult[];
  allModelsCount: number;
  activeMetric: MetricKey | null;
  activeVersion: string;
  versions: string[];
  meta: LeaderboardMeta;
}>();

const emit = defineEmits<{
  (e: 'update:activeMetric', metric: MetricKey): void;
  (e: 'update:activeVersion', version: string): void;
}>();

const hoveredModel = ref<ModelResult | null>(null);
const showConfigsDropdown = ref(false);

// SVG canvas（比例沿用上游 DeepSWE 风格布局）
const svgWidth = 900;
const svgHeight = 563;
const leftX = 75;
const rightX = 770;
const topY = 52;
const bottomY = 510;

/** 唯一保留的运行时指标：延迟（每事件端到端）。 */
const METRIC_ORDER: MetricKey[] = ['latency'];

const metric = computed<MetricKey | null>(() => {
  if (props.activeMetric) return props.activeMetric;
  return firstAvailableMetric(props.models);
});

/** 数据里是否已有综合分：决定 Y 轴口径（综合分优先，旧数据回退事件分）。 */
const hasComposite = computed<boolean>(() =>
  props.models.some((m) => m.compositeScore != null && Number.isFinite(m.compositeScore)),
);

/** Y 轴：主分（综合分优先）按真实数据自适应 nice max（上限 100%）。 */
const scoreDomain = computed(() => {
  const scores = props.models
    .map((m) => primaryScore(m))
    .filter((v): v is number => v != null && Number.isFinite(v));
  if (scores.length === 0) return { max: 100, ticks: [0, 20, 40, 60, 80, 100] };
  const dataMax = Math.max(...scores);
  const padded = Math.min(100, Math.max(5, dataMax * 1.06 + 0.5));
  for (const step of [5, 10, 20, 25, 50]) {
    const max = Math.ceil(padded / step) * step;
    if (max <= 100 && max / step <= 8) {
      const ticks: number[] = [];
      for (let value = 0; value <= max + 1e-9; value += step) ticks.push(value);
      return { max, ticks };
    }
  }
  return { max: 100, ticks: [0, 20, 40, 60, 80, 100] };
});

const scaleY = (score: number) => {
  const clamped = Math.max(0, Math.min(scoreDomain.value.max, score));
  return bottomY - (clamped / scoreDomain.value.max) * (bottomY - topY);
};

/** X 轴：按真实数据自适应 nice max，0 在右、大值在左（反向轴）。 */
const niceMax = (dataMax: number): number => {
  if (!(dataMax > 0)) return 1;
  const exponent = Math.floor(Math.log10(dataMax));
  const base = Math.pow(10, exponent);
  const normalized = dataMax / base;
  const nice =
    normalized <= 1
      ? 1
      : normalized <= 1.5
        ? 1.5
        : normalized <= 2
          ? 2
          : normalized <= 2.5
            ? 2.5
            : normalized <= 3
              ? 3
              : normalized <= 4
                ? 4
                : normalized <= 5
                  ? 5
                  : normalized <= 6
                    ? 6
                    : normalized <= 8
                      ? 8
                      : 10;
  return nice * base;
};

const xAxis = computed(() => {
  const current = metric.value;
  if (!current) return null;
  const values = props.models
    .map((m) => metricValue(m, current))
    .filter((v): v is number => v != null && Number.isFinite(v));
  const dataMax = values.length > 0 ? Math.max(...values) : 0;
  const max = niceMax(dataMax);
  const format = (v: number) => `${Math.round(v)}ms`;
  const label = `Avg ${METRIC_LABELS[current].toLowerCase()} per event (end-to-end)`;
  if (dataMax === 0) {
    return {
      max,
      label,
      format,
      position: () => rightX,
      ticks: [{ value: 0, label: format(0), x: rightX }],
    };
  }
  const position = (v: number) => rightX - (Math.max(0, Math.min(max, v)) / max) * (rightX - leftX);
  // 4 等分刻度，大数（如 50000ms）也能落在整数上，0 在右。
  const ticks = Array.from({ length: 5 }, (_, i) => {
    const value = (max * i) / 4;
    return { value, label: format(value), x: position(value) };
  });
  return { max, label, format, position, ticks };
});

/** 跳过主分或当前 X 维度为 null 的模型（缺测 -> 不画点）。 */
const plotted = computed(() => {
  const current = metric.value;
  const axis = xAxis.value;
  if (!current || !axis) return [];
  const points: Array<{ model: ModelResult; x: number; y: number }> = [];
  for (const model of props.models) {
    const score = primaryScore(model);
    if (score == null || !Number.isFinite(score)) continue;
    const value = metricValue(model, current);
    if (value == null || !Number.isFinite(value)) continue;
    points.push({ model, x: axis.position(value), y: scaleY(score) });
  }
  return points;
});

const modelFamilies = computed(() => {
  const families: Record<string, { color: string; points: Array<{ x: number; y: number }> }> = {};
  for (const point of plotted.value) {
    const family = point.model.family;
    if (!families[family]) {
      families[family] = { color: point.model.providerColor, points: [] };
    }
    families[family].points.push({ x: point.x, y: point.y });
  }
  return Object.entries(families).map(([name, data]) => {
    const sorted = [...data.points].sort((a, b) => b.x - a.x);
    const pathD = sorted.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    return { name, color: data.color, points: sorted, pathD };
  });
});

const labelFor = (point: { x: number; y: number }) => {
  let anchor: 'middle' | 'start' | 'end' = 'middle';
  let tx = point.x;
  let ty = point.y - 10;
  if (point.x > 710) {
    anchor = 'end';
    tx = point.x - 8;
  } else if (point.x < 120) {
    anchor = 'start';
    tx = point.x + 8;
  }
  // 贴近顶部时把标签放到点下方，避免溢出画布
  if (ty < topY + 14) ty = point.y + 18;
  return { tx, ty, subTy: ty + 10, anchor };
};

/** 中性写法：local-heads vs zero-shot。 */
const modeLabel = (mode: string): string => {
  const normalized = mode.toLowerCase();
  return normalized === 'local-heads' || normalized === 'zero-shot' ? normalized : normalized || '—';
};

const metaLabel = computed(() => {
  const parts: string[] = [];
  if (props.meta.nPairs != null) parts.push(`${props.meta.nPairs} pairs`);
  if (props.meta.split) parts.push(props.meta.split);
  if (props.meta.dataset) parts.push(props.meta.dataset);
  return parts.length > 0 ? parts.join(' · ') : '尚无评测结果';
});
</script>

<template>
  <div class="mb-10">
    <!-- 顶部控制行 -->
    <div class="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <div class="flex items-center gap-2.5">
        <!-- 版本切换：只有数据里真的存在多个版本时才显示 -->
        <div
          v-if="versions.length > 1"
          class="inline-flex h-7 items-center border border-border text-xs"
        >
          <button
            v-for="(version, index) in versions"
            :key="version"
            type="button"
            @click="emit('update:activeVersion', version)"
            :aria-pressed="activeVersion === version"
            :class="[
              'inline-flex h-full items-center justify-center px-2.5 outline-none transition-colors cursor-pointer',
              index > 0 ? 'border-l border-border' : '',
              activeVersion === version
                ? 'bg-foreground text-background font-medium'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            ]"
          >
            {{ version }}
          </button>
        </div>

        <!-- X 轴维度：只有延迟一个运行时指标 -->
        <div class="inline-flex h-7 items-center border border-border text-xs">
          <button
            v-for="(key, index) in METRIC_ORDER"
            :key="key"
            type="button"
            :aria-pressed="metric === key"
            :title="`Plot against ${METRIC_LABELS[key].toLowerCase()}`"
            @click="emit('update:activeMetric', key)"
            :class="[
              'inline-flex h-full items-center justify-center px-2.5 outline-none transition-colors cursor-pointer',
              index > 0 ? 'border-l border-border' : '',
              metric === key
                ? 'bg-foreground text-background font-medium'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            ]"
          >
            {{ METRIC_LABELS[key] }}
          </button>
        </div>
      </div>

      <div class="ml-auto flex items-center gap-3">
        <span class="text-[12px] text-muted-foreground tabular-nums">
          <span class="text-foreground">{{ metaLabel }}</span>
          <template v-if="meta.generatedAt">
            <span> · generated <span class="text-foreground">{{ meta.generatedAt.slice(0, 10) }}</span></span>
          </template>
          <span> · </span>
          <a href="#methodology" class="underline underline-offset-4 decoration-foreground/30 hover:decoration-foreground hover:text-foreground transition-colors">
            methodology
          </a>
        </span>

        <div class="relative">
          <button
            type="button"
            @click="showConfigsDropdown = !showConfigsDropdown"
            class="inline-flex items-center justify-center whitespace-nowrap font-medium transition-all border border-border bg-background hover:bg-accent hover:text-foreground h-7 gap-1.5 px-2.5 text-xs cursor-pointer"
          >
            <span>Configs</span>
            <span class="tabular-nums text-muted-foreground">({{ plotted.length }}/{{ allModelsCount }})</span>
            <ChevronDown class="size-3.5 transition-transform" />
          </button>

          <div
            v-if="showConfigsDropdown"
            class="absolute right-0 top-8 z-30 w-56 border border-border bg-popover p-3 shadow-md text-xs font-mono"
          >
            <div class="font-semibold text-foreground mb-2">Display Configurations</div>
            <div class="space-y-1.5 text-muted-foreground">
              <div class="flex items-center justify-between">
                <span>Plotted points:</span>
                <span class="text-foreground font-semibold">{{ plotted.length }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span>Y axis:</span>
                <span class="text-foreground uppercase">{{ hasComposite ? 'composite' : 'event-f1' }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span>X metric:</span>
                <span class="text-foreground uppercase">{{ metric ?? 'none' }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span>Sample seed:</span>
                <span class="text-foreground">{{ meta.sampleSeed ?? NA }}</span>
              </div>
              <div class="pt-2 border-t border-border/50 text-[11px]">
                Models with a null composite score or a null latency are not plotted.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 图表 -->
    <div class="border border-border bg-card p-2 sm:p-3 relative overflow-hidden">
      <div class="w-full">
        <svg
          :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
          width="100%"
          role="img"
          :aria-label="`${hasComposite ? 'Composite score' : 'Event-level macro-F1'} versus ${xAxis?.label ?? 'latency'}`"
          style="display: block;"
          class="select-none"
        >
          <text :x="leftX" y="26" text-anchor="start" font-size="14" font-weight="600" class="fill-foreground font-sans">
            {{ hasComposite ? 'Composite score' : 'Event-level macro-F1' }} (%)
          </text>

          <text v-if="xAxis" :x="rightX" y="30" text-anchor="end" font-size="11" font-style="italic" class="fill-muted-foreground">
            most efficient ↗
          </text>

          <!-- X 轴网格 -->
          <g v-if="xAxis">
            <g v-for="tick in xAxis.ticks" :key="`x-${tick.label}-${tick.x}`">
              <line :x1="tick.x" :x2="tick.x" :y1="topY" :y2="bottomY" stroke="var(--muted-foreground)" opacity="0.25" />
              <text :x="tick.x" y="529" text-anchor="middle" font-size="12" class="fill-muted-foreground font-mono">
                {{ tick.label }}
              </text>
            </g>
          </g>

          <!-- Y 轴网格（按数据自适应） -->
          <g v-for="tick in scoreDomain.ticks" :key="`y-${tick}`">
            <line :x1="leftX" :x2="rightX" :y1="scaleY(tick)" :y2="scaleY(tick)" stroke="var(--muted-foreground)" opacity="0.25" />
            <text
              :x="leftX - 10"
              :y="scaleY(tick) + 4"
              text-anchor="end"
              font-size="12"
              class="fill-muted-foreground font-mono tabular-nums"
            >
              {{ tick }}%
            </text>
          </g>

          <!-- X 轴标题 -->
          <text
            v-if="xAxis"
            :x="(leftX + rightX) / 2"
            y="549"
            text-anchor="middle"
            font-size="13"
            class="fill-foreground font-sans font-medium"
          >
            {{ xAxis.label }}
          </text>

          <!-- family 折线（同 family 内 >1 点才连） -->
          <g v-for="fam in modelFamilies" :key="`curve-${fam.name}`">
            <template v-if="fam.points.length > 1">
              <path :d="fam.pathD" fill="none" stroke="transparent" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" class="cursor-pointer" />
              <path
                :d="fam.pathD"
                fill="none"
                :stroke="fam.color"
                stroke-width="2.2"
                stroke-linecap="round"
                stroke-linejoin="round"
                opacity="0.75"
                style="transition: opacity 150ms ease;"
              />
            </template>
          </g>

          <!-- 数据点 + 标签 -->
          <g
            v-for="point in plotted"
            :key="point.model.id"
            class="cursor-pointer"
            @mouseenter="hoveredModel = point.model"
            @mouseleave="hoveredModel = null"
          >
            <circle :cx="point.x" :cy="point.y" r="14" fill="transparent" />
            <circle
              :cx="point.x"
              :cy="point.y"
              :r="hoveredModel?.id === point.model.id ? 5.5 : point.model.isBest ? 4.5 : 3.5"
              :fill="point.model.providerColor"
              stroke="var(--background)"
              stroke-width="1.5"
            />
            <text
              :x="labelFor(point).tx"
              :y="labelFor(point).ty"
              :text-anchor="labelFor(point).anchor"
              font-size="11.5"
              font-weight="600"
              :fill="point.model.providerColor"
              style="paint-order: stroke; stroke: var(--background); stroke-width: 3.5px; stroke-linejoin: round;"
            >
              {{ point.model.name }}
            </text>
            <text
              :x="labelFor(point).tx"
              :y="labelFor(point).subTy"
              :text-anchor="labelFor(point).anchor"
              font-size="8.8"
              font-weight="400"
              :fill="point.model.providerColor"
              opacity="0.7"
              style="font-family: var(--font-mono); letter-spacing: 0.08em; paint-order: stroke; stroke: var(--background); stroke-width: 2.8px; stroke-linejoin: round;"
            >
              {{ modeLabel(point.model.mode) }}
            </text>
          </g>

          <!-- 空态 / 无可绘点 -->
          <text
            v-if="plotted.length === 0"
            :x="(leftX + rightX) / 2"
            :y="(topY + bottomY) / 2"
            text-anchor="middle"
            font-size="13"
            class="fill-muted-foreground font-sans"
          >
            尚无可用数据点（该维度无实测值，或 leaderboard.generated.json 尚未生成）
          </text>
        </svg>
      </div>

      <!-- Hover tooltip：null 一律渲染 N/A -->
      <div
        v-if="hoveredModel"
        class="absolute top-4 right-4 border border-border bg-card p-3 shadow-lg pointer-events-none text-xs font-mono max-w-xs transition-opacity duration-150 z-20"
        :style="{ borderColor: hoveredModel.providerColor }"
      >
        <div class="font-semibold text-foreground flex items-center justify-between gap-4">
          <span>{{ hoveredModel.name }}</span>
          <span class="text-[10px] px-1 py-0.5 bg-secondary text-secondary-foreground">
            [{{ modeLabel(hoveredModel.mode) }}]
          </span>
        </div>
        <div class="mt-1 text-muted-foreground">Provider: {{ hoveredModel.provider }}</div>
        <div class="mt-2 pt-2 border-t border-border/50 grid grid-cols-2 gap-x-4 gap-y-1">
          <div class="col-span-2">
            Composite: <span class="text-foreground font-semibold">{{ fmtPct(primaryScore(hoveredModel)) }}</span>
            <span v-if="hoveredModel.composite" class="text-muted-foreground text-[10px]">
              ({{ hoveredModel.composite.available }}/{{ hoveredModel.composite.total }} dims · equal weight)
            </span>
          </div>
          <div>Event macro-F1: <span class="text-foreground font-semibold">{{ fmtPct(hoveredModel.score) }}</span></div>
          <div>Topology F1: <span class="text-foreground">{{ fmtPct(hoveredModel.topologyF1) }}</span></div>
          <div>Affordance: <span class="text-foreground">{{ fmtPct(hoveredModel.affordanceAcc) }}</span></div>
          <div>State dyn.: <span class="text-foreground">{{ fmtPct(hoveredModel.stateTransitionAcc) }}</span></div>
          <div class="col-span-2">
            Latency: <span class="text-foreground">{{ fmtLatency(hoveredModel.latency) }}</span>
            <span class="text-muted-foreground text-[10px]">/ event end-to-end</span>
          </div>
        </div>
      </div>
    </div>

    <p class="mt-2 text-[12px] leading-relaxed text-muted-foreground">
      Y = {{ hasComposite ? '7-dimension equal-weight composite score' : '100 × event-level macro-F1 (legacy data)' }}.
      X = per-event end-to-end latency (feature extraction + API round trip; cloud latency also depends on
      network and output length). Axis uses only measured values (nice max, reversed); models with a missing
      composite score or a missing latency are not plotted.
    </p>
  </div>
</template>
