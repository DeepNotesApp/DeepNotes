<template>
  <q-item
    :data-page-id="pageId"
    clickable
    active-class="bg-grey-9"
    v-ripple
    @click="
      internals.pages.goToPage(pageId, {
        openInNewTab: ($event as MouseEvent).ctrlKey,
      })
    "
  >
    <PageItemContent
      :icon="icon"
      :page-id="pageId"
      :prefer="prefer"
    />
  </q-item>
</template>

<script setup lang="ts">
defineProps<{
  icon: boolean;
  pageId: string;
  prefer: 'relative' | 'absolute';
}>();
</script>
