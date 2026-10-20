<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  COMPOSITE_DIM_GUIDE,
  COMPOSITE_FORMULA,
  NA,
  fmtLatency,
  fmtMetricValue,
  fmtPct,
  primaryScore,
  type CompositeDim,
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
  /** 仅用于 SSR/截图验证时预先展开某一行；正常页面不传。 */
  initialExpandedId?: string;
}>();

const emit = defineEmits<{
  (e: 'update:activeVersion', version: string): void;
}>();

const searchQuery = ref('');
const selectedProvider = ref('All');
const sortField = ref<SortField>('composite');
const sortAsc = ref(false);
const expandedId = ref<string | null>(props.initialExpandedId ?? null);
const detailId = ref<string | null>(null);

type SortField = 'name' | 'composite' | 'latency';

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
  if (field === 'composite') return primaryScore(model);
  return model.latency;
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

/** 综合分构成 / 旧口径明细 / 事件指标，任一存在才允许展开。 */
const hasDetails = (model: ModelResult): boolean =>
  model.composite != null || hasMetrics(model) || model.score != null;

const toggleRow = (model: ModelResult) => {
  if (!hasDetails(model)) return;
  expandedId.value = expandedId.value === model.id ? null : model.id;
  detailId.value = null;
};

const toggleDetail = (model: ModelResult) => {
  detailId.value = detailId.value === model.id ? null : model.id;
};

/** 中性写法：本地专用头 vs 零样本通用模型，两类不可直接等量齐观。 */
const modeLabel = (mode: string): string => {
  const normalized = mode.toLowerCase();
  if (normalized === 'local-heads') return 'local-heads';
  if (normalized === 'zero-shot') return 'zero-shot';
  return normalized || '—';
};

const modeTitle = (mode: string): string => {
  const normalized = mode.toLowerCase();
  if (normalized === 'local-heads') {
    return '有监督专用头（local-heads）：在训练集上拟合过，与零样本通用模型不可直接等量齐观。';
  }
  if (normalized === 'zero-shot') {
    return '零样本通用模型（zero-shot）：直接跑云端 API，没有任何针对本基准的训练。';
  }
  return '参赛方式未标注。';
};

const latencyTooltip =
  '每事件端到端延迟（含特征抽取 / API 往返）；云端受网络与输出长度影响。';

const compositeBarWidth = (value: number | null): string => {
  if (value == null || !Number.isFinite(value)) return '0%';
  return `${Math.min(100, Math.max(0, value))}%`;
};

/** 权重来源说明：等权时明确写"等权，不预设哪个维度更重要"。 */
const weightsLabel = (model: ModelResult): string | null => {
  const weights = model.composite?.weights ?? [];
  if (weights.length === 0) return null;
  const unique = [...new Set(weights.map((w) => w.toFixed(6)))];
  if (unique.length <= 1) {
    return `${weights.length} × ${unique[0]}（等权，不预设哪个维度更重要）`;
  }
  return `${weights.map((w) => w.toFixed(4)).join(' / ')}（按权重加权）`;
};

/** 维度 tooltip：一句话 + 怎么看 + 口径提醒（rel_pos / state_consistency 的口径放这里）。 */
const dimTitle = (dim: CompositeDim): string => {
  const guide = COMPOSITE_DIM_GUIDE[dim.key];
  const lines = [guide.oneLiner, `怎么看：${guide.howToRead}`];
  if (dim.key === 'rel_pos') {
    lines.push('口径：只统计关系判定正确后的方位。');
  }
  if (dim.key === 'state_consistency') {
    lines.push('口径：不含实体类别维度。');
  }
  return lines.join('\n');
};

/** 前两名综合分差（由数据算，不手抄）：用于"约等于打平"的中性说明。 */
const topTwo = computed(() => {
  const ranked = props.allModels
    .filter((m) => m.version === props.activeVersion && primaryScore(m) != null)
    .sort((a, b) => (primaryScore(b) ?? 0) - (primaryScore(a) ?? 0));
  const first = ranked[0];
  const second = ranked[1];
  if (!first || !second) return null;
  return { first, second, gap: (primaryScore(first) ?? 0) - (primaryScore(second) ?? 0) };
});

/** 榜单里同时有本地专用头与零样本模型时，明确提示两类不可直接比较。 */
const mixedEntrantTypes = computed(
  () => props.allModels.some((m) => m.mode === 'LOCAL-HEADS') && props.allModels.some((m) => m.mode === 'ZERO-SHOT'),
);

const dimBarWidth = (value: number): string => `${Math.min(100, Math.max(0, value))}%`;

const sectionTitles: Record<string, string> = {
  head: 'Head-level · test split',
  pair: '60-pair cloud protocol',
  event: 'Event-level',
  state: 'World-state replay',
};

const METRIC_LABELS: Record<string, string> = {
  change_top1: 'Change top-1',
  change_macro_f1: 'Change macro-F1',
  change_slots: 'Change slots',
  relation_top1: 'Relation top-1',
  relation_macro_f1: 'Relation macro-F1',
  relation_pairs: 'Relation pairs',
  relation_type_acc: 'Relation class acc',
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
  changes: 'Changes',
  relations: 'Relations',
  state_acc: 'State accuracy',
  value: 'Value',
  n_pairs: 'Pairs',
};

const NA_LABELS: Record<string, string> = {
  score: 'Comparable event score',
  compositeScore: 'Composite score',
  topologyF1: 'Topology F1',
  affordanceAcc: 'Affordance',
  stateTransitionAcc: 'State dynamics',
  latency: 'Latency',
  head_metrics: 'Head-level metrics',
};

/** 只显示与本基准相关的 N/A 原因；旧口径字段名（含类别/用量类）直接过滤掉。 */
const naEntries = (model: ModelResult): Array<{ key: string; label: string; reason: string }> =>
  Object.entries(model.na)
    .filter(([key, reason]) => {
      const text = `${key} ${reason}`.toLowerCase();
      return !/(token|cost|type|vocab)/.test(text);
    })
    .map(([key, reason]) => ({
      key,
      label: NA_LABELS[key] ?? key,
      reason,
    }));

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
    const entries = Object.entries(values)
      .filter(([key]) => !/(token|cost|type|vocab)/.test(key))
      .map(([key, value]) => ({
        key,
        label: METRIC_LABELS[key] ?? key,
        value: fmtMetricValue(value),
      }));
    if (entries.length === 0) continue;
    groups.push({
      key: section,
      title: sectionTitles[section] ?? section,
      entries,
    });
  }
  return groups;
};
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

    <!-- 参赛方式提示：专用头 vs 零样本 -->
    <p v-if="mixedEntrantTypes" class="text-[12px] leading-relaxed text-muted-foreground">
      参赛方式有两类：
      <span class="font-mono text-foreground">local-heads</span>（有监督专用头）与
      <span class="font-mono text-foreground">zero-shot</span>（零样本通用模型）。
      两类不可直接等量齐观（专用头见过训练集、零样本没有）；综合分只做同口径汇总，
      换一组权重云端名次会互换，本地两行始终第一，详见 reliability 报告。
    </p>

    <!-- 表格 -->
    <div
      tabindex="0"
      role="region"
      aria-label="空间理解与关系推理基准 leaderboard table"
      class="w-full overflow-x-auto border border-border bg-card"
    >
      <table class="w-full text-left text-xs border-collapse">
        <thead>
          <tr class="border-b border-border bg-muted/20 text-muted-foreground font-mono">
            <th class="py-2.5 pl-4 pr-2 w-12 text-center">#</th>
            <th class="py-2.5 px-3 min-w-[210px]">
              <button type="button" @click="handleSort('name')" class="flex items-center gap-1 hover:text-foreground cursor-pointer font-medium">
                Model · 参赛模型
                <ArrowUpDown class="size-3" />
              </button>
            </th>
            <th class="py-2.5 px-3 min-w-[250px]">
              <button
                type="button"
                @click="handleSort('composite')"
                class="flex items-center gap-1 hover:text-foreground cursor-pointer font-medium"
                title="7 维等权综合分（0–100）"
              >
                综合分 · Composite
                <ArrowUpDown class="size-3" />
              </button>
            </th>
            <th class="py-2.5 px-3 hidden md:table-cell text-right">
              <button
                type="button"
                @click="handleSort('latency')"
                class="inline-flex items-center gap-1 hover:text-foreground cursor-pointer font-medium"
                :title="latencyTooltip"
              >
                Latency
                <ArrowUpDown class="size-3" />
              </button>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border/60">
          <template v-for="(m, index) in sortedModels" :key="m.id">
            <tr
              class="hover:bg-accent/40 transition-colors group"
              :class="hasDetails(m) ? 'cursor-pointer' : ''"
              @click="toggleRow(m)"
            >
              <!-- Rank -->
              <td class="py-3 pl-4 pr-2 text-center font-mono tabular-nums text-muted-foreground font-medium">
                {{ index + 1 }}
              </td>

              <!-- Model / Entrant -->
              <td class="py-3 px-3">
                <div class="flex items-center gap-2">
                  <button
                    v-if="hasDetails(m)"
                    type="button"
                    class="p-0.5 text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                    :aria-expanded="expandedId === m.id"
                    :aria-label="`Toggle composite detail for ${m.name}`"
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
                    title="Highest composite score on this board"
                  >
                    Best
                  </span>
                  <span
                    class="text-[10px] font-mono text-muted-foreground shrink-0 tracking-wider"
                    :title="modeTitle(m.mode)"
                  >
                    [{{ modeLabel(m.mode) }}]
                  </span>
                </div>

                <!-- Mobile 子行 -->
                <div class="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-mono text-muted-foreground md:hidden">
                  <span>Score: <strong class="text-foreground">{{ fmtPct(primaryScore(m)) }}</strong></span>
                  <span>·</span>
                  <span :title="latencyTooltip">{{ fmtLatency(m.latency) }}</span>
                </div>
              </td>

              <!-- 综合分（主分） -->
              <td class="py-3 px-3">
                <div class="flex items-center gap-3">
                  <div class="w-24 shrink-0 font-mono tabular-nums">
                    <span class="font-semibold text-foreground text-[15px]">
                      {{ fmtPct(primaryScore(m)) }}
                    </span>
                    <span class="block text-[10px] text-muted-foreground">
                      {{ m.composite ? '7 维等权' : '旧版事件分' }}
                    </span>
                  </div>

                  <div v-if="primaryScore(m) != null" class="relative flex-1 h-4 bg-muted/30">
                    <div
                      class="h-full transition-all duration-300"
                      :style="{
                        width: compositeBarWidth(primaryScore(m)),
                        backgroundColor: m.providerColor,
                        opacity: 0.85,
                      }"
                    />
                  </div>
                  <span v-else class="text-[11px] font-mono text-muted-foreground">
                    {{ m.na.compositeScore ?? m.na.score ?? '未测' }}
                  </span>
                </div>
              </td>

              <!-- Latency（唯一保留的运行时指标） -->
              <td class="py-3 px-3 hidden md:table-cell text-right font-mono tabular-nums text-foreground">
                <span :title="latencyTooltip">{{ fmtLatency(m.latency) }}</span>
              </td>
            </tr>

            <!-- 展开：7 维综合分构成（人话说明）+ 旧口径明细 -->
            <tr v-if="expandedId === m.id && hasDetails(m)">
              <td colspan="4" class="bg-muted/20 border-t border-border/40 px-4 py-4">
                <div class="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                  <!-- 综合分构成 -->
                  <div>
                    <div class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                      Composite score breakdown
                    </div>
                    <p class="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
                      <span class="font-mono text-foreground">公式：</span>
                      {{ COMPOSITE_FORMULA }}
                      <span v-if="m.composite" class="font-mono">
                        （{{ m.composite.available }}/{{ m.composite.total }} 维可用 · {{ m.composite.method }}）
                      </span>
                    </p>

                    <p v-if="m.composite" class="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      <span class="font-mono text-foreground">权重：</span>{{ weightsLabel(m) }}
                    </p>
                    <p v-if="m.composite" class="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                      综合分依赖权重：换一组权重，云端 4 个模型的名次会互换，但本地两行始终第一；详见
                      reliability 报告。
                    </p>
                    <p v-if="meta.composite?.note" class="mt-1 text-[11px] leading-relaxed text-muted-foreground/80">
                      {{ meta.composite.note }}
                    </p>

                    <ul v-if="m.composite" class="mt-4 space-y-3.5">
                      <li v-for="dim in m.composite.dims" :key="dim.key" :title="dimTitle(dim)">
                        <div class="flex items-baseline justify-between gap-3">
                          <span class="text-[12px] font-medium text-foreground">
                            {{ dim.group }}
                          </span>
                          <span
                            class="font-mono text-[12px] tabular-nums"
                            :class="dim.available ? 'text-foreground font-semibold' : 'text-muted-foreground'"
                          >
                            {{ dim.available ? fmtPct(dim.value) : NA }}
                          </span>
                        </div>
                        <div class="mt-1 h-1.5 bg-muted/50">
                          <div
                            class="h-full"
                            :style="{
                              width: dim.available ? dimBarWidth(dim.value) : '0%',
                              backgroundColor: m.providerColor,
                              opacity: 0.85,
                            }"
                          />
                        </div>
                        <p class="mt-1 text-[11px] leading-snug text-muted-foreground">
                          {{ COMPOSITE_DIM_GUIDE[dim.key].oneLiner }}
                        </p>
                        <p class="text-[11px] leading-snug text-muted-foreground/80">
                          <span class="text-foreground/70">怎么看：</span>
                          {{ COMPOSITE_DIM_GUIDE[dim.key].howToRead }}
                        </p>
                      </li>
                    </ul>
                    <p v-else class="mt-4 text-[11px] leading-relaxed text-muted-foreground">
                      该版本数据未提供 7 维综合分构成（旧版 schema），主分回退为可比事件分。
                    </p>
                  </div>

                  <!-- 旧口径明细 -->
                  <div>
                    <div class="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                      Comparable metrics (legacy)
                    </div>
                    <dl class="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] font-mono">
                      <div class="flex items-baseline justify-between gap-2">
                        <dt class="text-muted-foreground">Event macro-F1</dt>
                        <dd class="text-foreground tabular-nums">{{ fmtPct(m.score) }}</dd>
                      </div>
                      <div class="flex items-baseline justify-between gap-2">
                        <dt class="text-muted-foreground">Topology F1</dt>
                        <dd class="text-foreground tabular-nums">{{ fmtPct(m.topologyF1) }}</dd>
                      </div>
                      <div class="flex items-baseline justify-between gap-2">
                        <dt class="text-muted-foreground">Affordance</dt>
                        <dd class="text-foreground tabular-nums">{{ fmtPct(m.affordanceAcc) }}</dd>
                      </div>
                      <div class="flex items-baseline justify-between gap-2">
                        <dt class="text-muted-foreground">State dynamics</dt>
                        <dd class="text-foreground tabular-nums">{{ fmtPct(m.stateTransitionAcc) }}</dd>
                      </div>
                    </dl>

                    <button
                      v-if="hasMetrics(m)"
                      type="button"
                      class="mt-3 inline-flex h-7 items-center gap-1 border border-border bg-background px-2.5 text-[11px] font-mono text-foreground transition-colors hover:bg-accent cursor-pointer"
                      :aria-expanded="detailId === m.id"
                      @click.stop="toggleDetail(m)"
                    >
                      <ChevronDown
                        class="size-3 transition-transform"
                        :class="detailId === m.id ? 'rotate-0' : '-rotate-90'"
                      />
                      {{ detailId === m.id ? '收起 head/pair/event 明细' : '展开 head/pair/event 明细' }}
                    </button>

                    <div v-if="detailId === m.id && hasMetrics(m)" class="mt-3 space-y-4">
                      <div
                        v-for="group in metricGroups(m)"
                        :key="group.key"
                        class="border-t border-border/40 pt-2"
                      >
                        <div class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                          {{ group.title }}
                        </div>
                        <dl class="mt-1.5 space-y-1">
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

                      <div
                        v-if="naEntries(m).length > 0"
                        class="border-t border-border/40 pt-2 text-[11px] font-mono text-muted-foreground"
                      >
                        <span class="text-foreground">N/A:</span>
                        <span v-for="(entry, i) in naEntries(m)" :key="entry.key">
                          {{ i > 0 ? ' · ' : ' ' }}<span class="text-foreground">{{ entry.label }}</span> — {{ entry.reason }}
                        </span>
                      </div>
                    </div>
                  </div>
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
      综合分 = {{ COMPOSITE_FORMULA }}。7 个维度：变化识别 top-1、变化平衡性 macro-F1、
      关系类别、空间方位、接触/支撑、事件级 F1、世界状态一致性。点开任意一行可看 7 维分数与每维的人话解释；
      旧的可比事件分与 head / pair / event / state 明细仍保留在展开区，未删除。延迟为每事件端到端
      （含特征抽取 / API 往返），云端受网络与输出长度影响。N/A 表示该维度没有真实测量值，不会用 0 或占位符代替。
    </p>
    <p v-if="topTwo" class="text-[12px] leading-relaxed text-muted-foreground">
      前两名 {{ topTwo.first.name }} / {{ topTwo.second.name }} 的综合分为
      {{ fmtPct(primaryScore(topTwo.first)) }} : {{ fmtPct(primaryScore(topTwo.second)) }}，
      差 {{ topTwo.gap.toFixed(1) }} 分，约等于打平。综合分依赖权重——换一组权重，云端 4 个模型的名次会
      互换，但本地两行始终第一；详见 reliability 报告。
    </p>
  </div>
</template>
