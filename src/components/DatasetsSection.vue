<script setup lang="ts">
import SectionHeader from './SectionHeader.vue';
import { DATASETS } from '../data/openwsv';
</script>

<template>
  <section id="datasets" class="mt-14 scroll-mt-20 sm:mt-20">
    <SectionHeader index="03" title="数据集" eyebrow="Datasets · three suites" />

    <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
      <article
        v-for="dataset in DATASETS"
        :key="dataset.id"
        :data-dataset-id="dataset.id"
        class="flex flex-col border border-border bg-card/40 p-4 transition-colors hover:border-foreground/20"
      >
        <span class="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          {{ dataset.id }}
        </span>
        <h3 class="mt-2 text-[15px] font-medium tracking-tight text-foreground">
          {{ dataset.name }}
        </h3>
        <div class="mt-1 font-mono text-[11px] text-foreground/70">{{ dataset.n }}</div>
        <p class="mt-3 text-[12px] leading-relaxed text-muted-foreground">{{ dataset.desc }}</p>
      </article>
    </div>
  </section>
</template>