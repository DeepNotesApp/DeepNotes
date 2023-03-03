<template>
  <div
    ref="containerElem"
    class="note-list-container"
    :class="{
      'hide-ui': hideUI,
    }"
    :style="{
      width: note.react.width.targetCSS,

      overflow: note.react.container.overflow ? 'auto' : 'visible',
    }"
  >
    <!-- Placeholder -->

    <div
      v-if="note.react.notes.length === 0"
      class="note-container-placeholder"
    >
      <div>Drag notes here or</div>
      <div>double-click to create.</div>

      <!-- Initial dropzone -->

      <NoteDropZone
        :parent-note="note"
        always-visible
        style="top: 0; bottom: 0"
        @dblclick.left="onLeftDoubleClick"
      />
    </div>

    <div
      ref="frameElem"
      class="note-container-frame"
      :style="{
        'flex-direction': note.react.collab.container.horizontal
          ? 'row'
          : 'column',
        'flex-wrap': note.react.collab.container.wrapChildren
          ? 'wrap'
          : undefined,

        height:
          !note.react.collab.container.horizontal &&
          note.react.collab.container.wrapChildren
            ? '100%'
            : undefined,
      }"
    >
      <!-- Children -->

      <template
        v-for="(childNote, index) in note.react.notes"
        :key="childNote?.id ?? index"
      >
        <div
          class="note-container-child"
          :style="{
            'flex-direction': note.react.collab.container.horizontal
              ? 'row'
              : 'column',
            width:
              !note.react.collab.container.horizontal &&
              note.react.collab.container.stretchChildren
                ? 'calc(100% - 6px)'
                : undefined,
          }"
        >
          <DisplayNote
            :note="childNote"
            :index="index"
            @resize="
              () => {
                void onResize();

                void updateChildPositions();
              }
            "
          />

          <div style="position: relative">
            <NoteDropZone
              v-if="index < note.react.notes.length - 1"
              :parent-note="note"
              always-visible
              :index="index + 1"
              style="position: absolute; min-width: 6px; min-height: 6px"
              @dblclick.left="onLeftDoubleClick($event, index + 1)"
            />
          </div>
        </div>
      </template>

      <!-- Last drop zone -->

      <div style="flex: 1; position: relative">
        <NoteDropZone
          :parent-note="note"
          always-visible
          style="right: 3px; bottom: 3px"
          :style="{
            left: note.react.collab.container.horizontal ? '-3px' : '3px',
            top: note.react.collab.container.horizontal ? '3px' : '-3px',
          }"
          @dblclick.left="onLeftDoubleClick"
        />
      </div>

      <DisplayArrows :region="note" />
      <InterregionalArrows :region="note" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { debounce } from 'lodash';
import type { PageNote } from 'src/code/pages/page/notes/note.client';
import type { Page } from 'src/code/pages/page/page.client';
import { useResizeObserver } from 'src/code/utils.universal';

import DisplayArrows from '../../../DisplayArrows.vue';
import InterregionalArrows from '../../../InterregionalArrows.vue';
import DisplayNote from '../../DisplayNote.vue';
import NoteDropZone from '../../NoteDropZones/NoteDropZone.vue';

const page = inject<Page>('page')!;
const note = inject<PageNote>('note')!;

async function onLeftDoubleClick(event: MouseEvent, destIndex?: number) {
  const clientTopLeft = note.getContainerClientRect()?.topLeft;

  if (clientTopLeft == null) {
    return;
  }

  const clientPos = page.pos.eventToClient(event);

  const worldPos = page.sizes.screenToWorld2D(clientPos.sub(clientTopLeft));

  await page.notes.create(note, worldPos, false, destIndex);
}

// Track overflow

const containerElem = ref<Element>();
const frameElem = ref<Element>();

const hideUI = ref(false);

const updateChildPositions = debounce(async () => {
  mainLogger().info('updateChildPositions %o', note.id);

  await nextTick();

  const originPos = note.getOriginWorldPos();

  if (originPos == null) {
    return;
  }

  for (const childNote of note.react.notes) {
    const noteElem = childNote.getElem('note-frame');

    if (noteElem == null) {
      continue;
    }

    const noteClientRect = noteElem.getBoundingClientRect();

    const worldTopLeft = page.pos.clientToWorld(
      page.rects.fromDOM(noteClientRect).topLeft,
    );

    childNote.react.offsetInList = worldTopLeft.sub(originPos);
  }
}, 100);

watch(
  () => note.react.notes,
  () => {
    void onResize();

    void updateChildPositions();
  },
);

const onResize = debounce(async function () {
  // Update overflow

  hideUI.value = true;

  await nextTick();

  if (containerElem.value == null) {
    return;
  }

  note.react.container.overflow =
    containerElem.value.scrollWidth > containerElem.value.clientWidth ||
    containerElem.value.scrollHeight > containerElem.value.clientHeight;

  hideUI.value = false;
});

useResizeObserver(
  () => containerElem.value!,
  () => onResize(),
);

useResizeObserver(
  () => frameElem.value!,
  () => {
    void onResize();

    void updateChildPositions();
  },
);
</script>

<style scoped>
.note-list-container {
  flex: 1;

  display: flex;
  align-content: flex-start;
  flex-direction: column;

  touch-action: pan-x pan-y !important;

  position: relative;

  padding: 4px;
}

.note-container-frame {
  flex: 1;

  display: flex;

  position: relative;

  align-content: flex-start;
}

.note-container-placeholder {
  position: relative;

  margin: 3px;

  width: calc(100% - 6px);
  height: calc(100% - 6px);

  border-radius: 4px;

  overflow: hidden;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  color: #e0e0e0;
  font-size: 12px;
}

.note-container-drop-zone {
  background-color: #42a5f5;

  opacity: 0;
}
.note-container-drop-zone.active {
  opacity: 0.25;
}

.note-container-child {
  flex: none;

  display: flex;

  margin: 3px;
}
</style>
