<script setup lang="ts">
import { TELEMETRY_STATS } from '../data/benchmarkData';
import { Terminal, ArrowDownRight, ShieldCheck, Compass } from 'lucide-vue-next';

const emit = defineEmits<{
  (e: 'explore'): void;
  (e: 'run'): void;
}>();
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
            <span>OpenWSV</span>
          </h1>
          <div class="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm font-mono tracking-wide">
            <span>Open World State Verification</span>
            <span class="text-border">|</span>
            <span class="text-foreground">Multimodal 3D Spatial Reasoning</span>
          </div>
        </div>

        
        <dl class="hidden sm:flex flex-col gap-2 font-mono text-[13px] leading-none tabular-nums min-w-[130px]">
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
            Measuring frontier <span class="text-foreground font-medium">multimodal foundation models</span> on original,
            contamination-resistant 3D world state tracking, topological occlusion graphs, and physical spatial causal reasoning.
          </p>

          <div class="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              @click="emit('run')"
              class="inline-flex h-10 items-center justify-center gap-2 bg-foreground px-4 text-xs sm:text-sm font-medium text-background transition-opacity hover:opacity-90 cursor-pointer"
            >
              <Terminal class="size-4" />
              <span>Run OpenWSV Harness</span>
            </button>

            <button
              type="button"
              @click="emit('explore')"
              class="inline-flex h-10 items-center justify-center gap-2 border border-border bg-background px-4 text-xs sm:text-sm font-medium text-foreground transition-colors hover:bg-accent cursor-pointer"
            >
              <span>View Tasks</span>
              <ArrowDownRight class="size-3.5 text-muted-foreground" />
            </button>
          </div>
        </div>

        
        <div class="mt-8 pt-5 border-t border-border/50 flex flex-wrap items-center gap-y-2 gap-x-6 text-[12px] text-muted-foreground">
          <div class="flex items-center gap-1.5">
            <ShieldCheck class="size-3.5 text-foreground" />
            <span>100% Contamination-Free Procedural Seeds</span>
          </div>
          <div class="flex items-center gap-1.5">
            <Compass class="size-3.5 text-foreground" />
            <span>Deterministic Raytracing & PhysX Verifiers</span>
          </div>
          <div class="ml-auto font-mono text-[11px] text-muted-foreground/80">
            Release: <span class="text-foreground">v1.1</span> · Developer: <span class="text-foreground">StarLife AI</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
