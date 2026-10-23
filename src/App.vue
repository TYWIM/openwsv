<script setup lang="ts">
import Header from './components/Header.vue';
import Hero from './components/Hero.vue';
import LeaderboardSection from './components/LeaderboardSection.vue';
import ProtocolSection from './components/ProtocolSection.vue';
import DatasetsSection from './components/DatasetsSection.vue';
import ReproSection from './components/ReproSection.vue';
import Footer from './components/Footer.vue';

const scrollToSection = (sectionId: string) => {
  document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
};
</script>

<template>
  <div class="flex min-h-screen flex-col bg-background text-foreground">
    <Header @navigate="scrollToSection" />

    <main class="flex-1">
      <Hero @navigate="scrollToSection" />

      <div class="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <LeaderboardSection />
        <ProtocolSection />
        <DatasetsSection />
        <ReproSection />
      </div>
    </main>

    <Footer />
  </div>
</template>