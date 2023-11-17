<template>
  <div
    class="display-world"
    :data-page-id="page.id"
    style="position: absolute; top: 0; right: 0; bottom: 0; left: 0"
    @wheel="onWheel"
    @pointerdown.left.capture="onLeftPointerDown"
    @pointerup.left="onLeftPointerUp"
    @pointerdown.middle.prevent="onMiddlePointerDown"
    @auxclick.capture.middle="onMiddleAuxClick"
  >
    <DisplayBackground />

    <DisplayArrows :region="page" />

    <DOMDisplay :region="page">
      <DisplayNote
        v-for="(note, index) in page.react.notes"
        :key="note.id"
        :note="note"
        :index="index"
      />
    </DOMDisplay>

    <InterregionalArrows :region="page" />
    <ArrowCreation :region="page" />

    <DisplayBoxSelection />

    <DisplayPanningBoard />
  </div>
</template>

<script setup lang="ts">
import { isMouseOverScrollbar } from '@stdlib/misc';
import type { Page } from 'src/code/pages/page/page';
import { isCtrlDown } from 'src/code/utils/misc';

import ArrowCreation from './ArrowCreation.vue';
import DisplayArrows from './DisplayArrows.vue';
import DisplayBackground from './DisplayBackground.vue';
import DisplayBoxSelection from './DisplayBoxSelection.vue';
import DisplayNote from './DisplayNote/DisplayNote.vue';
import DisplayPanningBoard from './DisplayPanningBoard.vue';
import DOMDisplay from './DOMDisplay.vue';
import InterregionalArrows from './InterregionalArrows.vue';

const page = inject<Page>('page')!;

function onWheel(event: WheelEvent) {
  page.zooming.perform(event);
}

function onLeftPointerDown(event: PointerEvent) {
  if (isMouseOverScrollbar(event)) {
    return;
  }

  page.pinching.addPointer(event);

  if (page.pinching.react.active) {
    event.stopPropagation();
  }
}

async function onLeftPointerUp(event: PointerEvent) {
  if (
    page.arrowCreation.react.active &&
    (isCtrlDown(event) || internals.mobileAltKey)
  ) {
    event.stopPropagation();

    page.arrowCreation.react.active = false;

    const clientPos = page.pos.eventToClient(event);
    const worldPos = page.pos.clientToWorld(clientPos);

    const note = await page.notes.create({
      region: page,
      worldPos,
    });

    if (note != null) {
      page.arrowCreation.finish({ note, anchor: null });

      page.selection.set(note);
    }
  }
}

function onMiddlePointerDown(event: PointerEvent) {
  page.panning.start(event);
}

function onMiddleAuxClick(event: MouseEvent) {
  if (page.panning.react.active) {
    event.preventDefault();
  }
}
</script>
