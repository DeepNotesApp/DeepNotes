<template>
  <TextEditor
    ref="editorElem"
    :editor="editor"
    :class="{
      'padding-fix': paddingFix,

      'no-wrap': !note.react.collab[props.section].wrap,

      overflow: overflow,

      editing: note.react.editing,

      'hide-ui': hideUI,
    }"
  />
</template>

<script setup lang="ts">
import { Y } from '@syncedstore/core';
import type { NoteTextSection, PageNote } from 'src/code/pages/page/notes/note';
import type { Page } from 'src/code/pages/page/page';
import { useResizeObserver } from 'src/code/utils';
import type { ComponentPublicInstance } from 'vue';

const props = defineProps<{
  section: NoteTextSection;
}>();

const page = inject<Page>('page')!;
const note = inject<PageNote>('note')!;

// Collapsed padding fix

const paddingFix = computed(
  () =>
    note.react.collab.collapsing.enabled &&
    props.section === note.react.topSection,
);

const value = note.react.collab[props.section].value;

function handleClick(
  editorView: any,
  pos: number,
  node: any,
  nodePos: number,
  event: MouseEvent,
) {
  if (
    node.type.name == 'taskItem' &&
    (event.target as any).matches('input[type="checkbox"]')
  ) {
    editorView.dispatch(
      editorView.state.tr.setNodeMarkup(nodePos, null, {
        checked: !node.attrs.checked,
      }),
    );

    return true;
  }
}

const editor = internals.tiptap().useEditor({
  content: value instanceof Y.XmlFragment ? undefined : value,

  editable: false,

  editorProps: {
    handleClickOn: handleClick,
    handleDoubleClickOn: handleClick,
    handleTripleClickOn: handleClick,
  },

  extensions: [
    ...internals.tiptap().extensions(),

    ...(value instanceof Y.XmlFragment
      ? [
          internals.tiptap().Collaboration.configure({
            fragment: value,
          }),
          internals.tiptap().CollaborationCursor.configure({
            provider: page.collab.websocket,
          }),
        ]
      : []),
  ],

  onBeforeCreate({ editor }: any) {
    note.react[props.section].editor = editor;
  },
  onCreate({ editor }) {
    mainLogger().info(`Note Editor loaded (${note.id})`);

    editor.setEditable(note.react.editing);
  },
  onDestroy() {
    note.react[props.section].editor = null;
  },

  onUpdate() {
    void updateOverflow();
  },

  onFocus() {
    page.editing.react.section = props.section;
  },
});

// Track overflow

const editorElem = ref<ComponentPublicInstance>();

const overflow = ref(false);

const hideUI = ref(false);

async function updateOverflow() {
  hideUI.value = true;

  await nextTick();

  const elem = editorElem.value?.$el.querySelector('.ProseMirror');

  if (elem == null) {
    return;
  }

  overflow.value =
    elem.scrollWidth > elem.clientWidth ||
    elem.scrollHeight > elem.clientHeight;

  hideUI.value = false;
}

useResizeObserver(
  async () => {
    await nextTick();

    return editorElem.value!.$el.querySelector('.ProseMirror');
  },
  () => updateOverflow(),
);
</script>

<style scoped lang="scss">
$note-padding: 9px;

.text-editor {
  height: 100%;

  :deep() {
    .ProseMirror {
      padding: $note-padding;

      min-width: MAX(100%, 1px + $note-padding * 2);
      max-width: 100%;

      height: 100%;

      text-align: left;
    }
  }

  &.padding-fix :deep() {
    .ProseMirror {
      padding-right: 0;
    }
  }
  &.no-wrap :deep() {
    .ProseMirror {
      white-space: pre;

      pre {
        white-space: pre;
      }
    }
  }

  &.overflow :deep() {
    .ProseMirror {
      overflow: auto;
    }
  }

  &.editing :deep() {
    * {
      user-select: auto;
    }
  }
}
</style>

<style>
.hide-ui .collaboration-cursor__label {
  display: none;
}
</style>
