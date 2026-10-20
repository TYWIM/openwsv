<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  fmtCost,
  fmtLatency,
  fmtMetricValue,
  fmtPct,
  fmtTokens,
  type LeaderboardMeta,
  type ModelMetrics,
  type ModelResult,
} from '../data/benchmarkData';
import { ArrowUpDown, ChevronDown, Search } from 'lucide-vue-next';

const props = defineProps<{
  allModels: ModelResult[];
  activeVersion: string;
  versions: string[];
  meta: LeaderboardMeta;
}>();

const emit = defineEmits<{
  (e: 'update:activeVersion', version: string): void;
}>();

const searchQuery = ref('');
const selectedProvider = ref('All');
const sortField = ref<SortField>('score');
const sortAsc = ref(false);
const expandedId = ref<string | null>(null);

type SortField = 'name' | 'score' | 'topologyF1' | 'affordanceAcc' | 'stateTransitionAcc' | 'cost' | 'latency';

const providers = computed(() => {
  const set = new Set(props.allModels.map((m) => m.provider));
  return ['All', ...Array.from(set)];
});

const filteredModels = computed(() =>
  props.allModels.filter((m) => {
    if (m.version !== props.activeVersion) return false;
    if (selectedProvider.value !== 'All' && m.provider !== selectedProvider.value) return false;
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.trim().toLowerCase();
      return (
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        m.provider.toLowerCase().includes(q) ||
        m.mode.toLowerCase().includes(q)
      );
    }
    return true;
  }),
);

const sortValue = (model: ModelResult, field: SortField): number | string | null => {
  if (field === 'name') return model.name;
  return model[field];
};

const sortedModels = computed(() =>
  [...filteredModels.value].sort((a, b) => {
    const aVal = sortValue(a, sortField.value);
    const bVal = sortValue(b, sortField.value);
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortAsc.value ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    const aNum = typeof aVal === 'number' && Number.isFinite(aVal) ? aVal : null;
    const bNum = typeof bVal === 'number' && Number.isFinite(bVal) ? bVal : null;
    // null（未测量）永远排在最后，不参与升降序
    if (aNum == null && bNum == null) return 0;
    if (aNum == null) return 1;
    if (bNum == null) return -1;
    return sortAsc.value ? aNum - bNum : bNum - aNum;
  }),
);

const handleSort = (field: SortField) => {
  if (sortField.value === field) {
    sortAsc.value = !sortAsc.value;
  } else {
    sortField.value = field;
    sortAsc.value = false;
  }
};

const hasMetrics = (model: ModelResult): boolean =>
  model.metrics != null && Object.keys(model.metrics).length > 0;

const toggleRow = (model: ModelResult) => {
  if (!hasMetrics(model)) return;
  expandedId.value = expandedId.value === model.id ? null : model.id;
};

const SECTION_TITLES: Record<string, string> = {
  head: 'Head-level · test split',
  pair: '60-pair cloud protocol',
  event: 'Event-level',
  state: 'World-state replay',
};

const METRIC_LABELS: Record<string, string> = {
  change_top1: 'Change top-1',
  change_macro_f1: 'Change macro-F1',
  change_slots: 'Change slots',
  type_top1: 'Type top-1',
  type_macro_f1: 'Type macro-F1',
  relation_top1: 'Relation top-1',
  relation_macro_f1: 'Relation macro-F1',
  relation_pairs: 'Relation pairs',
  relation_type_acc: 'Relation type acc',
  rel_pos_top1: 'Rel-pos top-1',
  rel_pos_macro_f1: 'Rel-pos macro-F1',
  rel_pos_acc: 'Rel-pos acc',
  attrs: 'Affordance (mean)',
  attrs_acc: 'Attrs acc',
  attrs_contact_f1: 'Attrs · contact F1',
  attrs_support_f1: 'Attrs · support F1',
  macro_f1: 'Event macro-F1',
  macro_f1_common: 'Event macro-F1 (common kinds)',
  common_kinds: 'Common kinds',
  available_kinds: 'Available kinds',
  matched_total: 'Matched events',
  objects: 'Objects',
  types: 'Types',
  changes: 'Changes',
  relations: 'Relations',
  state_acc: 'State accuracy',
  value: 'Value',
  n_pairs: 'Pairs',
};

const NA_LABELS: Record<string, string> = {
  score: 'Score',
  topologyF1: 'Topology F1',
  affordanceAcc: 'Affordance',
  stateTransitionAcc: 'State dynamics',
  cost: 'Cost',
  tokens: 'Tokens',
  latency: 'Latency',
  head_metrics: 'Head-level metrics',
  type: 'Type head',
  'state.types': 'State · types',
};

interface MetricGroup {
  key: string;
  title: string;
  entries: Array<{ key: string; label: string; value: string }>;
}

const metricGroups = (model: ModelResult): MetricGroup[] => {
  const metrics: ModelMetrics | null = model.metrics;
  if (!metrics) return [];
  const groups: MetricGroup[] = [];
  for (const [section, values] of Object.entries(metrics)) {
    if (!values) continue;
    const entries = Object.entries(values).map(([key, value]) => ({
      key,
      label: METRIC_LABELS[key] ?? key,
      value: fmtMetricValue(value),
    }));
    if (entries.length === 0) continue;
    groups.push({
      key: section,
      title: SECTION_TITLES[section] ?? section,
      entries,
    });
  }
  return groups;
};

const naEntries = (model: ModelResult): Array<{ key: string; label: string; reason: string }> =>
  Object.entries(model.na).map(([key, reason]) => ({
    key,
    label: NA_LABELS[key] ?? key,
    reason,
  }));
</script>

<template>
  <div class="space-y-4">
    <!-- 控制行 -->
    <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex flex-wrap items-center gap-2.5">
        <!-- 版本切换：仅当数据里存在多版本 -->
        <div v-if="versions.length > 1" class="inline-flex h-7 items-center border border-border text-xs">
          <button
            v-for="(version, index) in versions"
            :key="version"
            type="button"
            @click="emit('update:activeVersion', version)"
            :aria-pressed="activeVersion === version"
            :class="[
              'inline-flex h-full items-center justify-center px-2.5 outline-none transition-colors cursor-pointer',
              index > 0 ? 'border-l border-border' : '',
              activeVersion === version
                ? 'bg-foreground text-background font-medium'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            ]"
          >
            {{ version }}
          </button>
        </div>

        <span class="text-xs font-mono text-muted-foreground">
          {{ filteredModels.length }} / {{ allModels.length }} models
        </span>
      </div>

      <div class="flex items-center gap-2">
        <div class="relative w-full sm:w-64">
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

    <!-- Provider 过滤 -->
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

    <!-- 表格 -->
    <div
      tabindex="0"
      role="region"
      aria-label="StarLife-1-WSV evaluation leaderboard table"
      class="w-full overflow-x-auto border border-border bg-card"
    >
      <table class="w-full text-left text-xs border-collapse">
        <thead>
          <tr class="border-b border-border bg-muted/20 text-muted-foreground font-mono">
            <th class="py-2.5 pl-4 pr-2 w-12 text-center">#</th>
            <th class="py-2.5 px-3 min-w-[220px]">
              <button type="button" @click="handleSort('name')" class="flex items-center gap-1 hover:text-foreground cursor-pointer font-medium">
                Model
                <ArrowUpDown class="size-3" />
              </button>
            </th>
            <th class="py-2.5 px-3 min-w-[240px]">
              <button type="button" @click="handleSort('score')" class="flex items-center gap-1 hover:text-foreground cursor-pointer font-medium">
                Event macro-F1
                <ArrowUpDown class="size-3" />
              </button>
            </th>
            <th class="py-2.5 px-3 hidden md:table-cell text-right">
              <button type="button" @click="handleSort('topologyF1')" class="inline-flex items-center gap-1 hover:text-foreground cursor-pointer font-medium">
                Topology F1
                <ArrowUpDown class="size-3" />
              </button>
            </th>
            <th class="py-2.5 px-3 hidden lg:table-cell text-right">
              <button type="button" @click="handleSort('affordanceAcc')" class="inline-flex items-center gap-1 hover:text-foreground cursor-pointer font-medium">
                Affordance
                <ArrowUpDown class="size-3" />
              </button>
            </th>
            <th class="py-2.5 px-3 hidden lg:table-cell text-right">
              <button type="button" @click="handleSort('stateTransitionAcc')" class="inline-flex items-center gap-1 hover:text-foreground cursor-pointer font-medium">
                State dynamics
                <ArrowUpDown class="size-3" />
              </button>
            </th>
            <th class="py-2.5 pr-4 pl-3 text-right">
              <button type="button" @click="handleSort('cost')" class="inline-flex items-center gap-1 hover:text-foreground cursor-pointer font-medium">
                Cost / latency
                <ArrowUpDown class="size-3" />
              </button>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border/60">
          <template v-for="(m, index) in sortedModels" :key="m.id">
            <tr
              class="hover:bg-accent/40 transition-colors group"
              :class="hasMetrics(m) ? 'cursor-pointer' : ''"
              @click="toggleRow(m)"
            >
              <!-- Rank -->
              <td class="py-3 pl-4 pr-2 text-center font-mono tabular-nums text-muted-foreground font-medium">
                {{ index + 1 }}
              </td>

              <!-- Model -->
              <td class="py-3 px-3">
                <div class="flex items-center gap-2">
                  <button
                    v-if="hasMetrics(m)"
                    type="button"
                    class="p-0.5 text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                    :aria-expanded="expandedId === m.id"
                    :aria-label="`Toggle metric detail for ${m.name}`"
                    @click.stop="toggleRow(m)"
                  >
                    <ChevronDown
                      class="size-3.5 transition-transform"
                      :class="expandedId === m.id ? 'rotate-0' : '-rotate-90'"
                    />
                  </button>
                  <span class="size-2 rounded-full shrink-0" :style="{ backgroundColor: m.providerColor }" aria-hidden="true" />
                  <span class="font-medium text-foreground truncate">{{ m.name }}</span>
                  <span
                    v-if="m.isBest"
                    class="shrink-0 border border-border bg-muted/40 px-1 py-0.5 text-[9px] font-mono uppercase tracking-wider text-foreground"
                    title="Highest score on this board"
                  >
                    Best
                  </span>
                  <span class="text-[10px] font-mono text-muted-foreground shrink-0 uppercase tracking-wider">
                    [{{ m.mode }}]
                  </span>
                </div>

                <!-- Mobile 子行 -->
                <div class="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-mono text-muted-foreground md:hidden">
                  <span>Topo: <strong class="text-foreground">{{ fmtPct(m.topologyF1) }}</strong></span>
                  <span>·</span>
                  <span>Afford: <strong class="text-foreground">{{ fmtPct(m.affordanceAcc) }}</strong></span>
                  <span>·</span>
                  <span>{{ fmtCost(m.cost) }}</span>
                </div>
              </td>

              <!-- Event macro-F1 -->
              <td class="py-3 px-3">
                <div class="flex items-center gap-3">
                  <div class="w-24 shrink-0 font-mono tabular-nums">
                    <span class="font-semibold text-foreground text-[13px]">{{ fmtPct(m.score) }}</span>
                  </div>

                  <div v-if="m.score != null" class="relative flex-1 h-4 bg-muted/30">
                    <div
                      class="h-full transition-all duration-300"
                      :style="{
                        width: `${Math.min(100, Math.max(0, m.score))}%`,
                        backgroundColor: m.providerColor,
                        opacity: 0.85,
                      }"
                    />
                  </div>
                  <span v-else class="text-[11px] font-mono text-muted-foreground">
                    {{ m.na.score ?? '未测' }}
                  </span>
                </div>
              </td>

              <!-- Topology F1 -->
              <td class="py-3 px-3 hidden md:table-cell text-right font-mono tabular-nums text-foreground">
                {{ fmtPct(m.topologyF1) }}
              </td>

              <!-- Affordance -->
              <td class="py-3 px-3 hidden lg:table-cell text-right font-mono tabular-nums text-foreground">
                {{ fmtPct(m.affordanceAcc) }}
              </td>

              <!-- State dynamics -->
              <td class="py-3 px-3 hidden lg:table-cell text-right font-mono tabular-nums text-foreground">
                {{ fmtPct(m.stateTransitionAcc) }}
              </td>

              <!-- Cost / latency -->
              <td class="py-3 pr-4 pl-3 text-right font-mono tabular-nums text-muted-foreground">
                <div class="text-foreground">{{ fmtCost(m.cost) }}</div>
                <div class="text-[10px] text-muted-foreground">{{ fmtTokens(m) }} · {{ fmtLatency(m.latency) }}</div>
              </td>
            </tr>

            <!-- 明细展开（真实 head/pair/event/state 指标；null -> N/A） -->
            <tr v-if="expandedId === m.id && hasMetrics(m)">
              <td colspan="7" class="bg-muted/20 border-t border-border/40 px-4 py-4">
                <div class="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
                  <div v-for="group in metricGroups(m)" :key="group.key">
                    <div class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                      {{ group.title }}
                    </div>
                    <dl class="mt-2 space-y-1">
                      <div
                        v-for="entry in group.entries"
                        :key="entry.key"
                        class="flex items-baseline justify-between gap-3 text-[11px] font-mono"
                      >
                        <dt class="text-muted-foreground">{{ entry.label }}</dt>
                        <dd class="text-foreground tabular-nums">{{ entry.value }}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
                <div v-if="naEntries(m).length > 0" class="mt-4 pt-3 border-t border-border/40 text-[11px] font-mono text-muted-foreground">
                  <span class="text-foreground">N/A:</span>
                  <span v-for="(entry, i) in naEntries(m)" :key="entry.key">
                    {{ i > 0 ? ' · ' : ' ' }}<span class="text-foreground">{{ entry.label }}</span> — {{ entry.reason }}
                  </span>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>

      <div v-if="sortedModels.length === 0" class="p-8 text-center text-muted-foreground text-sm font-mono">
        {{ allModels.length === 0 ? '尚无评测结果：leaderboard.generated.json 尚未生成或为空。' : 'No models match the current filters.' }}
      </div>
    </div>

    <p class="text-[12px] leading-relaxed text-muted-foreground">
      Score = 100 × event-level macro-F1; Topology F1 = relation-type accuracy on matched pairs;
      Affordance = attribute accuracy; State dynamics = change top-1 on the 60-pair protocol.
      Click a row to expand its measured detail. N/A means the dimension was not measurable in this
      run — it is never filled with a placeholder. Latency is measured per call/run.
    </p>
  </div>
</template>
