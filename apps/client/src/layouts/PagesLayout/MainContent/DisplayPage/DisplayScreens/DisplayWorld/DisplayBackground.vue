<template>
  <div
    style="position: absolute; top: 0; right: 0; bottom: 0; left: 0"
    @pointerdown.left="onLeftPointerDown"
    @click.left="onLeftClick"
  >
    <div class="display-background"></div>

    <DisplayGrid />

    <div
      v-if="uiStore().loggedIn && page.react.notes.length === 0"
      style="
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
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
import { createDoubleClickChecker, isCtrlDown } from 'src/code/utils/misc';

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

const checkDoubleClick = createDoubleClickChecker();

async function onLeftClick(event: MouseEvent) {
  if (checkDoubleClick(event)) {
    const clientPos = page.pos.eventToClient(event);
    const worldPos = page.pos.clientToWorld(clientPos);

    await page.notes.create(page, worldPos);
  }
}
</script>

<style scoped>
.display-background {
  position: absolute;

  top: -999999px;
  right: -999999px;
  bottom: -999999px;
  left: -999999px;

  background-color: rgb(24, 24, 24);
}
</style>
