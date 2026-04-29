<script setup lang="ts">
import type { Editor } from "@tiptap/vue-3";
import { EditorContent } from "@tiptap/vue-3";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

defineProps<{
  editor: Editor | undefined;
  yStateBytes: number;
  yFragProsemirror: string;
  yTextDefault: string;
}>();
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Tiptap + Yjs</CardTitle>
      <CardDescription>
        {{ yStateBytes }} byte(s) in
        <code class="font-mono text-xs">encodeStateAsUpdateV2</code> — rich
        text syncs the ProseMirror
        <code class="font-mono text-xs">Y.XmlFragment</code> (field
        <code class="font-mono text-xs">{{ yFragProsemirror }}</code>
        ).
        When the collab WebSocket is connected, Yjs updates and encrypted awareness (caret/selection)
        use the legacy wire frame via
        <code class="font-mono text-xs">WebSocket …/collab-ws</code>; otherwise
        debounced
        <code class="font-mono text-xs">POST …/collab-updates</code>
        (Yjs v2:
        <code class="font-mono text-xs">PageDocUpdate</code>
        and
        <code class="font-mono text-xs">PageAwarenessUpdate</code>
        AAD).
        Plain
        <code class="font-mono text-xs">Y.Text("{{ yTextDefault }}")</code>
        from earlier builds is migrated into the editor once.
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-2">
      <div
        class="border-input bg-background w-full overflow-hidden rounded-md border"
      >
        <template v-if="editor">
          <EditorContent :editor="editor" class="tiptap-editor" />
        </template>
      </div>
    </CardContent>
  </Card>
</template>

<style scoped>
:deep(.collaboration-carets__caret) {
  position: relative;
  border-left: 2px solid;
  margin-left: -1px;
  margin-right: -1px;
  pointer-events: none;
  word-break: normal;
}

:deep(.collaboration-carets__label) {
  position: absolute;
  top: -1.4em;
  left: -1px;
  z-index: 10;
  font-size: 0.65rem;
  font-weight: 600;
  line-height: 1.2;
  color: white;
  padding: 0.1rem 0.35rem;
  border-radius: 0.2rem;
  white-space: nowrap;
  pointer-events: none;
  user-select: none;
}

:deep(.collaboration-carets__selection) {
  border-radius: 2px;
  pointer-events: none;
}

:deep(.tiptap-editor .ProseMirror p.is-editor-empty:first-child::before) {
  color: var(--muted-foreground);
  content: attr(data-placeholder);
  float: left;
  height: 0;
  pointer-events: none;
}

:deep(.tiptap-editor .ProseMirror table) {
  border-collapse: collapse;
  table-layout: fixed;
  width: 100%;
  margin: 0.75rem 0;
  overflow: hidden;
}

:deep(.tiptap-editor .ProseMirror td),
:deep(.tiptap-editor .ProseMirror th) {
  min-width: 1em;
  border: 1px solid var(--border);
  padding: 0.25rem 0.5rem;
  vertical-align: top;
  box-sizing: border-box;
  position: relative;
}

:deep(.tiptap-editor .ProseMirror th) {
  font-weight: 600;
  text-align: left;
  background: color-mix(in oklab, var(--muted) 55%, transparent);
}

:deep(.tiptap-editor .ProseMirror ul[data-type="taskList"]) {
  list-style: none;
  padding-left: 0;
}

:deep(.tiptap-editor .ProseMirror ul[data-type="taskList"] li) {
  display: flex;
  gap: 0.35rem;
}

:deep(.tiptap-editor .ProseMirror img) {
  max-width: 100%;
  height: auto;
}

:deep(.tiptap-editor .ProseMirror pre) {
  margin: 0.75rem 0;
  padding: 0.75rem 1rem;
  border-radius: 0.375rem;
  font-family: ui-monospace, monospace;
  font-size: 0.8rem;
  overflow-x: auto;
  background: color-mix(in oklab, var(--muted) 88%, #0d1117);
}

:deep(.tiptap-editor .ProseMirror[data-youtube-video]) {
  margin: 0.5rem 0;
}

/* YouTube node view sets width/height on `.youtube-iframe`; avoid overriding with fluid aspect-ratio */
:deep(.tiptap-editor .ProseMirror .youtube-iframe) {
  max-width: 100%;
  border: 0;
}
</style>
