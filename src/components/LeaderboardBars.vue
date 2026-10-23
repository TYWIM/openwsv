<script setup lang="ts">
import { computed } from 'vue';
import {
  fmtCount,
  fmtCoverage,
  fmtPct,
  isIncompleteCoverage,
  modelColor,
  sortedRows,
  type Board,
} from '../data/openwsv';

const props = defineProps<{ board: Board }>();

const rows = computed(() => sortedRows(props.board));

const widthOf = (value: number): string => `${Math.min(100, Math.max(0, value * 100)).toFixed(2)}%`;
const ciLeft = (ci: [number, number] | null): string => `${((ci?.[0] ?? 0) * 100).toFixed(2)}%`;
const ciWidth = (ci: [number, number] | null): string =>
  `${Math.max(0, ((ci?.[1] ?? 0) - (ci?.[0] ?? 0)) * 100).toFixed(2)}%`;
const pointLeft = (value: number): string => `${Math.min(100, Math.max(0, value * 100)).toFixed(2)}%`;
</script>

<template>
  <div data-leaderboard-bars class="border border-border bg-card/40 px-4 pb-4 pt-3 sm:px-5">
    <div class="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <span class="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        accuracy<template v-if="board.n != null"> · n = {{ fmtCount(board.n) }}</template>
      </span>
      <span class="font-mono text-[10px] text-muted-foreground/80">0–100 刻度 · 95% CI 须线</span>
    </div>

    <div class="bars">
      <div class="relative pb-5">
        <div class="chart-grid" aria-hidden="true">
          <span v-for="tick in [0, 25, 50, 75, 100]" :key="`grid-${tick}`" />
        </div>

        <div class="relative space-y-1">
          <div
            v-for="row in rows"
            :key="row.id"
            data-bar-row
            :data-model-id="row.id"
            :data-value="fmtPct(row.value)"
            :data-bar-width="widthOf(row.value)"
            :data-harness-boxes="String(row.usesHarnessBoxes)"
            class="bar-row group rounded-[3px] px-0.5 transition-colors hover:bg-accent/40"
            :title="`${row.label} · accuracy ${fmtPct(row.value)}${
              row.ci ? ` · 95% CI ${fmtPct(row.ci[0])}–${fmtPct(row.ci[1])}` : ''
            }`"
          >
            <span class="bar-label text-muted-foreground group-hover:text-foreground">
              <span
                class="mr-1.5 inline-block size-1.5 shrink-0 rounded-full"
                :style="{ backgroundColor: modelColor(row.id) }"
                aria-hidden="true"
              />
              {{ row.label }}
              <span
                v-if="isIncompleteCoverage(row)"
                class="ml-1 font-mono text-[9px] text-foreground/60"
                :title="`覆盖率 ${fmtCoverage(row.coverage)}：未作答题目不计入分母`"
              >
                [coverage]
              </span>
            </span>

            <div class="relative h-3.5 min-w-0 bg-muted/25">
              <div
                data-bar-fill
                class="bar-fill absolute inset-y-0 left-0"
                :style="{
                  width: widthOf(row.value),
                  '--bar-fill': modelColor(row.id),
                }"
              />
              <div v-if="row.ci" class="ci-layer pointer-events-none absolute inset-0" aria-hidden="true">
                <span
                  data-ci-range
                  class="ci-range absolute top-1/2 h-[1.5px] -translate-y-1/2"
                  :style="{ left: ciLeft(row.ci), width: ciWidth(row.ci) }"
                />
                <span
                  data-ci-cap
                  class="ci-cap absolute top-1/2 h-[8px] w-[1.5px] -translate-y-1/2"
                  :style="{ left: ciLeft(row.ci) }"
                />
                <span
                  data-ci-cap
                  class="ci-cap absolute top-1/2 h-[8px] w-[1.5px] -translate-y-1/2"
                  :style="{ left: `calc(${ciLeft(row.ci)} + ${ciWidth(row.ci)})` }"
                />
                <span
                  data-ci-point
                  class="ci-point absolute top-1/2 h-[11px] w-[1.5px] -translate-y-1/2"
                  :style="{ left: pointLeft(row.value) }"
                />
              </div>
            </div>

            <span class="value-cell font-mono tabular-nums text-foreground">
              <span data-bar-value class="text-[12px] font-medium">{{ fmtPct(row.value) }}</span>
              <span
                v-if="row.ci"
                data-ci-label
                class="text-[10px] leading-none text-muted-foreground"
              >
                [{{ fmtPct(row.ci[0]) }}–{{ fmtPct(row.ci[1]) }}]
              </span>
            </span>
          </div>
        </div>

        <div class="axis-labels mt-1" aria-hidden="true">
          <span v-for="tick in [0, 25, 50, 75, 100]" :key="`label-${tick}`">{{ tick }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bars {
  --bar-label-w: 176px;
  --bar-value-w: 176px;
  --bar-gap: 10px;
}

.bar-row {
  display: grid;
  grid-template-columns: var(--bar-label-w) minmax(0, 1fr) var(--bar-value-w);
  align-items: center;
  gap: var(--bar-gap);
  min-height: 24px;
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
  gap: 6px;
  white-space: nowrap;
}

.bar-fill {
  background-color: var(--bar-fill);
  opacity: 0.72;
  transition:
    width 300ms ease-out,
    opacity 300ms ease-out;
}

.group:hover .bar-fill {
  opacity: 1;
}

.ci-layer {
  opacity: 0.7;
  transition: opacity 150ms ease-out;
}

.group:hover .ci-layer {
  opacity: 1;
}

.ci-range,
.ci-cap {
  background-color: var(--foreground);
  opacity: 0.42;
}

.ci-point {
  background-color: var(--foreground);
  opacity: 0.9;
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
  opacity: 0.6;
}

.axis-labels {
  display: flex;
  justify-content: space-between;
  margin-right: calc(var(--bar-value-w) + var(--bar-gap));
  margin-left: calc(var(--bar-label-w) + var(--bar-gap));
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 9px;
  color: var(--muted-foreground);
  opacity: 0.75;
}

@media (max-width: 639px) {
  .bars {
    --bar-label-w: 118px;
    --bar-value-w: 92px;
    --bar-gap: 8px;
  }

  .value-cell {
    gap: 3px;
  }

  .value-cell [data-ci-label] {
    display: none;
  }
}
</style>