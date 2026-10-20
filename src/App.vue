<script setup lang="ts">
import { ref, computed } from 'vue';
import Header from './components/Header.vue';
import Hero from './components/Hero.vue';
import ScatterPlot from './components/ScatterPlot.vue';
import LeaderboardTable from './components/LeaderboardTable.vue';
import TaskExamplesGrid from './components/TaskExamplesGrid.vue';
import MethodologySection from './components/MethodologySection.vue';
import InvertedWhitepaperSection from './components/InvertedWhitepaperSection.vue';
import Footer from './components/Footer.vue';
import { BENCHMARK_MODELS } from './data/benchmarkData';
import { Terminal, Copy, Check, X } from 'lucide-vue-next';

const activeVersion = ref<'v1.1' | 'v1.0'>('v1.1');
const bestOnly = ref(false); // Default to false so all effort curves show like in DeepSWE
const activeMetric = ref<'cost' | 'tokens' | 'latency'>('cost');
const showHarnessModal = ref(false);
const copied = ref(false);

const harnessCommand = `pip install openwsv-eval-harness
openwsv run --model <your-mllm-endpoint> --tasks all --views rgb-d,multi-view`;

const handleCopy = () => {
  navigator.clipboard.writeText(harnessCommand);
  copied.value = true;
  setTimeout(() => {
    copied.value = false;
  }, 2000);
};

const scrollToSection = (sectionId: string) => {
  const el = document.getElementById(sectionId);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' });
  }
};

const chartModels = computed(() => {
  return BENCHMARK_MODELS.filter((m) => {
    if (m.version !== activeVersion.value) return false;
    if (bestOnly.value && !m.isBest) return false;
    return true;
  });
});
</script>

<template>
  <div class="min-h-screen flex flex-col bg-background text-foreground transition-colors">
    <!-- Sticky Header -->
    <Header @navigate="scrollToSection" />

    <!-- Main Content -->
    <main class="flex-1">
      <!-- Hero Section -->
      <Hero
        @explore="() => scrollToSection('tasks')"
        @run="() => showHarnessModal = true"
      />

      <div class="max-w-5xl mx-auto px-4 sm:px-6">
        <!-- Leaderboard Section -->
        <section id="leaderboard" class="mt-14 sm:mt-16 scroll-mt-20">
          <div class="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 class="text-xl sm:text-2xl font-medium tracking-tight text-foreground">
              Leaderboard
            </h2>
          </div>

          <!-- Interactive Scatter Plot with Pareto Frontier & Connecting Family Curves -->
          <ScatterPlot
            :models="chartModels"
            :all-models-count="BENCHMARK_MODELS.filter((m) => m.version === activeVersion).length"
            v-model:activeMetric="activeMetric"
            v-model:activeVersion="activeVersion"
          />

          <!-- Leaderboard Table -->
          <LeaderboardTable
            :all-models="BENCHMARK_MODELS"
            v-model:active-version="activeVersion"
            v-model:best-only="bestOnly"
          />
        </section>

        <!-- Task Examples Grid -->
        <TaskExamplesGrid />

        <!-- Methodology Section -->
        <MethodologySection />
      </div>

      <!-- Inverted High-Contrast Whitepaper Section -->
      <InvertedWhitepaperSection />
    </main>

    <!-- Footer -->
    <Footer />

    <!-- Harness CLI Modal -->
    <div
      v-if="showHarnessModal"
      role="dialog"
      aria-modal="true"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs"
    >
      <div class="relative w-full max-w-lg border border-border bg-card p-6 shadow-2xl animate-in fade-in-0 zoom-in-95">
        <button
          type="button"
          @click="showHarnessModal = false"
          class="absolute right-4 top-4 p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <X class="size-4" />
        </button>

        <div class="flex items-center gap-2 text-foreground font-medium text-lg mb-1">
          <Terminal class="size-5" />
          <span>Run OpenWSV Evaluation Harness</span>
        </div>
        <p class="text-xs text-muted-foreground font-mono mb-4">
          Execute isolated Docker-based deterministic topological verifiers locally.
        </p>

        <div class="relative border border-border bg-muted/40 p-3 font-mono text-xs text-foreground rounded-none">
          <pre class="overflow-x-auto whitespace-pre-wrap">{{ harnessCommand }}</pre>
          <button
            type="button"
            @click="handleCopy"
            class="absolute top-2.5 right-2.5 p-1.5 border border-border bg-background hover:bg-accent text-foreground transition-colors cursor-pointer"
            title="Copy command"
          >
            <Check v-if="copied" class="size-3.5 text-emerald-500" />
            <Copy v-else class="size-3.5" />
          </button>
        </div>

        <div class="mt-4 text-[11px] text-muted-foreground leading-relaxed">
          The test harness pulls calibrated camera matrices, multi-view RGB-D bundles, and launches the PhysX / Raytracing verifier container to evaluate your model output with zero subjective judge bias.
        </div>

        <div class="mt-6 flex justify-end">
          <button
            type="button"
            @click="showHarnessModal = false"
            class="px-4 py-2 text-xs font-medium bg-foreground text-background hover:opacity-90 transition-opacity cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
