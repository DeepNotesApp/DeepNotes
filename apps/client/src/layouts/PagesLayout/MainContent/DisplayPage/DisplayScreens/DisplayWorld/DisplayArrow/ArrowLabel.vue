<template>
  <div
    class="arrow-label-anchor"
    :style="{
      left: `${arrow.react.centerPos.x}px`,
      top: `${arrow.react.centerPos.y}px`,
    }"
  >
    <div
      v-if="editor != null && !isTiptapEditorEmpty(editor)"
      class="arrow-label-background"
    ></div>

    <TextEditor
      v-if="arrow.react.valid"
      :editor="editor"
      :class="{ editing: arrow.react.editing }"
      @pointerdown.left.stop="onLeftPointerDown"
      @dblclick.left="onLeftDoubleClick"
    />
  </div>
</template>

<script setup lang="ts">
import { Y } from '@syncedstore/core';
import type { PageArrow } from 'src/code/pages/page/arrows/arrow';
import type { Page } from 'src/code/pages/page/page';
import { isTiptapEditorEmpty } from 'src/code/tiptap/utils';

const props = defineProps<{
  arrow: PageArrow;
}>();

const page = inject<Page>('page')!;

const editor = internals.tiptap().useEditor({
  content:
    props.arrow.react.collab.label instanceof Y.XmlFragment
      ? undefined
      : props.arrow.react.collab.label,

  editable: false,

  extensions: [
    ...internals.tiptap().extensions(),

    ...(props.arrow.react.collab.label instanceof Y.XmlFragment
      ? [
          internals.tiptap().Collaboration.configure({
            fragment: props.arrow.react.collab.label,
          }),
          internals.tiptap().CollaborationCursor.configure({
            provider: page.collab.websocket,
          }),
        ]
      : []),
  ],

  onBeforeCreate({ editor }: any) {
    props.arrow!.react.editor = editor;
  },
  onCreate() {
    mainLogger().info(`Arrow Editor loaded (${props.arrow.id})`);
  },
  onDestroy() {
    props.arrow!.react.editor = null;
  },
});

function onLeftPointerDown(event: PointerEvent) {
  page.clickSelection.perform(props.arrow, event);
}

async function onLeftDoubleClick() {
  await page.editing.start(props.arrow);
}
</script>

<style scoped lang="scss">
.arrow-label-anchor {
  position: absolute;

  transform: translate(-50%, -50%);
}

.arrow-label-background {
  position: absolute;
  inset: 8px 3px;

  border-radius: 5px;

  background-color: #181818;
}

.text-editor {
  :deep() {
    .ProseMirror {
      padding: 9px;

      text-align: left;
    }
  }

  &.editing :deep() {
    * {
      user-select: auto;
    }
  }
}
</style>
