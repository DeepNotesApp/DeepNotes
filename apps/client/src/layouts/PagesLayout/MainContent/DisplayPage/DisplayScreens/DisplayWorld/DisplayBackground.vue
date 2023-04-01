<template>
  <div
    style="position: absolute; inset: 0"
    @pointerdown.left="onLeftPointerDown"
    @dblclick.left="onLeftDoubleClick"
  >
    <div class="display-background"></div>

    <DisplayGrid />

    <div
      v-if="uiStore().loggedIn && page.react.notes.length === 0"
      style="
        position: absolute;
        inset: 0;
        pointer-events: none;
        display: grid;
        place-items: center;
      "
    >
      <div>
        <div>Double-click anywhere</div>
        <div>to create a note.</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Page } from 'src/code/pages/page/page';
import { isCtrlDown } from 'src/code/utils';

import DisplayGrid from './DisplayGrid.vue';

const page = inject<Page>('page')!;

function onLeftPointerDown(event: PointerEvent) {
  page.editing.stop();

  if (!isCtrlDown(event) && !event.shiftKey && !internals.mobileAltKey) {
    page.selection.clear(page);
  }

  page.boxSelection.start(event, page);

  page.fixDisplay();
}

async function onLeftDoubleClick(event: MouseEvent) {
  const clientPos = page.pos.eventToClient(event);
  const worldPos = page.pos.clientToWorld(clientPos);

  await page.notes.create(page, worldPos);
}
</script>

<style scoped>
.display-background {
  position: absolute;

  inset: -999999px;

  background-color: rgb(24, 24, 24);
}
</style>
