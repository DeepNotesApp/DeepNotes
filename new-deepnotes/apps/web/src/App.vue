<script setup lang="ts">
const title = "DeepNotes";
const subtitle = "Greenfield SPA — API is separate (Hono on Workers).";
</script>

<template>
  <main class="wrap">
    <h1>{{ title }}</h1>
    <p>{{ subtitle }}</p>
  </main>
</template>

<style scoped>
.wrap {
  font-family:
    system-ui,
    -apple-system,
    sans-serif;
  max-width: 40rem;
  margin: 4rem auto;
  padding: 0 1rem;
  line-height: 1.5;
}
</style>
