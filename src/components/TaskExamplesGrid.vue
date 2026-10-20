<script setup lang="ts">
import { ref } from 'vue';
import { TASK_EXAMPLES, type TaskExample } from '../data/benchmarkData';
import TaskModal from './TaskModal.vue';
import { ArrowUpRight } from 'lucide-vue-next';

const activeTask = ref<TaskExample | null>(null);
</script>

<template>
  <section id="tasks" class="mt-16 sm:mt-24 scroll-mt-20">
    <div class="flex items-baseline justify-between mb-5">
      <h2 class="text-xl sm:text-2xl font-medium tracking-tight text-foreground">
        Judgement Tasks
      </h2>
      <span class="text-xs font-mono text-muted-foreground">
        Showing {{ TASK_EXAMPLES.length }} / {{ TASK_EXAMPLES.length }} head outputs
      </span>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <button
        v-for="task in TASK_EXAMPLES"
        :key="task.id"
        type="button"
        @click="activeTask = task"
        class="group flex flex-col text-left border border-border bg-card hover:border-foreground/50 transition-colors p-4 cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <div class="flex items-start justify-between gap-2">
          <h3 class="text-[15px] font-medium leading-snug text-foreground group-hover:text-foreground line-clamp-1">
            {{ task.title }}
          </h3>
          <ArrowUpRight class="size-3.5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
        </div>

        <p class="mt-1.5 text-[13px] leading-snug text-muted-foreground line-clamp-3 text-pretty">
          {{ task.description }}
        </p>

        <div class="mt-auto pt-4 flex items-center justify-between gap-3 text-[11px] text-muted-foreground border-t border-border/40">
          <span class="font-mono truncate">{{ task.repoOrDomain }}</span>
          <span class="uppercase tracking-[0.12em] shrink-0 font-mono text-foreground/80 font-medium">
            {{ task.modality }}
          </span>
        </div>
      </button>
    </div>

    <!-- Task Inspection Modal -->
    <TaskModal :task="activeTask" @close="activeTask = null" />
  </section>
</template>
