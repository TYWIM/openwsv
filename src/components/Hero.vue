<script setup lang="ts">
import { ArrowDownRight, Terminal } from 'lucide-vue-next';
import { BENCHMARK, BOARDS, MODEL_COUNT, SHIPPED_BOARDS } from '../data/openwsv';

defineEmits<{
  (e: 'navigate', targetId: string): void;
}>();

const meta = [
  `${BOARDS.length} 个榜单`,
  `${SHIPPED_BOARDS.length} 个已出分`,
  `${MODEL_COUNT} 个参评模型`,
  `框架 ${BENCHMARK.framework}`,
];
</script>

<template>
  <section id="top" class="relative overflow-hidden border-b border-border">
    <div class="hero-grid pointer-events-none absolute inset-0" aria-hidden="true" />
    <div class="relative mx-auto max-w-6xl px-4 pb-10 pt-14 sm:px-6 sm:pb-12 sm:pt-18">
      <div
        class="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
      >
        <span class="inline-flex items-center gap-1.5">
          <span class="inline-block size-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
          Open World-State Vision Benchmark
        </span>
        <span class="text-border">/</span>
        <span>v{{ BENCHMARK.version }} · {{ BENCHMARK.updated }}</span>
      </div>

      <h1
        class="mt-5 flex items-center gap-3 text-[52px] font-semibold leading-[0.95] tracking-[-0.04em] text-foreground sm:gap-5 sm:text-[72px]"
      >
        <svg
          viewBox="0 0 48 48"
          fill="none"
          stroke="currentColor"
          stroke-width="3"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
          class="h-[0.78em] w-auto shrink-0"
        >
          <circle cx="24" cy="24" r="20" stroke-dasharray="3 3" opacity="0.35" />
          <polygon points="24,6 42,16 42,32 24,42 6,32 6,16" />
          <line x1="24" y1="6" x2="24" y2="42" />
          <line x1="6" y1="16" x2="42" y2="32" />
          <line x1="42" y1="16" x2="6" y2="32" />
          <circle cx="24" cy="24" r="3.5" fill="currentColor" />
        </svg>
        <span>OpenWSV</span>
      </h1>

      <p class="mt-3 font-mono text-[13px] tracking-[0.04em] text-muted-foreground sm:text-sm">
        WSV · Open World-State Vision Benchmark
      </p>

      <p class="mt-5 text-[15px] leading-relaxed text-foreground/90 sm:text-base">
        同一批题、同一份 GT、同一套冻结框架，评测多模态模型与结构化世界模型的空间理解、物品关系与状态变化。
      </p>

      <div class="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          class="inline-flex h-9 cursor-pointer items-center gap-2 bg-foreground px-4 text-xs font-medium text-background transition-opacity hover:opacity-90"
          @click="$emit('navigate', 'leaderboard')"
        >
          <span>查看主榜</span>
          <ArrowDownRight class="size-3.5" />
        </button>
        <button
          type="button"
          class="inline-flex h-9 cursor-pointer items-center gap-2 border border-border bg-background px-4 text-xs font-medium text-foreground transition-colors hover:bg-accent"
          @click="$emit('navigate', 'repro')"
        >
          <span>复现</span>
          <Terminal class="size-3.5 text-muted-foreground" />
        </button>
        <span class="font-mono text-[11px] text-muted-foreground">
          {{ meta.join(' · ') }}
        </span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero-grid {
  background-image:
    linear-gradient(to right, var(--border) 1px, transparent 1px),
    linear-gradient(to bottom, var(--border) 1px, transparent 1px);
  background-size: 56px 56px;
  opacity: 0.16;
  mask-image: radial-gradient(ellipse 80% 70% at 30% 10%, black 30%, transparent 78%);
}
</style>