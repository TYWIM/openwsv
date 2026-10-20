<script setup lang="ts">
import { computed } from 'vue';
import { ArrowRight, Info } from 'lucide-vue-next';
import { LEADERBOARD_META, WORLD_MODEL_LAYERS, WORLD_MODEL_SCOPE } from '../data/benchmarkData';

const emit = defineEmits<{
  (e: 'navigate', targetId: string): void;
}>();

/** 基准范围（后端 meta.scope）；缺失则不渲染该块，不写死。 */
const scope = computed(() => LEADERBOARD_META.scope);
const openTo = computed(() => scope.value?.openTo || '');
const testedItems = computed(() => scope.value?.tested ?? []);
const notTestedItems = computed(() => scope.value?.notTested ?? []);
const scopeNote = computed(() => scope.value?.note || '');
</script>

<template>
  <section id="world-model" class="mt-14 sm:mt-16 scroll-mt-20">
    <div class="max-w-5xl mx-auto px-4 sm:px-6">
      <div class="border-t border-border pt-10 sm:pt-12">
        <div class="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          {{ WORLD_MODEL_SCOPE.eyebrow }}
        </div>
        <div class="mt-3 grid grid-cols-1 gap-y-5 gap-x-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <h2 class="text-2xl sm:text-3xl font-medium tracking-tight text-foreground leading-tight">
            {{ WORLD_MODEL_SCOPE.title }}
          </h2>
          <p class="text-sm text-muted-foreground leading-relaxed text-pretty">
            {{ WORLD_MODEL_SCOPE.intro }}
          </p>
        </div>
        <p v-if="openTo" class="mt-3 text-[12px] leading-relaxed text-muted-foreground">
          <span class="font-mono uppercase tracking-wider text-foreground text-[11px]">Open to</span>
          <span class="mx-2 text-border">|</span>{{ openTo }}
        </p>

        <!-- 基准范围（meta.scope）：测什么 / 不测什么 -->
        <div v-if="testedItems.length > 0" class="mt-4 border border-border bg-card px-4 py-3">
          <div class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            测什么 · Tested
          </div>
          <div class="mt-2 flex flex-wrap gap-1.5">
            <span
              v-for="item in testedItems"
              :key="item"
              class="inline-flex items-center border border-border bg-muted/30 px-2 py-0.5 text-[11px] text-foreground"
            >
              {{ item }}
            </span>
          </div>
          <p v-if="scopeNote" class="mt-2.5 text-[11px] leading-relaxed text-muted-foreground">
            {{ scopeNote }}
          </p>
        </div>

        <!-- 6 级阶梯：②～⑥ 高亮，① 置灰（作为给定条件） -->
        <ol class="mt-7 flex flex-col gap-2 lg:flex-row lg:items-stretch">
          <template v-for="(layer, index) in WORLD_MODEL_LAYERS" :key="layer.index">
            <li
              class="flex-1 min-w-0 border p-3 transition-colors"
              :class="
                layer.measured
                  ? 'border-border bg-card'
                  : 'border-dashed border-border bg-muted/20'
              "
            >
              <div class="flex items-center justify-between gap-2">
                <span
                  class="inline-flex size-5 items-center justify-center border font-mono text-[11px] leading-none"
                  :class="
                    layer.measured
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border text-muted-foreground'
                  "
                >
                  {{ layer.index }}
                </span>
                <span
                  v-if="!layer.measured"
                  class="font-mono text-[9px] uppercase tracking-wider text-muted-foreground"
                >
                  given
                </span>
                <span
                  v-else
                  class="size-1.5 rounded-full bg-foreground/70"
                  aria-hidden="true"
                />
              </div>
              <div
                class="mt-2.5 text-[13px] font-medium leading-tight"
                :class="layer.measured ? 'text-foreground' : 'text-muted-foreground'"
              >
                {{ layer.title }}
              </div>
              <div class="mt-1 text-[11px] leading-snug text-muted-foreground">
                {{ layer.description }}
              </div>
              <div v-if="!layer.measured" class="mt-2 text-[10px] font-mono text-muted-foreground">
                {{ WORLD_MODEL_SCOPE.givenLabel }}
              </div>
              <div v-else class="mt-2 text-[10px] font-mono text-foreground/70">
                {{ WORLD_MODEL_SCOPE.measuredLabel }}
              </div>
            </li>
            <li
              v-if="index < WORLD_MODEL_LAYERS.length - 1"
              class="hidden lg:flex items-center justify-center px-0.5 text-muted-foreground/60"
              aria-hidden="true"
            >
              <ArrowRight class="size-3.5" />
            </li>
          </template>
        </ol>

        <div class="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
          <div class="border-l-2 border-foreground/70 bg-muted/20 px-4 py-3">
            <p class="text-[13px] leading-relaxed text-foreground/90 text-pretty">
              {{ WORLD_MODEL_SCOPE.focus }}
            </p>
          </div>
          <div class="border border-border bg-card px-4 py-3">
            <div class="flex items-start gap-2">
              <Info class="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              <div class="text-[12px] leading-relaxed text-muted-foreground text-pretty">
                <div class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  不测什么 · Not tested
                </div>
                <p class="mt-1">{{ WORLD_MODEL_SCOPE.notTested }}</p>
                <ul v-if="notTestedItems.length > 0" class="mt-2 space-y-1">
                  <li v-for="item in notTestedItems" :key="item" class="flex gap-1.5">
                    <span class="text-muted-foreground/60" aria-hidden="true">·</span>
                    <span>{{ item }}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-5">
          <button
            type="button"
            class="inline-flex h-8 items-center gap-1.5 border border-border bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-accent cursor-pointer"
            @click="emit('navigate', 'leaderboard')"
          >
            <span>查看综合分榜单</span>
            <ArrowRight class="size-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
