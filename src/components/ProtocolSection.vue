<script setup lang="ts">
import SectionHeader from './SectionHeader.vue';
import { BENCHMARK, PROTOCOL } from '../data/openwsv';

const pad = (index: number): string => String(index + 1).padStart(2, '0');
</script>

<template>
  <section id="protocol" class="mt-14 scroll-mt-20 sm:mt-20">
    <SectionHeader index="02" title="评测协议" eyebrow="Protocol · frozen five" />

    <div data-protocol-table class="border border-border bg-card/40">
      <div
        class="grid grid-cols-[2.5rem_4.5rem_minmax(0,1fr)] items-baseline gap-3 border-b border-border bg-muted/20 px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground sm:grid-cols-[2.5rem_6rem_minmax(0,1fr)]"
      >
        <span>#</span>
        <span>组件</span>
        <span>冻结值 · {{ BENCHMARK.framework }}</span>
      </div>

      <div
        v-for="(row, index) in PROTOCOL"
        :key="row.name"
        :data-protocol-name="row.name"
        class="grid grid-cols-[2.5rem_4.5rem_minmax(0,1fr)] items-baseline gap-3 px-4 py-3 [&:not(:last-child)]:border-b [&:not(:last-child)]:border-border/60 sm:grid-cols-[2.5rem_6rem_minmax(0,1fr)]"
      >
        <span class="font-mono text-[10px] tabular-nums text-muted-foreground/60">{{ pad(index) }}</span>
        <span class="whitespace-nowrap text-[13px] font-medium text-foreground">{{ row.name }}</span>
        <span class="min-w-0 break-all font-mono text-[11px] leading-relaxed text-muted-foreground">
          {{ row.value }}
        </span>
      </div>
    </div>
  </section>
</template>