<script setup lang="ts">
import { ref } from 'vue';
import { ArrowUpRight, Check, Copy, Github, Terminal } from 'lucide-vue-next';
import SectionHeader from './SectionHeader.vue';
import { BENCHMARK, REPRO } from '../data/openwsv';

const copied = ref(false);

const copyCommand = async () => {
  try {
    await navigator.clipboard.writeText(REPRO.command);
    copied.value = true;
    window.setTimeout(() => {
      copied.value = false;
    }, 1600);
  } catch {
    copied.value = false;
  }
};
</script>

<template>
  <section id="repro" class="mt-14 scroll-mt-20 sm:mt-20">
    <SectionHeader index="04" title="复现" eyebrow="Reproduce · one command" />

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div class="border border-border bg-card/40">
        <div
          class="flex items-center justify-between gap-3 border-b border-border bg-muted/20 px-4 py-2.5"
        >
          <span class="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            <Terminal class="size-3.5" />
            bash · {{ BENCHMARK.framework }}
          </span>
          <button
            type="button"
            class="inline-flex h-6 cursor-pointer items-center gap-1.5 border border-border bg-background px-2 font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground"
            @click="copyCommand"
          >
            <Check v-if="copied" class="size-3 text-emerald-300" />
            <Copy v-else class="size-3" />
            {{ copied ? '已复制' : '复制' }}
          </button>
        </div>

        <pre
          data-repro-command
          class="overflow-x-auto px-4 py-4 font-mono text-[12px] leading-relaxed text-foreground"
        ><span class="select-none text-muted-foreground/60">$ </span>{{ REPRO.command }}</pre>

        <p class="border-t border-border px-4 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
          <span class="font-mono text-foreground/80">&lt;id&gt;</span>
          取榜单中的模型 id（如 qwen3.8-flash）。
        </p>
      </div>

      <a
        :href="REPRO.repo"
        target="_blank"
        rel="noopener noreferrer"
        data-repro-repo
        class="group flex items-start justify-between gap-3 border border-border bg-card/40 p-4 transition-colors hover:bg-accent/40"
      >
        <span>
          <span class="flex items-center gap-1.5 text-[13px] font-medium text-foreground">
            <Github class="size-3.5" />
            评测仓库
          </span>
          <span class="mt-1 block font-mono text-[10px] text-muted-foreground">
            TYWIM/starlife_eval
          </span>
        </span>
        <ArrowUpRight class="size-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
      </a>
    </div>
  </section>
</template>