<script setup lang="ts">
import { TaskExample } from '../data/benchmarkData';
import { X, ShieldCheck, AlertTriangle } from 'lucide-vue-next';

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
            Task Formulation & Physical Objective
          </div>
          <p class="text-foreground/90 leading-relaxed">{{ task.description }}</p>
        </div>

        
        <div class="border border-border bg-secondary/50 p-3.5 space-y-2 font-mono text-xs">
          <div class="flex items-center gap-2 text-foreground font-semibold">
            <ShieldCheck class="size-4 text-foreground" />
            <span>Deterministic Program Verifier</span>
          </div>
          <div class="text-muted-foreground">
            Verification Engine: <span class="text-foreground">{{ task.groundTruthType }}</span>
          </div>
          <div class="text-muted-foreground">
            Criterion: <span class="text-foreground">{{ task.keyVerification }}</span>
          </div>
        </div>

        
        <div>
          <div class="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-1">
            Harness Instruction & Prompt
          </div>
          <div class="border border-border bg-muted/20 p-3 font-mono text-xs text-foreground leading-relaxed whitespace-pre-wrap select-all">
            {{ task.samplePrompt }}
          </div>
        </div>

        
        <div class="pt-2">
          <div class="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">
            Common Frontier Agent Failure Modes
          </div>
          <div class="space-y-1.5 text-xs text-muted-foreground">
            <div class="flex items-start gap-2">
              <AlertTriangle class="size-3.5 text-amber-500 shrink-0 mt-0.5" />
              <span><strong class="text-foreground">2D Pixel Projection Confusion:</strong> Models mistake 2D overlapping contours for physical proximity in 3D Euclidean space.</span>
            </div>
            <div class="flex items-start gap-2">
              <AlertTriangle class="size-3.5 text-amber-500 shrink-0 mt-0.5" />
              <span><strong class="text-foreground">Viewpoint Inversion:</strong> Left-right relations hallucinate inversion during 180° camera coordinate transformations.</span>
            </div>
          </div>
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
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          class="px-4 py-2 text-xs font-medium bg-foreground text-background hover:opacity-90 transition-opacity"
        >
          Inspect Verifier Code
        </a>
      </div>
    </div>
  </div>
</template>
