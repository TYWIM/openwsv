<script setup lang="ts">
import { ref, computed } from 'vue';
import { ModelResult } from '../data/benchmarkData';
import { Search, ChevronDown, Check, SlidersHorizontal, ArrowUpDown } from 'lucide-vue-next';

const props = defineProps<{
  allModels: ModelResult[];
  activeVersion: 'v1.1' | 'v1.0';
  bestOnly: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:activeVersion', version: 'v1.1' | 'v1.0'): void;
  (e: 'update:bestOnly', best: boolean): void;
}>();

const searchQuery = ref('');
const selectedProvider = ref('All');
const sortField = ref<keyof ModelResult>('score');
const sortAsc = ref(false);
const showModelsPopover = ref(false);

const providers = ['All', 'StarLife AI', 'Google', 'OpenAI', 'Anthropic', 'Qwen', 'DeepSeek', 'Mistral', 'Meta', 'Community'];

const filteredModels = computed(() => {
  return props.allModels.filter((m) => {
    if (m.version !== props.activeVersion) return false;
    if (props.bestOnly && !m.isBest) return false;
    if (selectedProvider.value !== 'All' && m.provider !== selectedProvider.value) return false;
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase();
      return (
        m.name.toLowerCase().includes(q) ||
        m.provider.toLowerCase().includes(q) ||
        m.mode.toLowerCase().includes(q)
      );
    }
    return true;
  });
});

const sortedModels = computed(() => {
  return [...filteredModels.value].sort((a, b) => {
    const valA = a[sortField.value];
    const valB = b[sortField.value];
    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortAsc.value ? valA - valB : valB - valA;
    }
    return 0;
  });
});

const handleSort = (field: keyof ModelResult) => {
  if (sortField.value === field) {
    sortAsc.value = !sortAsc.value;
  } else {
    sortField.value = field;
    sortAsc.value = false;
  }
};
</script>

<template>
  <div class="space-y-4">
    <!-- Bottom Controls Row (Matching DeepSWE: v1.1/v1, Best/All, Models (X/Y)) -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex flex-wrap items-center gap-2.5">
        <!-- Version Segmented Control -->
        <div class="inline-flex h-7 items-center border border-border text-xs">
          <button
            type="button"
            @click="emit('update:activeVersion', 'v1.1')"
            :aria-pressed="activeVersion === 'v1.1'"
            class="inline-flex h-full items-center justify-center px-2.5 outline-none transition-colors cursor-pointer"
            :class="activeVersion === 'v1.1' ? 'bg-foreground text-background font-medium' : 'text-muted-foreground hover:bg-accent hover:text-foreground'"
          >
            v1.1
          </button>
          <button
            type="button"
            @click="emit('update:activeVersion', 'v1.0')"
            :aria-pressed="activeVersion === 'v1.0'"
            class="inline-flex h-full items-center justify-center px-2.5 outline-none transition-colors border-l border-border cursor-pointer"
            :class="activeVersion === 'v1.0' ? 'bg-foreground text-background font-medium' : 'text-muted-foreground hover:bg-accent hover:text-foreground'"
          >
            v1
          </button>
        </div>

        <!-- Best / All effort levels Toggle -->
        <div class="inline-flex h-7 items-center border border-border text-xs">
          <button
            type="button"
            @click="emit('update:bestOnly', true)"
            :aria-pressed="bestOnly"
            class="inline-flex h-full items-center justify-center px-2.5 outline-none transition-colors cursor-pointer"
            :class="bestOnly ? 'bg-foreground text-background font-medium' : 'text-muted-foreground hover:bg-accent hover:text-foreground'"
          >
            Best
          </button>
          <button
            type="button"
            @click="emit('update:bestOnly', false)"
            :aria-pressed="!bestOnly"
            class="inline-flex h-full items-center justify-center px-2.5 outline-none transition-colors border-l border-border cursor-pointer"
            :class="!bestOnly ? 'bg-foreground text-background font-medium' : 'text-muted-foreground hover:bg-accent hover:text-foreground'"
          >
            All effort levels
          </button>
        </div>

        <!-- Models (X/Y) Popover Trigger -->
        <div class="relative">
          <button
            type="button"
            @click="showModelsPopover = !showModelsPopover"
            class="inline-flex h-7 items-center justify-center gap-1.5 border border-border bg-background px-2.5 text-xs text-foreground hover:bg-accent cursor-pointer"
          >
            <SlidersHorizontal class="size-3 text-muted-foreground" />
            <span>Models</span>
            <span class="tabular-nums text-muted-foreground">
              ({{ sortedModels.length }}/{{ allModels.filter((m) => m.version === activeVersion).length }})
            </span>
            <ChevronDown class="size-3 text-muted-foreground" />
          </button>

          <div
            v-if="showModelsPopover"
            class="absolute left-0 top-8 z-30 w-56 border border-border bg-popover p-3 shadow-md text-xs font-mono"
          >
            <div class="font-semibold text-foreground mb-2">Filter Providers</div>
            <div class="space-y-1">
              <button
                v-for="p in providers"
                :key="p"
                type="button"
                @click="selectedProvider = p; showModelsPopover = false"
                class="w-full flex items-center justify-between px-2 py-1 hover:bg-accent text-left cursor-pointer"
              >
                <span :class="selectedProvider === p ? 'text-foreground font-semibold' : 'text-muted-foreground'">
                  {{ p }}
                </span>
                <Check v-if="selectedProvider === p" class="size-3 text-foreground" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Search Input -->
      <div class="flex items-center gap-2">
        <div class="relative w-full sm:w-60">
          <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search model, provider..."
            class="h-7 w-full border border-border bg-background pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors font-mono"
          />
        </div>
      </div>
    </div>

    <!-- Provider Filter Badges -->
    <div class="flex flex-wrap items-center gap-1.5 text-xs">
      <span class="font-mono text-muted-foreground text-[11px] mr-1">Provider:</span>
      <button
        v-for="p in providers"
        :key="p"
        type="button"
        @click="selectedProvider = p"
        class="px-2 py-0.5 border text-[11px] transition-colors cursor-pointer"
        :class="selectedProvider === p ? 'border-foreground bg-foreground text-background font-medium' : 'border-border bg-background text-muted-foreground hover:text-foreground hover:bg-accent'"
      >
        {{ p }}
      </button>
    </div>

    <!-- Accessible Responsive Table Container -->
    <div
      tabindex="0"
      role="region"
      aria-label="OpenWSV Multimodal Leaderboard Table"
      class="w-full overflow-x-auto border border-border bg-card"
    >
      <table class="w-full text-left text-xs border-collapse">
        <thead>
          <tr class="border-b border-border bg-muted/20 text-muted-foreground font-mono">
            <th class="py-2.5 pl-4 pr-2 w-12 text-center">#</th>
            <th class="py-2.5 px-3 min-w-[200px]">
              <button
                type="button"
                @click="handleSort('name')"
                class="flex items-center gap-1 hover:text-foreground cursor-pointer font-medium"
              >
                Model
                <ArrowUpDown class="size-3" />
              </button>
            </th>
            <th class="py-2.5 px-3 min-w-[260px]">
              <button
                type="button"
                @click="handleSort('score')"
                class="flex items-center gap-1 hover:text-foreground cursor-pointer font-medium"
              >
                Pass@1 (± Confidence)
                <ArrowUpDown class="size-3" />
              </button>
            </th>
            <th class="py-2.5 px-3 hidden md:table-cell text-right">
              <button
                type="button"
                @click="handleSort('topologyF1')"
                class="inline-flex items-center gap-1 hover:text-foreground cursor-pointer font-medium"
              >
                Topology F1
                <ArrowUpDown class="size-3" />
              </button>
            </th>
            <th class="py-2.5 px-3 hidden lg:table-cell text-right">
              <button
                type="button"
                @click="handleSort('affordanceAcc')"
                class="inline-flex items-center gap-1 hover:text-foreground cursor-pointer font-medium"
              >
                Affordance
                <ArrowUpDown class="size-3" />
              </button>
            </th>
            <th class="py-2.5 px-3 hidden lg:table-cell text-right">
              <button
                type="button"
                @click="handleSort('stateTransitionAcc')"
                class="inline-flex items-center gap-1 hover:text-foreground cursor-pointer font-medium"
              >
                State Dynamics
                <ArrowUpDown class="size-3" />
              </button>
            </th>
            <th class="py-2.5 pr-4 pl-3 text-right">
              <button
                type="button"
                @click="handleSort('cost')"
                class="inline-flex items-center gap-1 hover:text-foreground cursor-pointer font-medium"
              >
                Avg Cost / Steps
                <ArrowUpDown class="size-3" />
              </button>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border/60">
          <tr
            v-for="(m, index) in sortedModels"
            :key="m.id"
            class="hover:bg-accent/40 transition-colors group"
          >
            <!-- Rank -->
            <td class="py-3 pl-4 pr-2 text-center font-mono tabular-nums text-muted-foreground font-medium">
              {{ index + 1 }}
            </td>

            <!-- Model Name & Mode -->
            <td class="py-3 px-3">
              <div class="flex items-center gap-2">
                <span
                  class="size-2 rounded-full shrink-0"
                  :style="{ backgroundColor: m.providerColor }"
                  aria-hidden="true"
                />
                <span class="font-medium text-foreground truncate">
                  {{ m.name }}
                </span>
                <span class="text-[10px] font-mono text-muted-foreground shrink-0 uppercase tracking-wider">
                  [{{ m.mode }}]
                </span>
              </div>

              <!-- Mobile Subline -->
              <div class="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-mono text-muted-foreground md:hidden">
                <span>Topo: <strong class="text-foreground">{{ m.topologyF1 }}%</strong></span>
                <span>·</span>
                <span>Afford: <strong class="text-foreground">{{ m.affordanceAcc }}%</strong></span>
                <span>·</span>
                <span>${{ m.cost.toFixed(2) }}</span>
              </div>
            </td>

            <!-- Pass@1 Score & Confidence Whisker Bar -->
            <td class="py-3 px-3">
              <div class="flex items-center gap-3">
                <div class="w-20 shrink-0 font-mono tabular-nums">
                  <span class="font-semibold text-foreground text-[13px]">{{ m.score }}%</span>
                  <span class="ml-1 text-[11px] text-muted-foreground">±{{ m.confidence }}%</span>
                </div>

                <!-- Score Bar Container -->
                <div class="relative flex-1 h-4 bg-muted/30">
                  <!-- Score Fill -->
                  <div
                    class="h-full transition-all duration-300"
                    :style="{
                      width: `${Math.min(100, Math.max(0, m.score))}%`,
                      backgroundColor: m.providerColor,
                      opacity: 0.85,
                    }"
                  />

                  <!-- Confidence Interval Whisker Line -->
                  <div
                    class="absolute h-px bg-foreground top-1/2 -translate-y-1/2 pointer-events-none"
                    :style="{
                      left: `${Math.max(0, m.score - m.confidence)}%`,
                      width: `${Math.min(100, m.score + m.confidence) - Math.max(0, m.score - m.confidence)}%`,
                    }"
                  />
                  <!-- Left Whisker Cap -->
                  <div
                    class="absolute w-px h-2.5 bg-foreground top-1/2 -translate-y-1/2 pointer-events-none"
                    :style="{ left: `${Math.max(0, m.score - m.confidence)}%` }"
                  />
                  <!-- Right Whisker Cap -->
                  <div
                    class="absolute w-px h-2.5 bg-foreground top-1/2 -translate-y-1/2 pointer-events-none"
                    :style="{ left: `${Math.min(100, m.score + m.confidence)}%` }"
                  />
                </div>
              </div>
            </td>

            <!-- Topology F1 -->
            <td class="py-3 px-3 hidden md:table-cell text-right font-mono tabular-nums text-foreground">
              {{ m.topologyF1 }}%
            </td>

            <!-- Affordance -->
            <td class="py-3 px-3 hidden lg:table-cell text-right font-mono tabular-nums text-foreground">
              {{ m.affordanceAcc }}%
            </td>

            <!-- State Dynamics -->
            <td class="py-3 px-3 hidden lg:table-cell text-right font-mono tabular-nums text-foreground">
              {{ m.stateTransitionAcc }}%
            </td>

            <!-- Cost / Latency -->
            <td class="py-3 pr-4 pl-3 text-right font-mono tabular-nums text-muted-foreground">
              <div class="text-foreground">${{ m.cost.toFixed(2) }}</div>
              <div class="text-[10px] text-muted-foreground">{{ m.tokens }} · {{ m.latency }}ms</div>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="sortedModels.length === 0" class="p-8 text-center text-muted-foreground text-sm font-mono">
        No models found matching the selected filter criteria.
      </div>
    </div>

    <!-- Explanatory Caption -->
    <p class="text-[12px] leading-relaxed text-muted-foreground">
      All models evaluated on identical multimodal calibration matrices with program-based verifiers. Error bars represent 95% bootstrap confidence intervals.
    </p>
  </div>
</template>
