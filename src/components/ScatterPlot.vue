<script setup lang="ts">
import { ref, computed } from 'vue';
import { ModelResult } from '../data/benchmarkData';
import { ChevronDown } from 'lucide-vue-next';

const props = defineProps<{
  models: ModelResult[];
  allModelsCount: number;
  activeMetric: 'cost' | 'tokens' | 'latency';
  activeVersion: 'v1.1' | 'v1.0';
}>();

const emit = defineEmits<{
  (e: 'update:activeMetric', metric: 'cost' | 'tokens' | 'latency'): void;
  (e: 'update:activeVersion', version: 'v1.1' | 'v1.0'): void;
  (e: 'filter-config'): void;
}>();

const hoveredModel = ref<ModelResult | null>(null);
const showConfigsDropdown = ref(false);

// SVG Canvas Dimensions matching DeepSWE viewBox
const svgWidth = 900;
const svgHeight = 563;

// Safe Chart Bounds with generous margins so data/labels NEVER exceed boundaries
const leftX = 75;
const rightX = 770;  // 130px padding on the right to prevent any text overflow
const topY = 52;     // corresponds to 90% (generous headroom for 84.8% StarLife)
const bottomY = 510; // corresponds to 0%

// Max score on Y-axis is 90% so 84.8% sits cleanly below top edge with ~50px headroom
const maxScore = 90;

const scaleY = (score: number) => {
  const clamped = Math.max(0, Math.min(maxScore, score));
  return bottomY - (clamped / maxScore) * (bottomY - topY);
};

// Y Ticks: 0% to 90% every 10%
const yTicks = [
  { val: 0, y: bottomY },
  { val: 10, y: scaleY(10) },
  { val: 20, y: scaleY(20) },
  { val: 30, y: scaleY(30) },
  { val: 40, y: scaleY(40) },
  { val: 50, y: scaleY(50) },
  { val: 60, y: scaleY(60) },
  { val: 70, y: scaleY(70) },
  { val: 80, y: scaleY(80) },
  { val: 90, y: topY },
];

// X Axis Config (REVERSED: 0 is on the right, higher cost/tokens/latency on the left)
// Calibrated to real model distribution so points are well-spaced across the entire canvas
const xConfig = computed(() => {
  if (props.activeMetric === 'tokens') {
    const maxTokens = 60; // 60k
    return {
      label: 'Avg visual tokens per task',
      scale: (tokens: number) => {
        const clamped = Math.max(0, Math.min(maxTokens, tokens));
        return rightX - (clamped / maxTokens) * (rightX - leftX);
      },
      ticks: [
        { label: '0k', x: rightX },
        { label: '20k', x: rightX - (20 / maxTokens) * (rightX - leftX) },
        { label: '40k', x: rightX - (40 / maxTokens) * (rightX - leftX) },
        { label: '60k', x: leftX },
      ],
      getValue: (m: ModelResult) => m.tokenNum,
    };
  } else if (props.activeMetric === 'latency') {
    const maxLat = 1800; // 1800ms
    return {
      label: 'Avg latency per task',
      scale: (lat: number) => {
        const clamped = Math.max(0, Math.min(maxLat, lat));
        return rightX - (clamped / maxLat) * (rightX - leftX);
      },
      ticks: [
        { label: '0ms', x: rightX },
        { label: '600ms', x: rightX - (600 / maxLat) * (rightX - leftX) },
        { label: '1200ms', x: rightX - (1200 / maxLat) * (rightX - leftX) },
        { label: '1800ms', x: leftX },
      ],
      getValue: (m: ModelResult) => m.latency,
    };
  }

  // Default: Cost ($0 to $6.00)
  const maxCost = 6.0;
  return {
    label: 'Avg cost per task',
    scale: (cost: number) => {
      const clamped = Math.max(0, Math.min(maxCost, cost));
      return rightX - (clamped / maxCost) * (rightX - leftX);
    },
    ticks: [
      { label: '$0', x: rightX },
      { label: '$2.00', x: rightX - (2.0 / maxCost) * (rightX - leftX) },
      { label: '$4.00', x: rightX - (4.0 / maxCost) * (rightX - leftX) },
      { label: '$6.00', x: leftX },
    ],
    getValue: (m: ModelResult) => m.cost,
  };
});

// Group models by family to draw connected curves
const modelFamilies = computed(() => {
  const families: Record<string, { color: string; models: ModelResult[] }> = {};

  props.models.forEach((m) => {
    if (!families[m.family]) {
      families[m.family] = { color: m.providerColor, models: [] };
    }
    families[m.family].models.push(m);
  });

  return Object.entries(families).map(([famName, data]) => {
    // Sort from highest cost/token (left) to lowest (right)
    const sorted = [...data.models].sort((a, b) => {
      return xConfig.value.getValue(b) - xConfig.value.getValue(a);
    });

    // Generate SVG path connecting points
    let pathD = '';
    sorted.forEach((m, idx) => {
      const cx = xConfig.value.scale(xConfig.value.getValue(m));
      const cy = scaleY(m.score);
      if (idx === 0) {
        pathD += `M ${cx.toFixed(1)} ${cy.toFixed(1)}`;
      } else {
        pathD += ` L ${cx.toFixed(1)} ${cy.toFixed(1)}`;
      }
    });

    return {
      name: famName,
      color: data.color,
      models: sorted,
      pathD,
    };
  });
});

// Smart label position calculator ensuring no label ever crosses chart edges or overlaps
const getLabelLayout = (m: ModelResult) => {
  const cx = xConfig.value.scale(xConfig.value.getValue(m));
  const cy = scaleY(m.score);

  let anchor = 'middle';
  let tx = cx;
  let ty = cy - 10;
  let subTy = cy - 1;

  // If point is close to the right edge (cx > 720), align text to the left/end so it never cuts off
  if (cx > 710) {
    anchor = 'end';
    tx = cx - 8;
    ty = cy - 3;
    subTy = cy + 8;
  }
  // If point is close to the left edge (cx < 120), align text to the right/start
  else if (cx < 120) {
    anchor = 'start';
    tx = cx + 8;
    ty = cy - 3;
    subTy = cy + 8;
  }
  // Special stagger for closely-clustered points to prevent text collision
  if (m.id === 'starlife-1-wsv-lite') {
    anchor = 'end';
    tx = cx - 8;
    ty = cy + 12;
    subTy = cy + 22;
  } else if (m.id === 'gemini-2-flash') {
    anchor = 'end';
    tx = cx - 8;
    ty = cy - 3;
    subTy = cy + 7;
  } else if (m.id === 'gpt-4o-2024-11') {
    anchor = 'start';
    tx = cx + 8;
    ty = cy - 2;
    subTy = cy + 8;
  }

  return { cx, cy, tx, ty, subTy, anchor };
};

// Filter which models get permanent labels (flagship/prominent) to match DeepSWE clean density
const shouldShowLabel = (m: ModelResult) => {
  // Always show StarLife models, best-in-class models, or when hovered
  if (m.family === 'StarLife' || m.isBest) return true;
  if (hoveredModel.value?.id === m.id) return true;
  // Specific milestone models
  if (['gpt-4o-2024-11', 'gemini-2-flash', 'claude-3-opus', 'gpt-4-turbo'].includes(m.id)) return true;
  return false;
};
</script>

<template>
  <div class="mb-10">
    <!-- Top Controls Row (Directly above the chart, matching DeepSWE) -->
    <div class="mb-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <!-- Left Controls: Version and Metric toggles -->
      <div class="flex items-center gap-2.5">
        <!-- Version Segmented Control -->
        <div class="inline-flex h-7 items-center border border-border text-xs">
          <button
            type="button"
            @click="emit('update:activeVersion', 'v1.1')"
            :aria-pressed="activeVersion === 'v1.1'"
            class="inline-flex h-full items-center justify-center px-2.5 outline-none transition-colors cursor-pointer"
            :class="activeVersion === 'v1.1' ? 'bg-foreground text-background font-medium' : 'text-muted-foreground hover:bg-accent hover:text-foreground'"
          >
            v1.1
          </button>
          <button
            type="button"
            @click="emit('update:activeVersion', 'v1.0')"
            :aria-pressed="activeVersion === 'v1.0'"
            class="inline-flex h-full items-center justify-center px-2.5 outline-none transition-colors border-l border-border cursor-pointer"
            :class="activeVersion === 'v1.0' ? 'bg-foreground text-background font-medium' : 'text-muted-foreground hover:bg-accent hover:text-foreground'"
          >
            v1
          </button>
        </div>

        <!-- Metric Segmented Control -->
        <div class="inline-flex h-7 items-center border border-border text-xs">
          <button
            type="button"
            @click="emit('update:activeMetric', 'cost')"
            :aria-pressed="activeMetric === 'cost'"
            class="inline-flex h-full items-center justify-center px-2.5 outline-none transition-colors cursor-pointer"
            :class="activeMetric === 'cost' ? 'bg-foreground text-background font-medium' : 'text-muted-foreground hover:bg-accent hover:text-foreground'"
          >
            Cost
          </button>
          <button
            type="button"
            @click="emit('update:activeMetric', 'tokens')"
            :aria-pressed="activeMetric === 'tokens'"
            class="inline-flex h-full items-center justify-center px-2.5 outline-none transition-colors border-l border-border cursor-pointer"
            :class="activeMetric === 'tokens' ? 'bg-foreground text-background font-medium' : 'text-muted-foreground hover:bg-accent hover:text-foreground'"
          >
            Output tokens
          </button>
          <button
            type="button"
            @click="emit('update:activeMetric', 'latency')"
            :aria-pressed="activeMetric === 'latency'"
            class="inline-flex h-full items-center justify-center px-2.5 outline-none transition-colors border-l border-border cursor-pointer"
            :class="activeMetric === 'latency' ? 'bg-foreground text-background font-medium' : 'text-muted-foreground hover:bg-accent hover:text-foreground'"
          >
            Agent steps / Latency
          </button>
        </div>
      </div>

      <!-- Right Metadata & Configs button -->
      <div class="ml-auto flex items-center gap-3">
        <span class="text-[12px] text-muted-foreground tabular-nums">
          <span class="text-foreground">142 tasks</span>
          <span> · updated <span class="text-foreground">October 20, 2026</span></span>
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
            <span class="tabular-nums text-muted-foreground">({{ models.length }}/{{ allModelsCount }})</span>
            <ChevronDown class="size-3.5 transition-transform" />
          </button>

          <div
            v-if="showConfigsDropdown"
            class="absolute right-0 top-8 z-30 w-52 border border-border bg-popover p-3 shadow-md text-xs font-mono"
          >
            <div class="font-semibold text-foreground mb-2">Display Configurations</div>
            <div class="space-y-1.5 text-muted-foreground">
              <div class="flex items-center justify-between">
                <span>Active Models:</span>
                <span class="text-foreground font-semibold">{{ models.length }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span>Benchmark Version:</span>
                <span class="text-foreground uppercase">{{ activeVersion }}</span>
              </div>
              <div class="pt-2 border-t border-border/50 text-[11px]">
                Filter by individual model in the table below.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Chart Frame (Matching DeepSWE: border border-border bg-card p-2 sm:p-3) -->
    <div class="border border-border bg-card p-2 sm:p-3 relative overflow-hidden">
      <div class="w-full">
        <svg
          :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
          width="100%"
          role="img"
          :aria-label="`Pass rate vs ${xConfig.label}`"
          style="display: block;"
          class="select-none"
        >
          <!-- Y-Axis Title (OpenWSV score) -->
          <text
            :x="leftX"
            y="26"
            text-anchor="start"
            font-size="14"
            font-weight="600"
            class="fill-foreground font-sans"
          >
            OpenWSV score
          </text>

          <!-- Top-right 'most efficient ↗' indicator -->
          <text
            :x="rightX"
            y="30"
            text-anchor="end"
            font-size="11"
            font-style="italic"
            class="fill-muted-foreground"
          >
            most efficient ↗
          </text>

          <!-- Vertical Grid Lines & Ticks (Reversed X-axis) -->
          <g v-for="tick in xConfig.ticks" :key="tick.label">
            <line
              :x1="tick.x"
              :x2="tick.x"
              :y1="topY"
              :y2="bottomY"
              stroke="var(--muted-foreground)"
              opacity="0.25"
            />
            <text
              :x="tick.x"
              y="529"
              text-anchor="middle"
              font-size="12"
              class="fill-muted-foreground font-mono"
            >
              {{ tick.label }}
            </text>
          </g>

          <!-- Horizontal Grid Lines & Ticks (Y-axis 0% to 90%) -->
          <g v-for="tick in yTicks" :key="tick.val">
            <line
              :x1="leftX"
              :x2="rightX"
              :y1="tick.y"
              :y2="tick.y"
              stroke="var(--muted-foreground)"
              opacity="0.25"
            />
            <text
              :x="leftX - 10"
              :y="tick.y + 4"
              text-anchor="end"
              font-size="12"
              class="fill-muted-foreground font-mono tabular-nums"
            >
              {{ tick.val }}%
            </text>
          </g>

          <!-- Bottom X-Axis Label -->
          <text
            :x="(leftX + rightX) / 2"
            y="549"
            text-anchor="middle"
            font-size="13"
            class="fill-foreground font-sans font-medium"
          >
            {{ xConfig.label }}
          </text>

          <!-- Family Connecting Trade-off Curves -->
          <g v-for="fam in modelFamilies" :key="`curve-${fam.name}`">
            <!-- Thicker transparent hover stroke for interaction -->
            <path
              v-if="fam.models.length > 1"
              :d="fam.pathD"
              fill="none"
              stroke="transparent"
              stroke-width="12"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="cursor-pointer"
            />
            <!-- Visible connecting curve -->
            <path
              v-if="fam.models.length > 1"
              :d="fam.pathD"
              fill="none"
              :stroke="fam.color"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
              opacity="0.75"
              style="transition: opacity 150ms ease;"
            />
          </g>

          <!-- Model Points & Labels (DeepSWE style) -->
          <g
            v-for="m in models"
            :key="m.id"
            class="cursor-pointer"
            @mouseenter="hoveredModel = m"
            @mouseleave="hoveredModel = null"
          >
            <!-- Large transparent hit target for easy mouse hover -->
            <circle
              :cx="getLabelLayout(m).cx"
              :cy="getLabelLayout(m).cy"
              r="14"
              fill="transparent"
            />

            <!-- Visible point circle -->
            <circle
              :cx="getLabelLayout(m).cx"
              :cy="getLabelLayout(m).cy"
              :r="hoveredModel?.id === m.id ? 5.5 : (m.isBest ? 4.5 : 3.5)"
              :fill="m.providerColor"
              stroke="var(--background)"
              stroke-width="1.5"
            />

            <!-- Model Name Text (Smartly anchored, background stroke to prevent gridline interference) -->
            <text
              v-if="shouldShowLabel(m)"
              :x="getLabelLayout(m).tx"
              :y="getLabelLayout(m).ty"
              :text-anchor="getLabelLayout(m).anchor"
              font-size="11.5"
              font-weight="600"
              :fill="m.providerColor"
              style="paint-order: stroke; stroke: var(--background); stroke-width: 3.5px; stroke-linejoin: round;"
            >
              {{ m.name }}
            </text>

            <!-- Effort / Mode Monospace Subtitle -->
            <text
              v-if="shouldShowLabel(m)"
              :x="getLabelLayout(m).tx"
              :y="getLabelLayout(m).subTy"
              :text-anchor="getLabelLayout(m).anchor"
              font-size="8.8"
              font-weight="400"
              :fill="m.providerColor"
              opacity="0.7"
              style="font-family: var(--font-mono); letter-spacing: 0.08em; paint-order: stroke; stroke: var(--background); stroke-width: 2.8px; stroke-linejoin: round;"
            >
              {{ m.mode }}
            </text>
          </g>
        </svg>
      </div>

      <!-- Floating Hover Tooltip -->
      <div
        v-if="hoveredModel"
        class="absolute top-4 right-4 border border-border bg-card p-3 shadow-lg pointer-events-none text-xs font-mono max-w-xs transition-opacity duration-150 z-20"
        :style="{ borderColor: hoveredModel.providerColor }"
      >
        <div class="font-semibold text-foreground flex items-center justify-between gap-4">
          <span>{{ hoveredModel.name }}</span>
          <span class="text-[10px] px-1 py-0.5 bg-secondary text-secondary-foreground">
            [{{ hoveredModel.mode }}]
          </span>
        </div>
        <div class="mt-1 text-muted-foreground">Provider: {{ hoveredModel.provider }}</div>
        <div class="mt-2 pt-2 border-t border-border/50 grid grid-cols-2 gap-x-4 gap-y-1">
          <div>Pass@1: <span class="text-foreground font-semibold">{{ hoveredModel.score }}% ± {{ hoveredModel.confidence }}%</span></div>
          <div>Topology F1: <span class="text-foreground">{{ hoveredModel.topologyF1 }}%</span></div>
          <div>Cost: <span class="text-foreground">${{ hoveredModel.cost.toFixed(2) }}</span></div>
          <div>Tokens: <span class="text-foreground">{{ hoveredModel.tokens }}</span></div>
          <div>Latency: <span class="text-foreground">{{ hoveredModel.latency }}ms</span></div>
          <div>Affordance: <span class="text-foreground">{{ hoveredModel.affordanceAcc }}%</span></div>
        </div>
      </div>
    </div>
  </div>
</template>
