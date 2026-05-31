<script setup lang="ts">
import NavBar from "@/components/NavBar.vue";
import Footer from "@/components/Footer.vue";
</script>

<template>
  <div class="flex min-h-screen flex-col bg-background text-foreground">
    <NavBar />
    <main class="flex-1">
      <RouterView />
    </main>
    <Footer />
  </div>
</template>
