<script setup lang="ts">
import { computed, ref } from 'vue';
import type { LeaderboardMeta, ModelResult } from '../data/benchmarkData';
import { fmtPct } from '../data/benchmarkData';
import {
  DIFFICULTY_BUCKETS,
  DIFFICULTY_DIMS,
  DIFFICULTY_NOTE,
  difficultyFor,
  type DifficultyPoint,
} from '../data/difficultyData';

const props = withDefaults(
  defineProps<{
    models: ModelResult[];
    meta?: LeaderboardMeta | null;
    /** 仅测试用：预置选中的模型，便于 SSR 验证 tooltip 内容。 */
    initialActiveId?: string;
    /** 仅测试用：预置悬停的档位下标（0–3）。 */
    initialBucket?: number;
    /** 仅测试用：预置家族筛选。 */
    initialFamilies?: string[];
    /** 仅测试用：预置只看 Top 6。 */
    initialTopOnly?: boolean;
    /** 仅测试用：预置被隐藏的模型 id。 */
    initialHiddenIds?: string[];
  }>(),
  {
    meta: null,
    initialActiveId: undefined,
    initialBucket: undefined,
    initialFamilies: undefined,
    initialTopOnly: false,
    initialHiddenIds: () => [],
  },
);

const VB_W = 800;
const VB_H = 420;
const PAD = { top: 18, right: 24, bottom: 46, left: 46 };
const PLOT_W = VB_W - PAD.left - PAD.right;
const PLOT_H = VB_H - PAD.top - PAD.bottom;
/** Y 轴只画 60–100；<60 的点钳制在 60 底线上并用 ▼ 标记（tooltip 仍显示真实值）。 */
const Y_MIN = 60;
const Y_MAX = 100;
/** X 轴真实档位反序：左 = 档 4（最难），右 = 档 1（最易）。 */
const DISPLAY_BUCKETS = [...DIFFICULTY_BUCKETS].reverse();
const xFor = (index: number) => PAD.left + (PLOT_W * index) / (DISPLAY_BUCKETS.length - 1);
const pointY = (value: number) => {
  const clamped = Math.min(Y_MAX, Math.max(Y_MIN, value));
  return PAD.top + (1 - (clamped - Y_MIN) / (Y_MAX - Y_MIN)) * PLOT_H;
};
const GRID_LINES = [60, 70, 80, 90, 100];

// ------------------------------------------------------------------ 交互状态

const selectedFamilies = ref<string[]>(
  props.initialFamilies
    ? [...props.initialFamilies]
    : [...new Set(props.models.map((model) => model.family))],
);
const topOnly = ref(props.initialTopOnly);
const hiddenIds = ref<string[]>([...(props.initialHiddenIds ?? [])]);
const activeId = ref<string | null>(props.initialActiveId ?? null);
const hoverBucket = ref<number | null>(props.initialBucket ?? null);

const isLocal = (model: ModelResult) => /local/i.test(model.mode) || model.family === 'StarLife';
const modeBadge = (model: ModelResult) => (isLocal(model) ? 'L' : 'Z');

const scoredModels = computed(() =>
  props.models.filter((model) => model.compositeScore != null),
);

const scoreOf = (model: ModelResult): number => model.compositeScore ?? 0;

/** 综合分排名（只统计有综合分的模型），下标从 1 开始。 */
const rankMap = computed(() => {
  const sorted = [...scoredModels.value].sort((a, b) => scoreOf(b) - scoreOf(a));
  const map = new Map<string, number>();
  sorted.forEach((model, index) => map.set(model.id, index + 1));
  return map;
});

const familyCount = (family: string) =>
  scoredModels.value.filter((model) => model.family === family).length;

/** 只显示本批数据里出现过的家族，顺序按该家族最高综合分降序。 */
const allFamilies = computed(() => {
  const best = new Map<string, number>();
  for (const model of scoredModels.value) {
    const score = scoreOf(model);
    if (!best.has(model.family) || score > (best.get(model.family) ?? -Infinity)) {
      best.set(model.family, score);
    }
  }
  return Array.from(best.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([family]) => family);
});

const familySelected = (family: string) => selectedFamilies.value.includes(family);

const toggleFamily = (family: string) => {
  selectedFamilies.value = familySelected(family)
    ? selectedFamilies.value.filter((item) => item !== family)
    : [...selectedFamilies.value, family];
};

const toggleTop = () => {
  topOnly.value = !topOnly.value;
};

const toggleModel = (id: string) => {
  hiddenIds.value = hiddenIds.value.includes(id)
    ? hiddenIds.value.filter((item) => item !== id)
    : [...hiddenIds.value, id];
};

const familyFiltered = computed(() =>
  [...scoredModels.value]
    .filter((model) => selectedFamilies.value.includes(model.family))
    .sort((a, b) => scoreOf(b) - scoreOf(a)),
);

const chartModels = computed(() => {
  const base = topOnly.value ? familyFiltered.value.slice(0, 6) : familyFiltered.value;
  return base.filter((model) => !hiddenIds.value.includes(model.id));
});

/** 绘制顺序：先零样本，后本地头，最后是当前选中的模型；本地头始终最上层。 */
const drawOrder = computed(() => {
  const order = (model: ModelResult) => {
    let key = 0;
    if (isLocal(model)) key += 2;
    if (model.id === activeId.value) key += 1;
    return key;
  };
  return [...chartModels.value].sort((a, b) => order(a) - order(b));
});

const legendModels = computed(() =>
  [...scoredModels.value].sort((a, b) => scoreOf(b) - scoreOf(a)),
);

const rankingModels = computed(() =>
  [...chartModels.value].sort(
    (a, b) => (rankMap.value.get(a.id) ?? 99) - (rankMap.value.get(b.id) ?? 99),
  ),
);

/** 同家族多模型时，色系相同、明度递进；首条用家族主色。 */
const indexInFamily = computed(() => {
  const seen = new Map<string, number>();
  const map = new Map<string, number>();
  for (const model of scoredModels.value) {
    const index = seen.get(model.family) ?? 0;
    map.set(model.id, index);
    seen.set(model.family, index + 1);
  }
  return map;
});

const colorFor = (model: ModelResult): string => {
  const base = model.providerColor || 'var(--color-muted, #8b93a7)';
  const index = indexInFamily.value.get(model.id) ?? 0;
  if (index === 0) return base;
  const percent = Math.max(45, 100 - index * 22);
  return `color-mix(in srgb, ${base} ${percent}%, white)`;
};

// ------------------------------------------------------------------ 曲线数据

interface CurvePoint {
  x: number;
  y: number;
  bucketIndex: number;
  clamped: boolean;
  point: DifficultyPoint;
}

interface ChartLine {
  model: ModelResult;
  color: string;
  path: string | null;
  points: CurvePoint[];
}

const curvePoints = (model: ModelResult): CurvePoint[] => {
  const curve = difficultyFor(model.id);
  if (!curve) return [];
  const byBucket = new Map(curve.points.map((point) => [point.bucket, point]));
  return DISPLAY_BUCKETS.map((bucket, index) => {
    const point = byBucket.get(bucket.key);
    if (!point || point.composite == null) return null;
    return {
      x: xFor(index),
      y: pointY(point.composite),
      bucketIndex: index,
      clamped: point.composite < Y_MIN,
      point,
    };
  }).filter((point): point is CurvePoint => point !== null);
};

/** 低于 Y 下界的点画 ▼：底边在钳制线上方 7px，尖端指向下界。 */
const trianglePath = (point: CurvePoint) =>
  `M ${(point.x - 3.8).toFixed(2)} ${(point.y - 7).toFixed(2)} ` +
  `L ${(point.x + 3.8).toFixed(2)} ${(point.y - 7).toFixed(2)} ` +
  `L ${point.x.toFixed(2)} ${(point.y + 1.5).toFixed(2)} Z`;

const lines = computed<ChartLine[]>(() =>
  drawOrder.value.map((model) => {
    const points = curvePoints(model);
    const path = points.length
      ? points
          .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
          .join(' ')
      : null;
    return { model, color: colorFor(model), path, points };
  }),
);

const lineOpacity = (model: ModelResult): number => {
  if (!activeId.value) return isLocal(model) ? 1 : 0.8;
  return model.id === activeId.value ? 1 : 0.15;
};

const lineWidth = (model: ModelResult): number => (isLocal(model) ? 3 : 1.5);

// -------------------------------------------------------------------- tooltip

const activeModel = computed(
  () => chartModels.value.find((model) => model.id === activeId.value) ?? null,
);

const activePoint = computed(() => {
  const model = activeModel.value;
  const index = hoverBucket.value;
  if (!model || index == null) return null;
  const bucket = DISPLAY_BUCKETS[index];
  if (!bucket) return null;
  const point = difficultyFor(model.id)?.points.find((item) => item.bucket === bucket.key);
  if (!point || point.composite == null) return null;
  return {
    model,
    bucket,
    point,
    displayIndex: index,
    clamped: point.composite < Y_MIN,
    x: xFor(index),
    y: pointY(point.composite),
  };
});

const tooltip = computed(() => {
  const active = activePoint.value;
  if (!active) return null;
  const label = active.bucket.label;
  const left = (active.x / VB_W) * 100;
  const top = Math.min(88, Math.max(4, (active.y / VB_H) * 100));
  const horizontal =
    active.displayIndex === 0
      ? '-6%'
      : active.displayIndex === DISPLAY_BUCKETS.length - 1
        ? '-94%'
        : '-50%';
  // 点靠下（含 60 底线上的 ▼）时 tooltip 放到点上方，避免压住图下口径说明。
  const vertical = active.y < VB_H * 0.48 ? '8px' : '-100%';
  const transform = `translate(${horizontal}, ${vertical})`;
  const scoreText = active.clamped
    ? `${active.point.composite.toFixed(1)}（低于坐标下界）`
    : fmtPct(active.point.composite);
  return {
    ...active,
    label,
    scoreText,
    left: `${left}%`,
    top: `${top}%`,
    transform,
  };
});

const handleChartMove = (event: MouseEvent) => {
  const target = event.currentTarget as SVGElement | null;
  if (!target) return;
  const rect = target.getBoundingClientRect();
  if (!rect.width) return;
  const x = ((event.clientX - rect.left) / rect.width) * VB_W;
  const raw = ((x - PAD.left) / PLOT_W) * (DISPLAY_BUCKETS.length - 1);
  hoverBucket.value = Math.min(
    DISPLAY_BUCKETS.length - 1,
    Math.max(0, Math.round(raw)),
  );
};

const setActive = (model: ModelResult, bucket?: number) => {
  activeId.value = model.id;
  if (bucket != null) hoverBucket.value = bucket;
};

const clearHover = () => {
  activeId.value = null;
  hoverBucket.value = null;
};

const focusLine = (model: ModelResult) => {
  setActive(model);
  if (hoverBucket.value == null) hoverBucket.value = 0;
};
</script>

<template>
  <section class="mt-8 border border-border bg-card/40 p-4 sm:p-5">
    <!-- 顶部工具条：家族筛选 + Top 6 / 全部 -->
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-1.5">
          <span class="mr-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Family
          </span>
          <button
            v-for="family in allFamilies"
            :key="family"
            type="button"
            data-family-chip
            class="inline-flex h-6 items-center gap-1 border px-2 text-[11px] transition-colors cursor-pointer"
            :class="
              familySelected(family)
                ? 'border-foreground/40 bg-foreground/5 text-foreground'
                : 'border-border bg-background text-muted-foreground hover:text-foreground'
            "
            :aria-pressed="familySelected(family)"
            :disabled="familyCount(family) === 0"
            :title="`${family} · ${familyCount(family)} 个模型`"
            @click="toggleFamily(family)"
          >
            <span>{{ family }}</span>
            <span
              class="font-mono text-[9px]"
              :class="familySelected(family) ? 'text-muted-foreground' : 'text-muted-foreground/60'"
            >
              {{ familyCount(family) }}
            </span>
          </button>
        </div>
      </div>
      <div class="flex shrink-0 items-center gap-2">
        <div class="inline-flex border border-border bg-background p-0.5" role="group" aria-label="显示范围">
          <button
            type="button"
            class="h-6 px-2 text-[11px] transition-colors cursor-pointer"
            :class="topOnly ? 'bg-foreground text-background' : 'text-muted-foreground'"
            :aria-pressed="topOnly"
            @click="toggleTop"
          >
            只看 Top 6
          </button>
          <button
            type="button"
            class="h-6 px-2 text-[11px] transition-colors cursor-pointer"
            :class="!topOnly ? 'bg-foreground text-background' : 'text-muted-foreground'"
            :aria-pressed="!topOnly"
            @click="toggleTop"
          >
            全部
          </button>
        </div>
      </div>
    </div>
    <p class="mt-2 text-[11px] leading-relaxed text-muted-foreground">
      按场景复杂度看趋势：横轴从档 1 到档 4 逐档变难，同一档上越高越好。未给出综合分的模型不进图（表格中显示为 N/A）。
    </p>

    <!-- 主体：趋势图 + 右侧综合分排名 -->
    <div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_224px]">
      <div class="min-w-0">
        <div class="relative">
          <svg
            :viewBox="`0 0 ${VB_W} ${VB_H}`"
            class="block h-auto w-full select-none"
            role="img"
            aria-label="分档综合分趋势图"
            @mousemove="handleChartMove"
            @mouseleave="clearHover"
          >
            <!-- 横向网格 + Y 轴刻度 -->
            <g aria-hidden="true">
              <line
                v-for="tick in GRID_LINES"
                :key="`grid-${tick}`"
                :x1="PAD.left"
                :x2="VB_W - PAD.right"
                :y1="pointY(tick)"
                :y2="pointY(tick)"
                stroke="var(--border)"
                :stroke-dasharray="tick === 0 ? 'none' : '2 4'"
                stroke-width="1"
              />
              <text
                v-for="tick in GRID_LINES"
                :key="`tick-${tick}`"
                :x="PAD.left - 8"
                :y="pointY(tick) + 3"
                data-y-tick
                text-anchor="end"
                class="fill-muted-foreground font-mono"
                font-size="9"
              >
                {{ tick }}
              </text>
              <text
                :x="12"
                :y="PAD.top + PLOT_H / 2"
                :transform="`rotate(-90 12 ${PAD.top + PLOT_H / 2})`"
                text-anchor="middle"
                class="fill-muted-foreground"
                font-size="9"
              >
                分档综合分
              </text>
            </g>

            <!-- 难度档竖线 + X 轴档位标签 / 每档 n -->
            <g aria-hidden="true">
              <line
                v-for="(bucket, index) in DISPLAY_BUCKETS"
                :key="`axis-${bucket.key}`"
                :x1="xFor(index)"
                :x2="xFor(index)"
                :y1="PAD.top"
                :y2="PAD.top + PLOT_H"
                stroke="var(--border)"
                stroke-width="1"
              />
              <text
                v-for="(bucket, index) in DISPLAY_BUCKETS"
                :key="`bucket-label-${bucket.key}`"
                data-bucket-label
                :x="xFor(index)"
                :y="VB_H - 24"
                text-anchor="middle"
                class="fill-muted-foreground font-mono"
                font-size="10"
              >
                {{ bucket.label }}
              </text>
              <text
                v-for="(bucket, index) in DISPLAY_BUCKETS"
                :key="`bucket-n-${bucket.key}`"
                data-bucket-n
                :x="xFor(index)"
                :y="VB_H - 8"
                text-anchor="middle"
                class="fill-muted-foreground"
                font-size="9"
              >
                n={{ bucket.n }}
              </text>
            </g>

            <!-- 悬停档位竖线 -->
            <line
              v-if="hoverBucket != null"
              :x1="xFor(hoverBucket)"
              :x2="xFor(hoverBucket)"
              :y1="PAD.top"
              :y2="PAD.top + PLOT_H"
              stroke="var(--muted-foreground)"
              stroke-width="1"
              stroke-dasharray="3 3"
              aria-hidden="true"
            />

            <!-- 每个模型一条折线（本地头加粗且最后绘制，始终最上层） -->
            <g
              v-for="line in lines"
              :key="line.model.id"
              data-chart-line
              :data-model-id="line.model.id"
              class="outline-none"
              tabindex="0"
              role="img"
              :aria-label="`${line.model.name}，分档综合分趋势`"
              @mouseenter="setActive(line.model)"
              @focus="focusLine(line.model)"
              @blur="activeId = null"
            >
              <path
                v-if="line.path"
                :d="line.path"
                fill="none"
                :stroke="line.color"
                :stroke-width="lineWidth(line.model)"
                :stroke-opacity="lineOpacity(line.model)"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <template v-for="point in line.points" :key="`${line.model.id}-p-${point.bucketIndex}`">
                <circle
                  v-if="!point.clamped"
                  data-chart-point
                  :cx="point.x"
                  :cy="point.y"
                  :r="isLocal(line.model) ? 3.2 : 2.4"
                  :fill="isLocal(line.model) ? line.color : 'var(--background)'"
                  :fill-opacity="isLocal(line.model) ? lineOpacity(line.model) : 1"
                  :stroke="line.color"
                  :stroke-opacity="lineOpacity(line.model)"
                  :stroke-width="isLocal(line.model) ? 1 : 1.4"
                />
                <path
                  v-else
                  data-chart-clamped
                  :data-bucket="point.point.bucket"
                  :d="trianglePath(point)"
                  :fill="isLocal(line.model) ? line.color : 'var(--background)'"
                  :fill-opacity="isLocal(line.model) ? lineOpacity(line.model) : 1"
                  :stroke="line.color"
                  :stroke-opacity="lineOpacity(line.model)"
                  stroke-width="1.4"
                  stroke-linejoin="round"
                />
              </template>
              <circle
                v-for="point in line.points"
                :key="`${line.model.id}-hit-${point.bucketIndex}`"
                data-chart-hit
                :cx="point.x"
                :cy="point.y"
                r="10"
                fill="transparent"
                class="cursor-crosshair"
                @mouseenter="setActive(line.model, point.bucketIndex)"
              />
            </g>

            <!-- 当前悬停节点的强调环 -->
            <circle
              v-if="activePoint"
              :cx="activePoint.x"
              :cy="activePoint.y"
              r="5.5"
              fill="none"
              stroke="var(--foreground)"
              stroke-width="1.5"
              aria-hidden="true"
            />
          </svg>

          <!-- tooltip（模型 / 档位 + n / 分档综合分 / 7 维明细） -->
          <div
            v-if="tooltip"
            data-chart-tooltip
            class="pointer-events-none absolute z-20 w-[210px] border border-border bg-popover px-2.5 py-2 shadow-sm"
            :style="{ left: tooltip.left, top: tooltip.top, transform: tooltip.transform }"
          >
            <div class="flex items-center gap-1.5 text-[11px] font-medium text-foreground">
              <span
                class="inline-block size-2 shrink-0"
                :style="{ backgroundColor: colorFor(tooltip.model) }"
                aria-hidden="true"
              />
              <span class="truncate">{{ tooltip.model.name }}</span>
              <span class="font-mono text-[9px] text-muted-foreground">
                {{ modeBadge(tooltip.model) }}
              </span>
            </div>
            <div class="mt-1 flex items-baseline justify-between gap-2 text-[10px] text-muted-foreground">
              <span>{{ tooltip.bucket.label }} · n={{ tooltip.bucket.n }}</span>
              <span class="font-mono">
                难度 {{ tooltip.bucket.difficulty[0] }}–{{ tooltip.bucket.difficulty[1] }}
              </span>
            </div>
            <div class="mt-1 font-mono text-[12px] text-foreground">
              分档综合分
              <span class="ml-1 text-sm">{{ tooltip.scoreText }}</span>
              <span v-if="tooltip.clamped" class="ml-1 text-[10px] text-muted-foreground">▼</span>
            </div>
            <div class="mt-1.5 space-y-0.5 border-t border-border pt-1.5">
              <div
                v-for="dim in DIFFICULTY_DIMS"
                :key="`tt-${dim.key}`"
                class="flex items-baseline justify-between gap-2 text-[10px]"
              >
                <span class="text-muted-foreground">{{ dim.label }}</span>
                <span class="font-mono text-foreground">
                  {{ fmtPct(tooltip.point.dims[dim.key]) }}
                </span>
              </div>
            </div>
          </div>

          <div
            v-if="chartModels.length === 0"
            class="absolute inset-0 flex items-center justify-center bg-card/70 text-[12px] text-muted-foreground"
          >
            当前筛选下没有可绘制的模型
          </div>
        </div>

        <!-- 图下说明：数据口径与“别过度解读” -->
        <p data-chart-note class="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          {{ DIFFICULTY_NOTE }} 分档诊断为辅助视图，榜单主分见表格。
        </p>
      </div>

      <!-- 侧部：综合分排名（窄屏下沉到图下方） -->
      <aside class="min-w-0">
        <div class="flex items-baseline justify-between">
          <span class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            综合分排名
          </span>
          <span class="font-mono text-[10px] text-muted-foreground">
            {{ rankingModels.length }} 条
          </span>
        </div>
        <ol class="mt-2 space-y-1">
          <li v-for="model in rankingModels" :key="`rank-${model.id}`">
            <button
              type="button"
              data-rank-item
              class="group flex w-full items-center gap-1.5 px-1 py-0.5 text-left transition-colors hover:bg-accent/60 focus-visible:bg-accent/60 cursor-pointer"
              :aria-label="`${model.name} 综合分 ${fmtPct(model.compositeScore)}`"
              @mouseenter="setActive(model)"
              @mouseleave="activeId = null"
              @focus="setActive(model)"
              @blur="activeId = null"
            >
              <span class="w-3 shrink-0 font-mono text-[10px] text-muted-foreground">
                {{ rankMap.get(model.id) }}
              </span>
              <span
                class="inline-block size-2 shrink-0"
                :style="{ backgroundColor: colorFor(model) }"
                aria-hidden="true"
              />
              <span class="w-0 flex-1 truncate text-[11px] text-foreground">{{ model.name }}</span>
              <span class="shrink-0 font-mono text-[10px] text-muted-foreground">
                {{ fmtPct(model.compositeScore) }}
              </span>
            </button>
            <div class="mt-0.5 h-1 w-full bg-muted/40" aria-hidden="true">
              <div
                class="h-1"
                :style="{ width: `${model.compositeScore ?? 0}%`, backgroundColor: colorFor(model) }"
              />
            </div>
          </li>
        </ol>
        <p v-if="chartModels.length < scoredModels.length" class="mt-2 text-[10px] text-muted-foreground">
          当前显示 {{ chartModels.length }} / {{ scoredModels.length }} 条。
        </p>
      </aside>
    </div>

    <!-- 底部：图例（按综合分排序，点击显示/隐藏） -->
    <div class="mt-3 border-t border-border pt-3">
      <div
        class="grid grid-flow-col grid-rows-2 gap-x-3 gap-y-1 overflow-x-auto pb-1 sm:flex sm:flex-wrap sm:overflow-visible sm:pb-0"
        role="group"
        aria-label="模型图例"
      >
        <button
          v-for="model in legendModels"
          :key="`legend-${model.id}`"
          type="button"
          data-legend-item
          class="group inline-flex items-center gap-1.5 border border-transparent px-1 py-0.5 text-[11px] transition-opacity cursor-pointer"
          :class="
            hiddenIds.includes(model.id)
              ? 'opacity-35 line-through'
              : 'opacity-100 hover:border-border'
          "
          :aria-pressed="!hiddenIds.includes(model.id)"
          :title="`${model.name} · ${fmtPct(model.compositeScore)}`"
          @click="toggleModel(model.id)"
          @mouseenter="!hiddenIds.includes(model.id) && setActive(model)"
          @mouseleave="activeId = null"
          @focus="!hiddenIds.includes(model.id) && setActive(model)"
          @blur="activeId = null"
        >
          <span class="relative inline-flex size-2.5 shrink-0" aria-hidden="true">
            <span class="absolute inset-0" :style="{ backgroundColor: colorFor(model) }" />
            <span
              class="absolute -right-1 -top-1 bg-background px-[2px] font-mono text-[7px] leading-tight text-foreground"
            >
              {{ modeBadge(model) }}
            </span>
          </span>
          <span class="truncate">{{ model.name }}</span>
          <span class="font-mono text-[10px] text-muted-foreground">
            {{ fmtPct(model.compositeScore) }}
          </span>
        </button>
      </div>
    </div>
  </section>
</template>
