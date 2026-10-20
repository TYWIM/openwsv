<script setup lang="ts">
import { ArrowRight } from 'lucide-vue-next';

const chapters = [
  { num: '01', title: 'Motivation & Foundational Gaps', desc: 'Why frontier LLMs fail at basic 3D occlusion' },
  { num: '02', title: 'Procedural Scene Synthesis', desc: 'Ensuring zero data contamination in pretraining weights' },
  { num: '03', title: 'Deterministic Verifier Engines', desc: 'Replacing subjective LLM judges with Isaac Sim & PhysX' },
  { num: '04', title: 'Empirical Results & Scaling Laws', desc: 'Analysis across 24 multimodal models and resolutions' },
];
</script>

<template>
  <section id="whitepaper" class="max-w-5xl mx-auto px-4 sm:px-6 mt-20 sm:mt-28 scroll-mt-20">
    <div class="bg-foreground text-background p-8 sm:p-10 lg:p-12">
      <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.7fr)] gap-y-10 gap-x-12 lg:gap-x-16">
        
        <div class="flex flex-col lg:justify-center gap-6 sm:gap-7">
          <h2 class="text-[28px] sm:text-[36px] lg:text-[40px] leading-[1.05] tracking-tight font-medium text-balance max-w-[14ch]">
            Read the technical report
          </h2>
          <a
            href="https://arxiv.org"
            target="_blank"
            rel="noopener noreferrer"
            class="group/cta inline-flex h-[44px] w-fit items-center gap-2 bg-background pl-5 pr-4 text-foreground transition-opacity duration-200 hover:opacity-90"
          >
            <span class="text-[14px] sm:text-[15px] font-medium">Open Whitepaper (PDF)</span>
            <ArrowRight class="size-4 transition-transform duration-150 ease-out group-hover/cta:translate-x-0.5" />
          </a>
        </div>

        
        <ol class="divide-y divide-background/15 border-y border-background/15">
          <li
            v-for="ch in chapters"
            :key="ch.num"
            class="group/row"
          >
            <a
              href="#whitepaper"
              class="flex items-baseline gap-5 py-4 px-2 transition-colors hover:bg-background/8"
            >
              <span class="font-mono text-[11px] tabular-nums text-background/40 w-6 shrink-0">
                {{ ch.num }}
              </span>
              <div class="min-w-0 flex-1 flex flex-col gap-y-0.5 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-x-3">
                <span class="text-[15px] sm:text-base text-background leading-snug">
                  {{ ch.title }}
                </span>
                <span class="text-[12px] sm:text-[13px] text-background/55 leading-snug">
                  {{ ch.desc }}
                </span>
              </div>
            </a>
          </li>
        </ol>
      </div>
    </div>
  </section>
</template>
