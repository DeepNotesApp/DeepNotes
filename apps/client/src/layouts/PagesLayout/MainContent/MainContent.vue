<template>
  <q-page-container style="position: fixed; inset: 0">
    <q-page style="background-color: #181818">
      <DisplayPage
        v-for="page in internals.pages?.pageCache.react.cache"
        :key="page.id"
        :page="page"
        :style="{
          visibility:
            page === internals.pages.react.page ? undefined : 'hidden',
        }"
      />

      <DisplayUI v-if="!pagesStore().loading" />
    </q-page>
  </q-page-container>
</template>

<script setup lang="ts">
import DisplayPage from './DisplayPage/DisplayPage.vue';
import DisplayUI from './DisplayUI/DisplayUI.vue';
</script>
