<script setup lang="ts">
import { computed } from 'vue';
import { TELEMETRY_STATS, LEADERBOARD_META, GENERATED_AT_LABEL } from '../data/benchmarkData';
import { ArrowDownRight, Layers, FlaskConical, Ruler } from 'lucide-vue-next';

defineEmits<{
  (e: 'navigate', targetId: string): void;
}>();

/**
 * Release 行只拼真实存在的元信息；缺失的段直接省略，不写死版本/日期。
 */
const releaseLabel = computed(() => {
  const parts: string[] = [];
  if (LEADERBOARD_META.split) parts.push(`split ${LEADERBOARD_META.split}`);
  if (LEADERBOARD_META.nPairs != null) parts.push(`${LEADERBOARD_META.nPairs} pairs`);
  if (LEADERBOARD_META.dataset) parts.push(LEADERBOARD_META.dataset);
  if (GENERATED_AT_LABEL) parts.push(`generated ${GENERATED_AT_LABEL}`);
  return parts.length > 0 ? parts.join(' · ') : '尚无评测结果';
});
</script>

<template>
  <section class="relative overflow-hidden border-b border-border">
    <div class="max-w-5xl mx-auto px-4 sm:px-6 pt-16 sm:pt-20 pb-12 sm:pb-16">
      <div class="flex items-end justify-between gap-6 border-b border-border pb-7 sm:pb-8">
        <div class="flex flex-col gap-3">
          <h1 class="text-[40px] sm:text-[60px] leading-none font-medium tracking-tight flex items-center gap-3 sm:gap-4">
            <svg
              viewBox="0 0 48 48"
              fill="none"
              stroke="currentColor"
              stroke-width="3.2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
              class="h-[0.8em] w-auto shrink-0 text-foreground"
            >
              <circle cx="24" cy="24" r="20" stroke-dasharray="3 3" opacity="0.4" />
              <polygon points="24,6 42,16 42,32 24,42 6,32 6,16" />
              <line x1="24" y1="6" x2="24" y2="42" />
              <line x1="6" y1="16" x2="42" y2="32" />
              <line x1="42" y1="16" x2="6" y2="32" />
              <circle cx="24" cy="24" r="3.5" fill="currentColor" />
            </svg>
            <span>StarLife-1-WSV</span>
          </h1>
          <div class="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm font-mono tracking-wide">
            <span>Observation Model Evaluation</span>
            <span class="text-border">|</span>
            <span class="text-foreground">Five judgement heads on synthetic 3D tabletop scenes</span>
          </div>
        </div>

        <!-- 真实计数（meta.telemetry）；没有就不渲染，不写死 -->
        <dl
          v-if="TELEMETRY_STATS.length > 0"
          class="hidden sm:flex flex-col gap-2 font-mono text-[13px] leading-none tabular-nums min-w-[130px]"
        >
          <div
            v-for="stat in TELEMETRY_STATS"
            :key="stat.label"
            class="flex items-baseline justify-between gap-6"
          >
            <dt class="text-muted-foreground">{{ stat.label }}</dt>
            <dd class="text-foreground font-medium">{{ stat.value }}</dd>
          </div>
        </dl>
      </div>

      <div class="mt-7 sm:mt-8">
        <div class="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between sm:gap-12">
          <p class="max-w-2xl text-base sm:text-[17px] text-muted-foreground leading-relaxed text-pretty">
            Evaluation of the <span class="text-foreground font-medium">StarLife-1-WSV</span> observation
            model: a frozen multimodal backbone with five classification heads that judge object change,
            type, spatial relation, relative position and affordance, scored at head level (top-1 /
            macro-F1), event level (P/R/F1) and world-state replay consistency — plus a 60-pair
            head-to-head against cloud VLMs replayed from real caches.
          </p>

          <div class="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              @click="$emit('navigate', 'leaderboard')"
              class="inline-flex h-10 items-center justify-center gap-2 bg-foreground px-4 text-xs sm:text-sm font-medium text-background transition-opacity hover:opacity-90 cursor-pointer"
            >
              <span>View Leaderboard</span>
              <ArrowDownRight class="size-3.5" />
            </button>

            <button
              type="button"
              @click="$emit('navigate', 'tasks')"
              class="inline-flex h-10 items-center justify-center gap-2 border border-border bg-background px-4 text-xs sm:text-sm font-medium text-foreground transition-colors hover:bg-accent cursor-pointer"
            >
              <span>Judgement Tasks</span>
              <ArrowDownRight class="size-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div class="mt-8 pt-5 border-t border-border/50 flex flex-wrap items-center gap-y-2 gap-x-6 text-[12px] text-muted-foreground">
          <div class="flex items-center gap-1.5">
            <Layers class="size-3.5 text-foreground" />
            <span>Frozen Qwen3.8-27B backbone · 5 classification heads</span>
          </div>
          <div class="flex items-center gap-1.5">
            <FlaskConical class="size-3.5 text-foreground" />
            <span>Synthetic 3D tabletop scenes · real manifest / npz / checkpoints</span>
          </div>
          <div class="flex items-center gap-1.5">
            <Ruler class="size-3.5 text-foreground" />
            <span>Measured latency · unmeasured dimensions rendered as N/A</span>
          </div>
          <div class="ml-auto font-mono text-[11px] text-muted-foreground/80">
            {{ releaseLabel }}
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
