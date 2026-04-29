<script setup lang="ts">
import type { NodeViewProps } from "@tiptap/vue-3";
import { NodeViewWrapper } from "@tiptap/vue-3";
import katex from "katex";
import { computed, ref, watch } from "vue";

import { Input } from "@/components/ui/input";

const props = defineProps<NodeViewProps>();

const editorOpen = ref(false);
const draft = ref("");

watch(editorOpen, (open) => {
  if (!props.editor.isEditable && open) {
    editorOpen.value = false;
  }
  if (open) {
    draft.value = String(props.node.attrs.input ?? "");
  }
});

const renderedFormula = computed(() => {
  const raw = String(props.node.attrs.input ?? "").trim();
  if (!raw) {
    return '<span class="opacity-60 italic">[formula]</span>';
  }
  return katex.renderToString(raw, {
    throwOnError: false,
    strict: false,
    displayMode: false,
    output: "html",
  });
});

function onChipClick() {
  if (!props.editor.isEditable) {
    return;
  }
  editorOpen.value = !editorOpen.value;
}

function commit() {
  props.updateAttributes({ input: draft.value });
  editorOpen.value = false;
}
</script>

<template>
  <NodeViewWrapper as="span" class="relative inline align-baseline">
    <span
      class="inline-math rounded px-0.5 text-[15px] italic transition-colors select-none"
      contenteditable="false"
      draggable="true"
      data-drag-handle
      :class="{
        'ring-2 ring-primary/40': selected && editor.isEditable,
        'cursor-pointer hover:bg-muted/80': editor.isEditable,
      }"
      @click.stop="onChipClick"
      v-html="renderedFormula"
    />

    <div
      v-if="editorOpen"
      class="bg-popover text-popover-foreground absolute left-0 z-50 mt-2 min-w-[240px] rounded-md border p-2 shadow-md"
      @click.stop
    >
      <label class="mb-1 block text-xs text-muted-foreground"> LaTeX </label>
      <Input
        v-model="draft"
        class="font-mono text-xs"
        placeholder="E = mc^2"
        @keydown.enter.prevent="commit"
        @keydown.escape.prevent="editorOpen = false"
      />
      <div class="mt-2 flex justify-end gap-2">
        <button
          type="button"
          class="text-muted-foreground text-xs hover:underline"
          @click="editorOpen = false"
        >
          Cancel
        </button>
        <button
          type="button"
          class="text-primary text-xs font-medium hover:underline"
          @click="commit"
        >
          Apply
        </button>
      </div>
    </div>
  </NodeViewWrapper>
</template>
