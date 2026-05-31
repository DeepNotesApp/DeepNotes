<script setup lang="ts">
import { EditorContent } from "@tiptap/vue-3";
import * as Y from "yjs";

import { useNoteEditor } from "./useNoteEditor";

const props = defineProps<{
  fragment: Y.XmlFragment;
  editable?: boolean;
  placeholder?: string;
}>();

const { editor } = useNoteEditor({
  fragment: props.fragment,
  editable: props.editable,
  placeholder: props.placeholder,
});
</script>

<template>
  <div
    class="border-border bg-background w-full overflow-hidden rounded-sm border"
  >
    <EditorContent
      v-if="editor"
      :editor="editor"
      class="note-tiptap-editor"
    />
  </div>
</template>

<style scoped>
:deep(.note-tiptap-editor) {
  overscroll-behavior: contain;
}

:deep(.note-tiptap-editor .ProseMirror) {
  overscroll-behavior: contain;
}

:deep(.note-tiptap-editor .ProseMirror p.is-editor-empty:first-child::before) {
  color: var(--muted-foreground);
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}

:deep(.note-tiptap-editor .ProseMirror table) {
  border-collapse: collapse;
  table-layout: fixed;
  width: 100%;
  margin: 0.5rem 0;
  overflow: hidden;
}

:deep(.note-tiptap-editor .ProseMirror td),
:deep(.note-tiptap-editor .ProseMirror th) {
  min-width: 1em;
  border: 1px solid var(--border);
  padding: 0.2rem 0.4rem;
  vertical-align: top;
  box-sizing: border-box;
  position: relative;
}

:deep(.note-tiptap-editor .ProseMirror th) {
  font-weight: 600;
  text-align: left;
  background: color-mix(in oklab, var(--muted) 55%, transparent);
}

:deep(.note-tiptap-editor .ProseMirror ul[data-type="taskList"]) {
  list-style: none;
  padding-left: 0;
}

:deep(.note-tiptap-editor .ProseMirror ul[data-type="taskList"] li) {
  display: flex;
  gap: 0.35rem;
}

:deep(.note-tiptap-editor .ProseMirror img) {
  max-width: 100%;
  height: auto;
}

:deep(.note-tiptap-editor .ProseMirror pre) {
  margin: 0.5rem 0;
  padding: 0.5rem 0.75rem;
  border-radius: 0.25rem;
  font-family: ui-monospace, monospace;
  font-size: 0.75rem;
  overflow-x: auto;
  background: color-mix(in oklab, var(--muted) 88%, #0d1117);
}

:deep(.note-tiptap-editor .ProseMirror[data-youtube-video]) {
  margin: 0.35rem 0;
}

:deep(.note-tiptap-editor .ProseMirror .youtube-iframe) {
  max-width: 100%;
  border: 0;
}
</style>
