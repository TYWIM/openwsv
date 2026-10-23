<script setup lang="ts">
defineProps<{
  index: string;
  title: string;
  eyebrow: string;
}>();
</script>

<template>
  <div class="mb-6 border-b border-border pb-4">
    <div class="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
      <div class="flex items-baseline gap-3">
        <span class="font-mono text-[11px] tabular-nums text-muted-foreground/70">{{ index }}</span>
        <h2 class="text-xl font-medium tracking-tight text-foreground sm:text-[22px]">
          {{ title }}
        </h2>
      </div>
      <span class="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        {{ eyebrow }}
      </span>
    </div>
    <div v-if="$slots.default" class="mt-3 max-w-3xl text-[13px] leading-relaxed text-muted-foreground">
      <slot />
    </div>
  </div>
</template>