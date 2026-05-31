<script setup lang="ts">
import Footer from "@/components/Footer.vue";
import NavBar from "@/components/NavBar.vue";
</script>

<template>
  <div class="flex min-h-svh flex-col bg-background text-foreground">
    <NavBar />
    <main class="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6">
      <slot />
    </main>
    <Footer />
  </div>
</template>
