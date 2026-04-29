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
</style>
