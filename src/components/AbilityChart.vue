<script setup lang="ts">
import { computed, ref } from 'vue';
import type { CompositeDimKey, LeaderboardMeta, ModelResult } from '../data/benchmarkData';
import { fmtPct } from '../data/benchmarkData';

const props = withDefaults(
  defineProps<{
    models: ModelResult[];
    meta?: LeaderboardMeta | null;
    /** 仅测试用：预置选中的模型，便于 SSR 验证 tooltip 内容。 */
    initialActiveId?: string;
    /** 仅测试用：预置悬停的维度下标（0–6）。 */
    initialFocusDim?: number;
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
    initialFocusDim: undefined,
    initialFamilies: undefined,
    initialTopOnly: false,
    initialHiddenIds: () => [],
  },
);

// ------------------------------------------------------------- 维度与几何参数

const DIMS: Array<{ key: CompositeDimKey; label: string; short: string }> = [
  { key: 'change_top1', label: '变化识别', short: '变化' },
  { key: 'change_balance', label: '变化平衡', short: '平衡' },
  { key: 'relation_type', label: '关系类型', short: '关系' },
  { key: 'rel_pos', label: '空间方位', short: '方位' },
  { key: 'attrs', label: '接触支撑', short: '接触' },
  { key: 'event_f1', label: '事件F1', short: '事件F1' },
  { key: 'state_consistency', label: '状态一致性', short: '一致性' },
];

const VB_W = 800;
const VB_H = 420;
const PAD = { top: 14, right: 22, bottom: 16, left: 46 };
const PLOT_W = VB_W - PAD.left - PAD.right;
const PLOT_H = VB_H - PAD.top - PAD.bottom;
const dimX = (index: number) => PAD.left + (PLOT_W * index) / (DIMS.length - 1);
const pointY = (value: number) => PAD.top + (1 - value / 100) * PLOT_H;
const GRID_LINES = [0, 20, 40, 60, 80, 100];

// ------------------------------------------------------------------ 交互状态

const selectedFamilies = ref<string[]>(
  props.initialFamilies
    ? [...props.initialFamilies]
    : [...new Set(props.models.map((model) => model.family))],
);
const topOnly = ref(props.initialTopOnly);
const hiddenIds = ref<string[]>([...(props.initialHiddenIds ?? [])]);
const activeId = ref<string | null>(props.initialActiveId ?? null);
const hoverDim = ref<number | null>(props.initialFocusDim ?? null);

const isLocal = (model: ModelResult) => /local/i.test(model.mode) || model.family === 'StarLife';
const modeBadge = (model: ModelResult) => (isLocal(model) ? 'L' : 'Z');

const scoredModels = computed(() =>
  props.models.filter((model) => model.compositeScore != null),
);

const scoreOf = (model: ModelResult): number => model.compositeScore ?? 0;

const dimValue = (model: ModelResult, key: CompositeDimKey): number | null => {
  const dim = model.composite?.dims.find((item) => item.key === key);
  if (!dim || !dim.available || !Number.isFinite(dim.value)) return null;
  return dim.value;
};

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

// ------------------------------------------------------------------ 折线数据

interface Segment {
  path: string;
}

interface ChartLine {
  model: ModelResult;
  color: string;
  segments: Segment[];
  points: Array<{ x: number; y: number; dim: number; value: number }>;
}

const lines = computed<ChartLine[]>(() =>
  drawOrder.value.map((model) => {
    const points: ChartLine['points'] = [];
    const segments: Segment[] = [];
    let current: string[] = [];
    const flush = () => {
      if (current.length > 1) {
        const [first, ...rest] = current;
        segments.push({ path: [`M ${first}`, ...rest.map((point) => `L ${point}`)].join(' ') });
      }
      current = [];
    };
    DIMS.forEach((dim, index) => {
      const value = dimValue(model, dim.key);
      if (value == null) {
        flush();
        return;
      }
      const x = dimX(index);
      const y = pointY(value);
      points.push({ x, y, dim: index, value });
      current.push(`${x.toFixed(2)} ${y.toFixed(2)}`);
    });
    flush();
    return { model, color: colorFor(model), segments, points };
  }),
);

const lineOpacity = (model: ModelResult): number => {
  if (!activeId.value) return isLocal(model) ? 1 : 0.8;
  return model.id === activeId.value ? 1 : 0.15;
};

const lineWidth = (model: ModelResult): number => (isLocal(model) ? 3 : 1.5);

// -------------------------------------------------------------------- tooltip

const rankFor = (modelId: string, key: CompositeDimKey): { rank: number; total: number } | null => {
  const values = scoredModels.value
    .map((model) => ({ id: model.id, value: dimValue(model, key) }))
    .filter((item): item is { id: string; value: number } => item.value != null)
    .sort((a, b) => b.value - a.value);
  const index = values.findIndex((item) => item.id === modelId);
  if (index < 0) return null;
  return { rank: index + 1, total: values.length };
};

const activeModel = computed(
  () => chartModels.value.find((model) => model.id === activeId.value) ?? null,
);

const tooltip = computed(() => {
  const model = activeModel.value;
  if (!model || hoverDim.value == null) return null;
  const dim = DIMS[hoverDim.value];
  const value = dimValue(model, dim.key);
  if (value == null) return null;
  const rank = rankFor(model.id, dim.key);
  const left = (dimX(hoverDim.value) / VB_W) * 100;
  const top = Math.min(86, Math.max(12, (pointY(value) / VB_H) * 100));
  const transform =
    hoverDim.value === 0
      ? 'translate(-8%, -118%)'
      : hoverDim.value === DIMS.length - 1
        ? 'translate(-92%, -118%)'
        : 'translate(-50%, -118%)';
  return {
    model,
    dim,
    value,
    rank,
    left: `${left}%`,
    top: `${top}%`,
    transform,
  };
});

const activeNode = computed(() => {
  const model = activeModel.value;
  if (!model || hoverDim.value == null) return null;
  const value = dimValue(model, DIMS[hoverDim.value].key);
  if (value == null) return null;
  return { x: dimX(hoverDim.value), y: pointY(value) };
});

const handleChartMove = (event: MouseEvent) => {
  const target = event.currentTarget as SVGElement | null;
  if (!target) return;
  const rect = target.getBoundingClientRect();
  if (!rect.width) return;
  const x = ((event.clientX - rect.left) / rect.width) * VB_W;
  const raw = ((x - PAD.left) / PLOT_W) * (DIMS.length - 1);
  hoverDim.value = Math.min(DIMS.length - 1, Math.max(0, Math.round(raw)));
};

const setActive = (model: ModelResult, dim?: number) => {
  activeId.value = model.id;
  if (dim != null) hoverDim.value = dim;
};
</script>

<template>
  <section class="mt-8 border border-border bg-card/40 p-4 sm:p-5">
    <!-- 顶部工具条：家族筛选 + Top 6 / 全部 + N/A 说明 -->
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
      7 维能力形状：每个模型一条折线，同一维度上越高越好。未给出综合分的模型不进图（表格中显示为 N/A）。
    </p>

    <!-- 主体：折线图 + 右侧综合分排名 -->
    <div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_224px]">
      <div class="min-w-0">
        <div class="relative">
          <svg
            :viewBox="`0 0 ${VB_W} ${VB_H}`"
            class="block h-auto w-full select-none"
            role="img"
            aria-label="7 维能力折线图"
            @mousemove="handleChartMove"
            @mouseleave="hoverDim = null"
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
                text-anchor="end"
                class="fill-muted-foreground font-mono"
                font-size="9"
              >
                {{ tick }}
              </text>
            </g>

            <!-- 维度竖轴 -->
            <g aria-hidden="true">
              <line
                v-for="(dim, index) in DIMS"
                :key="`axis-${dim.key}`"
                :x1="dimX(index)"
                :x2="dimX(index)"
                :y1="PAD.top"
                :y2="VB_H - PAD.bottom"
                stroke="var(--border)"
                stroke-width="1"
              />
            </g>

            <!-- 悬停竖线 -->
            <line
              v-if="hoverDim != null"
              :x1="dimX(hoverDim)"
              :x2="dimX(hoverDim)"
              :y1="PAD.top"
              :y2="VB_H - PAD.bottom"
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
              class="outline-none"
              tabindex="0"
              role="img"
              :aria-label="`${line.model.name}，综合分 ${fmtPct(line.model.compositeScore)}`"
              @mouseenter="setActive(line.model)"
              @focus="setActive(line.model)"
              @blur="activeId = null"
            >
              <path
                v-for="(segment, index) in line.segments"
                :key="`${line.model.id}-seg-${index}`"
                :d="segment.path"
                fill="none"
                :stroke="line.color"
                :stroke-width="lineWidth(line.model)"
                :stroke-opacity="lineOpacity(line.model)"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <circle
                v-for="point in line.points"
                :key="`${line.model.id}-p-${point.dim}`"
                :cx="point.x"
                :cy="point.y"
                :r="isLocal(line.model) ? 3 : 2.2"
                :fill="line.color"
                :fill-opacity="lineOpacity(line.model)"
                :stroke="'var(--background)'"
                stroke-width="0.75"
              />
              <circle
                v-for="point in line.points"
                :key="`${line.model.id}-hit-${point.dim}`"
                :cx="point.x"
                :cy="point.y"
                r="9"
                fill="transparent"
                class="cursor-crosshair"
                @mouseenter="setActive(line.model, point.dim)"
              />
            </g>

            <!-- 当前悬停维度的强调点 -->
            <circle
              v-if="activeNode"
              :cx="activeNode.x"
              :cy="activeNode.y"
              r="5"
              fill="none"
              stroke="var(--foreground)"
              stroke-width="1.5"
              aria-hidden="true"
            />
          </svg>

          <!-- tooltip（hover / focus 时显示该模型在该维度的数值与排名） -->
          <div
            v-if="tooltip"
            data-chart-tooltip
            class="pointer-events-none absolute z-20 min-w-[160px] border border-border bg-popover px-2.5 py-2 shadow-sm"
            :style="{ left: tooltip.left, top: tooltip.top, transform: tooltip.transform }"
          >
            <div class="flex items-center gap-1.5 text-[11px] font-medium text-foreground">
              <span
                class="inline-block size-2 shrink-0"
                :style="{ backgroundColor: tooltip.model.providerColor }"
                aria-hidden="true"
              />
              <span class="truncate">{{ tooltip.model.name }}</span>
              <span class="font-mono text-[9px] text-muted-foreground">
                {{ modeBadge(tooltip.model) }}
              </span>
            </div>
            <div class="mt-1 text-[10px] text-muted-foreground">{{ tooltip.dim.label }}</div>
            <div class="mt-0.5 font-mono text-sm text-foreground">{{ fmtPct(tooltip.value) }}</div>
            <div v-if="tooltip.rank" class="mt-0.5 text-[10px] text-muted-foreground">
              该维度第 {{ tooltip.rank.rank }} / {{ tooltip.rank.total }}
            </div>
          </div>

          <div
            v-if="chartModels.length === 0"
            class="absolute inset-0 flex items-center justify-center bg-card/70 text-[12px] text-muted-foreground"
          >
            当前筛选下没有可绘制的模型
          </div>
        </div>

        <!-- X 轴标签：桌面完整、窄屏 4 字内并旋转 -30°；hover / focus 联动竖线 -->
        <div class="axis-labels" aria-label="维度">
          <div
            v-for="(dim, index) in DIMS"
            :key="`label-${dim.key}`"
            class="axis-label-slot"
            :style="{ left: `${(dimX(index) / VB_W) * 100}%` }"
          >
            <button
              type="button"
              data-axis-label
              class="axis-label-btn"
              :class="hoverDim === index ? 'text-foreground' : 'text-muted-foreground'"
              @mouseenter="hoverDim = index"
              @mouseleave="hoverDim = null"
              @focus="hoverDim = index"
              @blur="hoverDim = null"
            >
              <span class="axis-label-full">{{ dim.label }}</span>
              <span class="axis-label-short">{{ dim.short }}</span>
            </button>
          </div>
        </div>
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

    <!-- 底部：怎么读 + 图例（按综合分排序，点击显示/隐藏） -->
    <div class="mt-4 border-t border-border pt-3">
      <p class="text-[11px] text-muted-foreground">
        怎么读：同一维度上越高越好；线的交叉说明能力侧重不同。
      </p>
      <div
        class="mt-2 grid grid-flow-col grid-rows-2 gap-x-3 gap-y-1 overflow-x-auto pb-1 sm:flex sm:flex-wrap sm:overflow-visible sm:pb-0"
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

<style scoped>
.axis-labels {
  position: relative;
  height: 46px;
  margin-top: 2px;
}

.axis-label-slot {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
}

.axis-label-slot:first-child {
  transform: translateX(0);
}

.axis-label-slot:last-child {
  transform: translateX(-100%);
}

.axis-label-btn {
  display: inline-block;
  padding: 2px 0 0;
  font-size: 10px;
  line-height: 1.2;
  text-align: center;
  white-space: nowrap;
  background: transparent;
  border: 0;
  cursor: pointer;
}

.axis-label-full {
  display: none;
}

.axis-label-short {
  display: inline-block;
  transform: rotate(-30deg);
  transform-origin: top center;
}

@media (min-width: 640px) {
  .axis-labels {
    height: 22px;
  }

  .axis-label-full {
    display: inline;
  }

  .axis-label-short {
    display: none;
  }
}
</style>
