<script setup lang="ts">
import { METHODOLOGY_POINTS } from '../data/benchmarkData';
</script>

<template>
  <section id="methodology" class="mt-16 sm:mt-24 scroll-mt-20">
    <div class="border-t border-border pt-12">
      <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.8fr)] gap-y-10 gap-x-12 lg:gap-x-16">
        <div class="space-y-4">
          <div class="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            Evaluation Protocol
          </div>
          <h2 class="text-2xl sm:text-3xl font-medium tracking-tight text-foreground leading-tight">
            How this spatial &amp; relational benchmark is scored
          </h2>
          <p class="text-sm text-muted-foreground leading-relaxed text-pretty">
            Every number on this page comes from a real evaluation run over the
            <span class="font-mono text-foreground">dataset_spatial_v2</span> artifacts: a manifest,
            cached backbone features and trained head checkpoints. There are no synthetic scores,
            no LLM-as-a-judge, and no placeholder values — a dimension that cannot be measured is
            reported as N/A.
          </p>
        </div>

        <div class="space-y-8">
          <div
            v-for="point in METHODOLOGY_POINTS"
            :key="point.number"
            class="group border-b border-border/70 pb-6 last:border-b-0"
          >
            <div class="flex items-baseline gap-4 mb-2">
              <span class="font-mono text-xs text-muted-foreground/80 tabular-nums">
                {{ point.number }}
              </span>
              <h3 class="text-base sm:text-lg font-medium text-foreground">
                {{ point.title }}
              </h3>
            </div>
            <div class="pl-7">
              <p class="text-xs font-mono text-foreground/80 mb-2">
                {{ point.subtitle }}
              </p>
              <p class="text-sm text-muted-foreground leading-relaxed text-pretty">
                {{ point.body }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
