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
    /** 仅测试用：预置悬停的档位下标（0 = 档 4，3 = 档 1）。 */
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

const VB_W = 900;
const VB_H = 420;
const PAD = { top: 18, right: 210, bottom: 46, left: 46 };
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
/** 线端标签之间的最小竖向间距（viewBox 单位）。 */
const END_LABEL_GAP = 24;
const END_LABEL_X = xFor(DISPLAY_BUCKETS.length - 1) + 16;
const HIGHLIGHT_SECOND_ID = 'claude-opus-5-5';

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
const isSecondHighlight = (model: ModelResult) => model.id === HIGHLIGHT_SECOND_ID;
const modeBadge = (model: ModelResult) => (isLocal(model) ? 'L' : 'Z');

const scoredModels = computed(() =>
  props.models.filter((model) => model.compositeScore != null),
);

const scoreOf = (model: ModelResult): number => model.compositeScore ?? 0;

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

const familyFiltered = computed(() =>
  [...scoredModels.value]
    .filter((model) => selectedFamilies.value.includes(model.family))
    .sort((a, b) => scoreOf(b) - scoreOf(a)),
);

const chartModels = computed(() => {
  const base = topOnly.value ? familyFiltered.value.slice(0, 6) : familyFiltered.value;
  return base.filter((model) => !hiddenIds.value.includes(model.id));
});

/** 绘制顺序：先普通线，再第二高亮（claude），最后本地头；本地头始终最上层。 */
const drawOrder = computed(() => {
  const order = (model: ModelResult) => {
    let key = 0;
    if (isSecondHighlight(model)) key += 1;
    if (isLocal(model)) key += 2;
    if (model.id === activeId.value) key += 0.5;
    return key;
  };
  return [...chartModels.value].sort((a, b) => order(a) - order(b));
});

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

const lineWidth = (model: ModelResult): number => {
  if (isLocal(model)) return 3;
  if (isSecondHighlight(model)) return 2;
  return 1.5;
};

const baseOpacity = (model: ModelResult): number => {
  if (isLocal(model)) return 1;
  if (isSecondHighlight(model)) return 0.85;
  return 0.55;
};

const lineOpacity = (model: ModelResult): number => {
  if (!activeId.value) return baseOpacity(model);
  return model.id === activeId.value ? 1 : 0.15;
};

const endPointRadius = (model: ModelResult, bucketIndex: number): number => {
  if (bucketIndex !== DISPLAY_BUCKETS.length - 1) return isLocal(model) ? 3 : 2.4;
  if (isLocal(model)) return 4.5;
  if (isSecondHighlight(model)) return 3.4;
  return 3;
};

const labelWeight = (model: ModelResult): number => {
  if (isLocal(model)) return 700;
  if (isSecondHighlight(model)) return 600;
  return 500;
};

// ------------------------------------------------------------------ 线端标签

interface EndLabel {
  model: ModelResult;
  color: string;
  x: number;
  pointY: number;
  labelY: number;
  rank: number;
}

/** 右端标签按综合分从高到低向下排，最小间距 16px（超界时整体上移）。 */
const endLabels = computed<EndLabel[]>(() => {
  const items: EndLabel[] = [...chartModels.value]
    .sort((a, b) => scoreOf(b) - scoreOf(a))
    .map((model, rank) => {
      const points = curvePoints(model);
      const last = points[points.length - 1];
      return {
        model,
        color: colorFor(model),
        x: last?.x ?? xFor(DISPLAY_BUCKETS.length - 1),
        pointY: last?.y ?? PAD.top,
        labelY: last?.y ?? PAD.top,
        rank,
      };
    });

  let cursor = PAD.top;
  for (const item of items) {
    item.labelY = Math.max(item.pointY, cursor);
    cursor = item.labelY + END_LABEL_GAP;
  }
  const bottom = PAD.top + PLOT_H;
  if (items.length && items[items.length - 1].labelY > bottom) {
    let next = bottom;
    for (let index = items.length - 1; index >= 0; index -= 1) {
      items[index].labelY = Math.min(items[index].labelY, next);
      next = items[index].labelY - END_LABEL_GAP;
    }
  }
  return items;
});

/** 窄屏只保留前 4 名 + 本地头，其余隐藏（仍在 DOM 里，靠 hover 看 tooltip）。 */
const hideOnNarrow = (label: EndLabel): boolean =>
  label.rank > 3 && !isLocal(label.model);

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

// ------------------------------------------------------------------ 图上批注

const bucketValue = (modelId: string, bucketKey: string): number | null => {
  const point = difficultyFor(modelId)?.points.find((item) => item.bucket === bucketKey);
  return point?.composite ?? null;
};

const starlifeModel = computed(
  () => scoredModels.value.find((model) => model.id === 'starlife-v1-wsv') ?? null,
);

/** 每个档位上前两名分差（用于判断“领先”文案，不写死数字）。 */
const leadAt = (bucketKey: string): number | null => {
  const values = scoredModels.value
    .map((model) => bucketValue(model.id, bucketKey))
    .filter((value): value is number => value != null)
    .sort((a, b) => b - a);
  if (values.length < 2) return null;
  return values[0] - values[1];
};

const annotations = computed(() => {
  const model = starlifeModel.value;
  if (!model) return [];
  const hardX = xFor(0);
  const easyX = xFor(DISPLAY_BUCKETS.length - 1);
  const hardPoint = curvePoints(model).find((point) => point.bucketIndex === 0);
  const easyPoint = curvePoints(model).find(
    (point) => point.bucketIndex === DISPLAY_BUCKETS.length - 1,
  );
  const hardLead = leadAt('b4');
  const easyLead = leadAt('b1');
  const list: Array<{
    key: string;
    text: string;
    x: number;
    y: number;
    textX: number;
    textY: number;
    anchor: 'start' | 'end';
  }> = [];
  if (hardPoint && hardLead != null) {
    list.push({
      key: 'hardest',
      text: `最难档：领先收窄到 ${hardLead.toFixed(1)} 分`,
      x: hardX,
      y: hardPoint.y,
      textX: hardX + 14,
      textY: hardPoint.y - 24,
      anchor: 'start',
    });
  }
  if (easyPoint && easyLead != null) {
    list.push({
      key: 'easiest',
      text: `最易档：领先 ${easyLead.toFixed(1)} 分`,
      x: easyX,
      y: easyPoint.y,
      textX: easyX - 14,
      textY: easyPoint.y + 20,
      anchor: 'end',
    });
  }
  return list;
});

const labelSubline = (model: ModelResult): string => `综合分 ${scoreOf(model).toFixed(1)}`;
</script>

<template>
  <section class="mt-8 border border-border bg-card/40 p-4 sm:p-5">
    <!-- 顶部工具条：说明 + 家族筛选 / Top 6（右上角一排小控件，弱化） -->
    <div class="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
      <p class="max-w-[34rem] text-[11px] leading-relaxed text-muted-foreground">
        按场景复杂度看趋势：横轴左难右易，同一档上越高越好；线端直接标模型名与综合分。未给出综合分的模型不进图。
      </p>
      <div class="flex flex-wrap items-center justify-start gap-1 lg:justify-end">
        <button
          v-for="family in allFamilies"
          :key="family"
          type="button"
          data-family-chip
          class="inline-flex h-5 items-center border px-1.5 font-mono text-[9px] uppercase tracking-wide transition-colors cursor-pointer"
          :class="
            familySelected(family)
              ? 'border-foreground/30 bg-foreground/5 text-foreground'
              : 'border-transparent bg-background text-muted-foreground/70 hover:text-foreground'
          "
          :aria-pressed="familySelected(family)"
          :disabled="familyCount(family) === 0"
          :title="`${family} · ${familyCount(family)} 个模型`"
          @click="toggleFamily(family)"
        >
          {{ family }}
        </button>
        <div
          class="ml-1 inline-flex border border-border/70 bg-background p-0.5"
          role="group"
          aria-label="显示范围"
        >
          <button
            type="button"
            class="h-4 px-1.5 text-[9px] transition-colors cursor-pointer"
            :class="topOnly ? 'bg-foreground text-background' : 'text-muted-foreground'"
            :aria-pressed="topOnly"
            @click="toggleTop"
          >
            只看 Top 6
          </button>
          <button
            type="button"
            class="h-4 px-1.5 text-[9px] transition-colors cursor-pointer"
            :class="!topOnly ? 'bg-foreground text-background' : 'text-muted-foreground'"
            :aria-pressed="!topOnly"
            @click="toggleTop"
          >
            全部
          </button>
        </div>
      </div>
    </div>

    <!-- 主体：全宽趋势图；右侧留出线端标签空间 -->
    <div class="relative mt-3">
      <svg
        :viewBox="`0 0 ${VB_W} ${VB_H}`"
        class="block h-auto w-full select-none"
        role="img"
        aria-label="分档综合分趋势图"
        @mousemove="handleChartMove"
        @mouseleave="clearHover"
      >
        <!-- Y 轴：浅灰横网格 + 稀疏刻度（无边框、无 tick 竖线） -->
        <g aria-hidden="true">
          <line
            v-for="tick in GRID_LINES"
            :key="`grid-${tick}`"
            :x1="PAD.left"
            :x2="PAD.left + PLOT_W"
            :y1="pointY(tick)"
            :y2="pointY(tick)"
            stroke="var(--border)"
            :stroke-dasharray="tick === Y_MIN ? 'none' : '3 5'"
            stroke-width="1"
            stroke-opacity="0.7"
          />
          <text
            v-for="tick in GRID_LINES"
            :key="`tick-${tick}`"
            :x="PAD.left - 10"
            :y="pointY(tick) + 3"
            data-y-tick
            text-anchor="end"
            class="fill-muted-foreground/80 font-mono"
            font-size="9"
          >
            {{ tick }}
          </text>
          <text
            :x="12"
            :y="PAD.top + PLOT_H / 2"
            :transform="`rotate(-90 12 ${PAD.top + PLOT_H / 2})`"
            text-anchor="middle"
            class="fill-muted-foreground/70"
            font-size="9"
          >
            分档综合分
          </text>
        </g>

        <!-- X 轴：只保留档位标签 + n=15，不画边框 -->
        <g aria-hidden="true">
          <text
            v-for="(bucket, index) in DISPLAY_BUCKETS"
            :key="`bucket-label-${bucket.key}`"
            data-bucket-label
            :x="xFor(index)"
            :y="VB_H - 24"
            text-anchor="middle"
            class="fill-muted-foreground/80 font-mono"
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
            class="fill-muted-foreground/60"
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
          stroke-opacity="0.6"
          aria-hidden="true"
        />

        <!-- 每个模型一条折线（普通线细/半透明，claude 第二高亮，本地头最粗置顶） -->
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
            <path
              v-if="point.clamped"
              data-chart-clamped
              :data-bucket="point.point.bucket"
              :d="trianglePath(point)"
              :fill="line.color"
              :fill-opacity="lineOpacity(line.model)"
              :stroke="line.color"
              :stroke-opacity="lineOpacity(line.model)"
              stroke-width="1.4"
              stroke-linejoin="round"
            />
            <circle
              v-else
              data-chart-point
              :cx="point.x"
              :cy="point.y"
              :r="endPointRadius(line.model, point.bucketIndex)"
              :fill="line.color"
              :fill-opacity="lineOpacity(line.model)"
              :stroke="'var(--card)'"
              stroke-width="1"
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

        <!-- 图上批注：小号灰蓝字 + 细引线，不用说明卡 -->
        <g data-annotation-group aria-hidden="true">
          <g
            v-for="annotation in annotations"
            :key="`annotation-${annotation.key}`"
            data-annotation
            :data-annotation-key="annotation.key"
          >
            <line
              :x1="annotation.x"
              :y1="annotation.y"
              :x2="annotation.textX + (annotation.anchor === 'start' ? -3 : 3)"
              :y2="annotation.textY + 3"
              stroke="var(--muted-foreground)"
              stroke-width="0.8"
              stroke-opacity="0.55"
            />
            <text
              :x="annotation.textX"
              :y="annotation.textY"
              :text-anchor="annotation.anchor"
              class="fill-muted-foreground"
              font-size="11"
              fill-opacity="0.9"
            >
              {{ annotation.text }}
            </text>
          </g>
        </g>

        <!-- 线端标签：模型名（颜色=线色）+ 综合分；标签挤时用 1px 引线连回端点 -->
        <g data-end-label-group>
          <g
            v-for="label in endLabels"
            :key="`end-label-${label.model.id}`"
            data-end-label
            :data-model-id="label.model.id"
            :data-label-y="label.labelY.toFixed(2)"
            :class="['cursor-default', hideOnNarrow(label) ? 'end-label-extra' : '']"
            @mouseenter="setActive(label.model)"
          >
            <line
              v-if="Math.abs(label.labelY - label.pointY) > 1"
              :x1="label.x"
              :y1="label.pointY"
              :x2="END_LABEL_X - 5"
              :y2="label.labelY"
              :stroke="label.color"
              stroke-width="1"
              stroke-opacity="0.55"
            />
            <text
              :x="END_LABEL_X"
              :y="label.labelY - 1"
              :fill="label.color"
              :font-weight="labelWeight(label.model)"
              :font-size="isLocal(label.model) ? 13 : 12"
              class="end-label-name"
            >
              {{ label.model.name }}
            </text>
            <text
              :x="END_LABEL_X"
              :y="label.labelY + 12"
              class="end-label-sub fill-muted-foreground"
              font-size="9"
            >
              {{ labelSubline(label.model) }}
            </text>
          </g>
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
    <p data-chart-note class="mt-2 text-[11px] leading-relaxed text-muted-foreground">
      {{ DIFFICULTY_NOTE }} 分档诊断为辅助视图，榜单主分见表格。
    </p>
  </section>
</template>

<style scoped>
@media (max-width: 899px) {
  .end-label-extra {
    display: none;
  }
}
</style>
