<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { Sun, Moon, Github, Menu, X } from 'lucide-vue-next';
import { BENCHMARK_TITLE } from '../data/benchmarkData';

const emit = defineEmits<{
  (e: 'navigate', targetId: string): void;
}>();

interface NavItem {
  id: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'leaderboard', label: 'Leaderboard' },
  { id: 'tasks', label: 'Judgement Tasks' },
  { id: 'methodology', label: 'Methodology' },
  { id: 'protocol', label: 'Protocol' },
];

const REPO_URL = 'https://github.com/umr-xiaomai/openwsv';
const THEME_KEY = 'starlife_theme';

const currentTheme = ref<'dark' | 'light'>('dark');
const activeSection = ref<string | null>(null);
const mobileOpen = ref(false);
const headerRef = ref<HTMLElement | null>(null);

let observer: IntersectionObserver | null = null;
const ratios = new Map<string, number>();

const isActive = (id: string): boolean => activeSection.value === id;

const go = (id: string) => {
  activeSection.value = id;
  mobileOpen.value = false;
  emit('navigate', id);
};

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') mobileOpen.value = false;
};

const onPointerDown = (event: PointerEvent) => {
  if (!mobileOpen.value) return;
  const target = event.target as Node | null;
  if (headerRef.value && target && !headerRef.value.contains(target)) {
    mobileOpen.value = false;
  }
};

onMounted(() => {
  const isDark = document.documentElement.classList.contains('dark');
  currentTheme.value = isDark ? 'dark' : 'light';

  if (typeof IntersectionObserver !== 'undefined') {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratios.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
        }
        let nextActive: string | null = null;
        let maxRatio = 0;
        for (const item of NAV_ITEMS) {
          const ratio = ratios.get(item.id) ?? 0;
          if (ratio > maxRatio) {
            maxRatio = ratio;
            nextActive = item.id;
          }
        }
        activeSection.value = maxRatio > 0 ? nextActive : null;
      },
      {
        rootMargin: '-25% 0px -55% 0px',
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      },
    );
    for (const item of NAV_ITEMS) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }
  }

  document.addEventListener('keydown', onKeydown);
  document.addEventListener('pointerdown', onPointerDown);
});

onBeforeUnmount(() => {
  observer?.disconnect();
  observer = null;
  document.removeEventListener('keydown', onKeydown);
  document.removeEventListener('pointerdown', onPointerDown);
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
  <header
    ref="headerRef"
    class="border-b border-border bg-background sticky top-0 z-40 transition-colors"
  >
    <div
      class="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4 md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"
    >
      <!-- Left: logo + title (truncated below 1024px) -->
      <div class="flex items-center min-w-0 gap-3 md:min-w-0">
        <a
          href="/"
          class="flex items-center gap-2.5 min-w-0 text-foreground group"
          aria-label="Spatial & Relational Understanding Benchmark home"
        >
          <svg
            class="h-6 w-auto shrink-0 text-foreground transition-transform duration-200 group-hover:scale-105"
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
          <div class="flex items-baseline gap-1.5 min-w-0">
            <span class="truncate text-base sm:text-[20px] font-semibold tracking-[-0.02em] leading-none text-foreground">
              {{ BENCHMARK_TITLE }}
            </span>
            <span class="hidden xl:inline-block text-xs font-mono tracking-widest text-muted-foreground uppercase">
              / Benchmark
            </span>
          </div>
        </a>
      </div>

      <!-- Center: desktop navigation with scroll-spy underline -->
      <nav
        class="hidden md:flex items-center justify-center gap-1 text-sm md:justify-self-center"
        aria-label="Main Navigation"
      >
        <button
          v-for="item in NAV_ITEMS"
          :key="item.id"
          type="button"
          data-nav-item
          :data-nav-id="item.id"
          class="relative h-8 px-3 inline-flex items-center justify-center rounded-md transition-colors cursor-pointer"
          :class="
            isActive(item.id)
              ? 'bg-accent/40 text-foreground'
              : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
          "
          :aria-current="isActive(item.id) ? 'true' : undefined"
          @click="go(item.id)"
        >
          {{ item.label }}
          <span
            v-if="isActive(item.id)"
            class="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-foreground"
            aria-hidden="true"
          />
        </button>
      </nav>

      <!-- Right: GitHub, mobile menu toggle, theme toggle -->
      <div class="flex items-center justify-end gap-2 shrink-0 md:justify-self-end">
        <a
          :href="REPO_URL"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="umr-xiaomai/openwsv on GitHub"
          data-repo-link
          class="h-8 px-2.5 inline-flex items-center gap-1.5 border border-border bg-background text-foreground hover:bg-accent transition-colors whitespace-nowrap"
        >
          <Github class="size-3.5 shrink-0" />
          <span class="hidden sm:inline text-xs font-medium">openwsv</span>
        </a>

        <button
          type="button"
          data-mobile-menu-toggle
          class="md:hidden h-8 w-8 inline-flex items-center justify-center border border-border bg-background text-foreground transition-colors hover:bg-accent cursor-pointer"
          :aria-expanded="mobileOpen"
          aria-controls="mobile-nav"
          :aria-label="mobileOpen ? 'Close navigation menu' : 'Open navigation menu'"
          @click="mobileOpen = !mobileOpen"
        >
          <X v-if="mobileOpen" class="size-4" />
          <Menu v-else class="size-4" />
        </button>

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

    <!-- Mobile panel: nav items + repository link -->
    <div
      v-if="mobileOpen"
      id="mobile-nav"
      class="md:hidden absolute inset-x-0 top-full z-50 border-b border-border bg-background shadow-lg"
    >
      <nav class="max-w-6xl mx-auto px-4 sm:px-6 py-2" aria-label="Mobile Navigation">
        <button
          v-for="item in NAV_ITEMS"
          :key="`mobile-${item.id}`"
          type="button"
          class="w-full text-left px-3 py-2 rounded-md text-sm transition-colors cursor-pointer"
          :class="
            isActive(item.id)
              ? 'bg-accent/40 text-foreground font-medium'
              : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
          "
          @click="go(item.id)"
        >
          {{ item.label }}
        </button>

        <div class="my-2 border-t border-border" aria-hidden="true" />

        <a
          :href="REPO_URL"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="umr-xiaomai/openwsv on GitHub"
          class="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent/60 hover:text-foreground transition-colors"
          @click="mobileOpen = false"
        >
          <Github class="size-4 shrink-0" />
          <span class="truncate text-xs font-medium">openwsv</span>
        </a>
      </nav>
    </div>
  </header>
</template>
