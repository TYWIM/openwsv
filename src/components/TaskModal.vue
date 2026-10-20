<script setup lang="ts">
import type { TaskExample } from '../data/benchmarkData';
import { X, ShieldCheck, ListChecks, Terminal } from 'lucide-vue-next';

defineProps<{
  task: TaskExample | null;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();
</script>

<template>
  <div
    v-if="task"
    role="dialog"
    aria-modal="true"
    aria-labelledby="modal-task-title"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs"
  >
    <div class="relative w-full max-w-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
      <button
        type="button"
        @click="emit('close')"
        class="absolute right-4 top-4 p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        aria-label="Close dialog"
      >
        <X class="size-5" />
      </button>

      <div class="flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">
        <span>{{ task.modality }}</span>
        <span>·</span>
        <span>{{ task.sceneType }}</span>
        <span>·</span>
        <span class="text-foreground font-semibold">[{{ task.difficulty }}]</span>
      </div>

      <h2 id="modal-task-title" class="text-xl sm:text-2xl font-medium tracking-tight text-foreground pr-8">
        {{ task.title }}
      </h2>
      <p class="mt-1 font-mono text-xs text-muted-foreground">{{ task.repoOrDomain }}</p>

      <div class="mt-4 pt-4 border-t border-border/70 space-y-4 text-sm">
        <div>
          <div class="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">
            Task formulation
          </div>
          <p class="text-foreground/90 leading-relaxed">{{ task.description }}</p>
        </div>

        <div class="border border-border bg-secondary/50 p-3.5 space-y-2 font-mono text-xs">
          <div class="flex items-center gap-2 text-foreground font-semibold">
            <ShieldCheck class="size-4 text-foreground" />
            <span>Ground truth &amp; scoring</span>
          </div>
          <div class="text-muted-foreground">
            Ground truth: <span class="text-foreground">{{ task.groundTruthType }}</span>
          </div>
          <div class="text-muted-foreground">
            Metric: <span class="text-foreground">{{ task.keyVerification }}</span>
          </div>
        </div>

        <div>
          <div class="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">
            <Terminal class="size-3.5" />
            <span>Model input / output contract</span>
          </div>
          <div class="border border-border bg-muted/20 p-3 font-mono text-xs text-foreground leading-relaxed whitespace-pre-wrap select-all">
            {{ task.samplePrompt }}
          </div>
        </div>

        <div class="flex items-start gap-2 text-xs text-muted-foreground">
          <ListChecks class="size-3.5 text-foreground shrink-0 mt-0.5" />
          <span>
            Local heads consume cached backbone features from
            <span class="font-mono text-foreground">spatial_v2.npz</span>; cloud baselines consume the two RGB
            frames through the same prompt contract. Scores are computed by starlife_eval — never entered manually.
          </span>
        </div>
      </div>

      <div class="mt-6 pt-4 border-t border-border flex items-center justify-end gap-3">
        <button
          type="button"
          @click="emit('close')"
          class="px-4 py-2 text-xs font-medium border border-border hover:bg-accent text-foreground transition-colors cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>
