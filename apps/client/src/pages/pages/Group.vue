<template>
  <template></template>
</template>

<script setup lang="ts">
useMeta(() => ({
  title: `Group ${route().value.params.groupId} - DeepNotes`,
}));

onMounted(async () => {
  console.log('Group page mounted');

  pagesStore().loading = false;
});

onBeforeUpdate(() => {
  console.log('Group page updated');
});
</script>
