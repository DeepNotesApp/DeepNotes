<template>
  <div
    v-if="note.react.resizing?.active"
    :style="{
      width: `${note.react.resizing.oldWorldRect.size.x}px`,
      height: `${note.react.resizing.oldWorldRect.size.y}px`,
    }"
  ></div>

  <Teleport
    :to="`.display-overlay[data-page-id='${note.page.id}']`"
    :disabled="!note.react.dragging && !note.react.resizing?.active"
  >
    <NoteAnchor v-bind="$attrs">
      <NoteDropZones />

      <NoteFrame @resize="$emit('resize')">
        <NoteArrowHandles />

        <NoteLinkIcon />

        <ArrowLinkZones />

        <NoteContent>
          <NoteTextSection section="head" />

          <NoteDivider section="head" />

          <NoteTextSection section="body" />

          <NoteDivider section="body" />

          <NoteContainerSection_ />
        </NoteContent>

        <NoteResizeHandles />
      </NoteFrame>
    </NoteAnchor>
  </Teleport>
</template>

<script lang="ts">
export default {
  inheritAttrs: false,
  components: { ArrowLinkZones },
};
</script>

<script setup lang="ts">
/* eslint-disable vue/no-mutating-props */

import type { PageNote } from 'src/code/pages/page/notes/note';

import ArrowLinkZones from './ArrowLinkZones/ArrowLinkZones.vue';
import NoteAnchor from './NoteAnchor.vue';
import NoteArrowHandles from './NoteArrowHandles/NoteArrowHandles.vue';
import NoteContent from './NoteContent.vue';
import NoteDivider from './NoteDivider.vue';
import NoteDropZones from './NoteDropZones/NoteDropZones.vue';
import NoteFrame from './NoteFrame.vue';
import NoteLinkIcon from './NoteLinkIcon.vue';
import NoteResizeHandles from './NoteResizeHandles/NoteResizeHandles.vue';
import NoteContainerSection from './NoteSection/NoteContainerSection/NoteContainerSection.vue';
import NoteTextSection from './NoteSection/NoteTextSection.vue';

defineEmits(['resize']);

const NoteContainerSection_ = NoteContainerSection as any;

const props = defineProps<{
  note: PageNote;
  index?: number;
}>();

provide('note', props.note);

watchEffect(() => {
  props.note.react.index = props.index ?? 0;
});
</script>
