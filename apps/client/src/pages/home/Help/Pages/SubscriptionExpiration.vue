<template>
  <div style="font-size: 28px; font-weight: bold">{{ title }}</div>

  <Gap style="height: 36px" />

  <div style="max-width: 500px">
    When your subscription expires, all pages created during your subscription
    becomes read-only. You will not be able to edit them, but you will still be
    able to view them.
  </div>
</template>

<script setup lang="ts">
const title = 'What happens when my subscription expires?';

useMeta(() => ({
  title: `${title} - Help - DeepNotes`,
}));
</script>
