<template>
  <div
    class="display-world"
    :data-page-id="page.id"
    style="position: absolute; inset: 0"
    @wheel="onWheel"
    @pointerdown.left.capture="onLeftPointerDown"
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

    <DisplayBoxSelection :region="page" />
  </div>
</template>

<script setup lang="ts">
import { isMouseOverScrollbar } from '@stdlib/misc';
import type { Page } from 'src/code/pages/page/page';

import ArrowCreation from './ArrowCreation.vue';
import DisplayArrows from './DisplayArrows.vue';
import DisplayBackground from './DisplayBackground.vue';
import DisplayBoxSelection from './DisplayBoxSelection.vue';
import DisplayNote from './DisplayNote/DisplayNote.vue';
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

function onMiddlePointerDown(event: PointerEvent) {
  page.panning.start(event);
}

function onMiddleAuxClick(event: MouseEvent) {
  if (page.panning.react.active) {
    event.preventDefault();
  }
}
</script>
