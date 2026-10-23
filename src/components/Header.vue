<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { Github, Menu, X } from 'lucide-vue-next';
import { BENCHMARK, REPRO } from '../data/openwsv';

const emit = defineEmits<{
  (e: 'navigate', targetId: string): void;
}>();

interface NavItem {
  id: string;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'leaderboard', label: '主榜' },
  { id: 'protocol', label: '评测协议' },
  { id: 'datasets', label: '数据集' },
  { id: 'repro', label: '复现' },
];

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
      { rootMargin: '-25% 0px -55% 0px', threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] },
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
</script>

<template>
  <header
    ref="headerRef"
    class="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-sm"
  >
    <div
      class="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"
    >
      <!-- Left: brand -->
      <div class="flex min-w-0 items-center gap-3">
        <a href="#top" class="group flex min-w-0 items-center gap-2.5 text-foreground" aria-label="OpenWSV 首页">
          <svg
            class="h-6 w-auto shrink-0 transition-transform duration-200 group-hover:scale-105"
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
          <div class="flex min-w-0 items-baseline gap-2">
            <span
              class="truncate text-[18px] font-semibold leading-none tracking-[-0.02em] text-foreground"
            >
              {{ BENCHMARK.name }}
            </span>
            <span class="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:inline">
              {{ BENCHMARK.short }}
            </span>
          </div>
        </a>
      </div>

      <!-- Center: anchor nav -->
      <nav class="hidden items-center justify-center gap-1 text-sm md:flex md:justify-self-center" aria-label="页面导航">
        <button
          v-for="item in NAV_ITEMS"
          :key="item.id"
          type="button"
          :data-nav-id="item.id"
          class="relative inline-flex h-8 cursor-pointer items-center justify-center rounded-md px-3 transition-colors"
          :class="
            isActive(item.id)
              ? 'bg-accent/50 text-foreground'
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

      <!-- Right: framework chip + repo + mobile toggle -->
      <div class="flex shrink-0 items-center justify-end gap-2 md:justify-self-end">
        <span
          class="hidden h-7 items-center border border-border bg-card px-2 font-mono text-[10px] tracking-wide text-muted-foreground lg:inline-flex"
          title="冻结框架版本"
        >
          {{ BENCHMARK.framework }}
        </span>
        <a
          :href="REPRO.repo"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex h-8 items-center gap-1.5 border border-border bg-background px-2.5 text-foreground transition-colors hover:bg-accent"
          aria-label="TYWIM/starlife_eval on GitHub"
        >
          <Github class="size-3.5 shrink-0" />
          <span class="hidden text-xs font-medium sm:inline">starlife_eval</span>
        </a>
        <button
          type="button"
          class="inline-flex h-8 w-8 cursor-pointer items-center justify-center border border-border bg-background text-foreground transition-colors hover:bg-accent md:hidden"
          :aria-expanded="mobileOpen"
          aria-controls="mobile-nav"
          :aria-label="mobileOpen ? '关闭导航' : '打开导航'"
          @click="mobileOpen = !mobileOpen"
        >
          <X v-if="mobileOpen" class="size-4" />
          <Menu v-else class="size-4" />
        </button>
      </div>
    </div>

    <!-- Mobile panel -->
    <div
      v-if="mobileOpen"
      id="mobile-nav"
      class="absolute inset-x-0 top-full z-50 border-b border-border bg-background shadow-lg md:hidden"
    >
      <nav class="mx-auto max-w-6xl px-4 py-2 sm:px-6" aria-label="移动端导航">
        <button
          v-for="item in NAV_ITEMS"
          :key="`mobile-${item.id}`"
          type="button"
          class="w-full cursor-pointer rounded-md px-3 py-2 text-left text-sm transition-colors"
          :class="
            isActive(item.id)
              ? 'bg-accent/50 font-medium text-foreground'
              : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
          "
          @click="go(item.id)"
        >
          {{ item.label }}
        </button>
        <div class="my-2 border-t border-border" aria-hidden="true" />
        <a
          :href="REPRO.repo"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
          @click="mobileOpen = false"
        >
          <Github class="size-4 shrink-0" />
          <span class="truncate font-mono text-xs">TYWIM/starlife_eval</span>
        </a>
      </nav>
    </div>
  </header>
</template>
