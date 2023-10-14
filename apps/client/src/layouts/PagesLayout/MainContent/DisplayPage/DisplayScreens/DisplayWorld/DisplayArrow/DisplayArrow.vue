<template>
  <g
    v-if="arrow.react.valid"
    :id="`arrow-${arrow.id}`"
    class="display-arrow"
  >
    <!-- Bodies -->

    <component
      :is="arrow.react.collab.bodyType === 'curve' ? CurveArrow : LineArrow"
      :style="{
        'pointer-events': page.arrowCreation.react.active ? 'none' : undefined,
      }"
      @pointerdown.left.stop="onLeftPointerDown"
      @pointerup.left="onLeftPointerUp"
      @click.left="onLeftClick"
    ></component>

    <!-- Heads -->

    <OpenHead
      v-if="arrow.react.collab.sourceHead === 'open'"
      :pos="arrow.react.sourceHeadPos"
      :angle="arrow.react.sourceAngle"
    />

    <OpenHead
      v-if="arrow.react.collab.targetHead === 'open'"
      :pos="arrow.react.targetHeadPos"
      :angle="arrow.react.targetAngle"
    />
  </g>
</template>

<script setup lang="ts">
import type { PageArrow } from 'src/code/pages/page/arrows/arrow';
import { PageNote } from 'src/code/pages/page/notes/note';
import type { Page } from 'src/code/pages/page/page';
import { createDoubleClickChecker } from 'src/code/utils/misc';

import CurveArrow from './Bodies/CurveArrow.vue';
import LineArrow from './Bodies/LineArrow.vue';
import OpenHead from './Heads/OpenHead.vue';

const props = defineProps<{
  arrow: PageArrow;
  index?: number;
}>();

const page = inject<Page>('page')!;

provide('arrow', props.arrow);

watchEffect(() => {
  // eslint-disable-next-line vue/no-mutating-props
  props.arrow.react.index = props.index ?? 0;
});

watchEffect(() => {
  if (props.arrow.react.collab == null || props.arrow.id === '') {
    return;
  }

  props.arrow.react.sourceNote?.outgoingArrowIds.add(props.arrow.id);
  props.arrow.react.targetNote?.incomingArrowIds.add(props.arrow.id);
});

function onLeftPointerDown(event: PointerEvent) {
  page.editing.stop();

  props.arrow.grab(event);
}

async function onLeftPointerUp(event: PointerEvent) {
  if (
    page.dragging.react.active &&
    page.selection.react.elems.length === 1 &&
    page.selection.react.elems[0].type === 'note'
  ) {
    if (props.arrow.react.region instanceof PageNote) {
      await page.dropping.perform(props.arrow.react.region);
    } else {
      page.dragging.cancel();
    }

    const targetNote = props.arrow.react.targetNote;

    const middleNote = page.selection.react.elems[0];

    // eslint-disable-next-line vue/no-mutating-props
    props.arrow.react.collab.target = middleNote.id;

    page.arrowCreation.create({
      sourceNote: middleNote,
      targetNote: targetNote,
      anchor: null,
      baseArrow: props.arrow,
      event,
    });
  }
}

const checkDoubleClick = createDoubleClickChecker();

async function onLeftClick(event: MouseEvent) {
  if (checkDoubleClick(event)) {
    await page.editing.start(props.arrow);
  }
}
</script>

<style scoped lang="scss">
.display-arrow :deep() {
  .arrow {
    fill: none;

    stroke-width: 4;
  }

  .arrow-hitbox {
    pointer-events: auto;

    fill: none;
    stroke: black;
    stroke-width: 20;
    stroke-opacity: 0;

    cursor: grab;
  }
}
</style>
