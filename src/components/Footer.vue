<script setup lang="ts">
import { BENCHMARK, REPRO } from '../data/openwsv';
</script>

<template>
  <footer class="mt-20 border-t border-border bg-card/40">
    <div
      class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-6 sm:px-6"
    >
      <div class="flex items-center gap-2.5">
        <svg
          class="h-5 w-auto shrink-0 text-foreground"
          viewBox="0 0 32 32"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <polygon points="16,2 30,10 30,22 16,30 2,22 2,10" />
          <line x1="16" y1="2" x2="16" y2="30" />
          <line x1="2" y1="10" x2="30" y2="22" />
          <line x1="30" y1="10" x2="2" y2="22" />
        </svg>
        <span class="text-[15px] font-semibold tracking-tight text-foreground">
          {{ BENCHMARK.name }}
        </span>
        <span class="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {{ BENCHMARK.short }}
        </span>
      </div>

      <div class="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-muted-foreground">
        <span>updated {{ BENCHMARK.updated }}</span>
        <a
          :href="REPRO.repo"
          target="_blank"
          rel="noopener noreferrer"
          class="transition-colors hover:text-foreground"
        >
          TYWIM/starlife_eval ↗
        </a>
      </div>
    </div>
  </footer>
</template>