<template>
  <div
    class="display-background"
    @pointerdown.left="onLeftPointerDown"
    @dblclick.left="onLeftDoubleClick"
  ></div>
</template>

<script setup lang="ts">
import type { Page } from 'src/code/pages/page/page';
import { isCtrlDown } from 'src/code/utils';

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
