<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Sun, Moon, Github } from 'lucide-vue-next';
import { BENCHMARK_TITLE } from '../data/benchmarkData';

const emit = defineEmits<{
  (e: 'navigate', targetId: string): void;
}>();

const currentTheme = ref<'dark' | 'light'>('dark');
const THEME_KEY = 'starlife_theme';

onMounted(() => {
  const isDark = document.documentElement.classList.contains('dark');
  currentTheme.value = isDark ? 'dark' : 'light';
});

const toggleTheme = () => {
  const nextTheme = currentTheme.value === 'dark' ? 'light' : 'dark';
  currentTheme.value = nextTheme;
  try {
    localStorage.setItem(THEME_KEY, nextTheme);
    const meta = document.querySelector('meta[name="color-scheme"]');
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
      if (meta) meta.setAttribute('content', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      if (meta) meta.setAttribute('content', 'light');
    }
  } catch (e) {
    console.error(e);
  }
};
</script>

<template>
  <header class="border-b border-border bg-background sticky top-0 z-40 transition-colors">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
      <div class="flex items-center shrink-0 gap-3">
        <a
          href="/"
          class="flex items-center gap-2.5 text-foreground group"
          aria-label="空间理解与关系推理基准 Home"
        >
          <svg
            class="h-6 w-auto text-foreground shrink-0 transition-transform duration-200 group-hover:scale-105"
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
            <circle cx="16" cy="16" r="2.5" fill="currentColor" />
          </svg>
          <div class="flex items-baseline gap-1.5">
            <span class="text-lg sm:text-[20px] font-semibold tracking-[-0.02em] leading-none text-foreground">
              {{ BENCHMARK_TITLE }}
            </span>
            <span class="hidden sm:inline-block text-xs font-mono tracking-widest text-muted-foreground uppercase">
              / Benchmark
            </span>
          </div>
        </a>
        <span class="h-4 w-px bg-border ml-1 hidden sm:block" aria-hidden="true" />
        <span class="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono tracking-wider bg-secondary text-secondary-foreground border border-border">
          OPEN TO ANY VLM
        </span>
      </div>

      <nav class="hidden md:flex items-center gap-1 text-sm min-w-0" aria-label="Main Navigation">
        <button
          type="button"
          @click="emit('navigate', 'leaderboard')"
          class="px-3 h-8 inline-flex items-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          Leaderboard
        </button>
        <button
          type="button"
          @click="emit('navigate', 'tasks')"
          class="px-3 h-8 inline-flex items-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          Judgement Tasks
        </button>
        <button
          type="button"
          @click="emit('navigate', 'methodology')"
          class="px-3 h-8 inline-flex items-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          Methodology
        </button>
        <button
          type="button"
          @click="emit('navigate', 'protocol')"
          class="px-3 h-8 inline-flex items-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          Protocol
        </button>
      </nav>

      <div class="flex items-center gap-2">
        <a
          href="https://github.com/TYWIM/openwsv"
          target="_blank"
          rel="noopener noreferrer"
          class="h-8 px-2.5 inline-flex items-center gap-1.5 text-xs font-medium border border-border bg-background hover:bg-accent hover:text-foreground transition-colors"
          aria-label="Upstream openwsv repository (UI source)"
        >
          <Github class="size-3.5" />
          <span class="hidden sm:inline">Upstream UI</span>
        </a>

        <button
          type="button"
          @click="toggleTheme"
          class="h-8 w-8 inline-flex items-center justify-center border border-border bg-background hover:bg-accent text-foreground transition-colors cursor-pointer"
          :aria-label="`Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} mode`"
        >
          <Sun v-if="currentTheme === 'dark'" class="size-4 text-foreground transition-transform hover:rotate-45" />
          <Moon v-else class="size-4 text-foreground transition-transform hover:-rotate-12" />
        </button>
      </div>
    </div>
  </header>
</template>
