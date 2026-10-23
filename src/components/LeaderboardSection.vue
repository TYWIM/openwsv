<script setup lang="ts">
import { computed, ref } from 'vue';
import SectionHeader from './SectionHeader.vue';
import LeaderboardBars from './LeaderboardBars.vue';
import LeaderboardTable from './LeaderboardTable.vue';
import {
  BOARDS,
  COMPOSITE,
  DEFAULT_BOARD,
  findBoard,
  fmtCount,
  isPending,
  type Board,
} from '../data/openwsv';

const activeId = ref(DEFAULT_BOARD);
const activeBoard = computed<Board>(() => findBoard(activeId.value) ?? BOARDS[0]);

const tabLabel = (board: Board): string => (board.id === 'overall' ? '综合' : board.label);

const nLabel = (board: Board): string => {
  const parts: string[] = [];
  if (board.n != null) parts.push(`n = ${fmtCount(board.n)}`);
  if (!isPending(board)) parts.push('accuracy');
  return parts.join(' · ');
};
</script>

<template>
  <section id="leaderboard" class="mt-14 scroll-mt-20 sm:mt-20">
    <SectionHeader index="01" title="主榜" eyebrow="Leaderboard · overall & sub-tasks" />

    <p class="mb-4 text-[12px] leading-relaxed text-muted-foreground">
      <span class="font-mono text-foreground/85">{{ COMPOSITE.label }}</span>
      = {{ COMPOSITE.method }}
    </p>

    <!-- 子类 tab -->
    <div
      class="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
      role="tablist"
      aria-label="榜单子类"
    >
      <button
        v-for="board in BOARDS"
        :key="board.id"
        type="button"
        role="tab"
        :aria-selected="activeId === board.id"
        :data-board-tab="board.id"
        :data-pending="String(isPending(board))"
        class="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 border px-2.5 text-[12px] transition-colors"
        :class="
          activeId === board.id
            ? 'border-foreground bg-foreground text-background'
            : 'border-border bg-background text-muted-foreground hover:text-foreground'
        "
        @click="activeId = board.id"
      >
        <span>{{ tabLabel(board) }}</span>
        <span
          v-if="isPending(board)"
          class="font-mono text-[9px] uppercase tracking-wider"
          :class="activeId === board.id ? 'text-background/70' : 'text-muted-foreground/70'"
        >
          待跑
        </span>
      </button>
    </div>

    <!-- 当前子类 -->
    <div class="mt-4" :data-active-board="activeBoard.id">
      <div class="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <div class="flex flex-wrap items-baseline gap-2">
          <h3 class="text-[15px] font-medium tracking-tight text-foreground">
            {{ activeBoard.label }}
          </h3>
          <span v-if="activeBoard.note" class="font-mono text-[10px] text-muted-foreground">
            {{ activeBoard.note }}
          </span>
        </div>
        <span v-if="nLabel(activeBoard)" class="font-mono text-[10px] text-muted-foreground">
          {{ nLabel(activeBoard) }}
        </span>
      </div>

      <!-- 未出分：待跑占位，不显示任何数字 -->
      <template v-if="isPending(activeBoard)">
        <div
          data-pending-board
          class="border border-border bg-card/40 px-6 py-14 text-center"
        >
          <div class="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            pending
          </div>
          <div class="mt-2 text-[16px] font-medium text-foreground">待跑</div>
          <p class="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
            该子类尚未出分，不显示任何分数。
          </p>
          <p v-if="activeBoard.n != null" class="mt-1 font-mono text-[11px] text-muted-foreground">
            计划题量 n = {{ fmtCount(activeBoard.n) }}
          </p>
          <p v-if="activeBoard.note" class="mt-1 font-mono text-[11px] text-muted-foreground">
            {{ activeBoard.note }}
          </p>
        </div>
      </template>

      <!-- 已出分：横状对比图 + 明细表 -->
      <template v-else>
        <LeaderboardBars :board="activeBoard" />
        <LeaderboardTable :board="activeBoard" />
        <p class="mt-2 text-[11px] leading-relaxed text-muted-foreground">
          未覆盖≠错；准确率带 95% bootstrap CI。
        </p>
      </template>
    </div>
  </section>
</template>