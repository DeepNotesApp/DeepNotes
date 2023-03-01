<template>
  <div
    v-if="uiStore().loggedIn && page.react.notes.length === 0"
    style="color: #e0e0e0; text-align: center; white-space: nowrap"
  >
    <div>Double-click anywhere</div>
    <div>to create a note.</div>
  </div>

  <DisplayWorld />
</template>

<script setup lang="ts">
import type { Page } from 'src/code/pages/page/page.client';

import DisplayWorld from './DisplayWorld/DisplayWorld.vue';

const page = inject<Page>('page')!;
</script>
