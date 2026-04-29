<script setup lang="ts">
import type { NodeViewProps } from "@tiptap/vue-3";
import { NodeViewWrapper } from "@tiptap/vue-3";
import katex from "katex";
import { computed, ref, watch } from "vue";

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
    return '<div class="opacity-60 italic text-center py-1">[block formula]</div>';
  }
  return katex.renderToString(raw, {
    throwOnError: false,
    strict: false,
    displayMode: true,
    output: "html",
  });
});

function onBlockClick() {
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
  <NodeViewWrapper class="relative my-2 block">
    <div
      class="math-block rounded px-3 py-1 text-center text-[16px] italic transition-colors select-none"
      contenteditable="false"
      draggable="true"
      data-drag-handle
      :class="{
        'ring-2 ring-primary/40': selected && editor.isEditable,
        'cursor-pointer hover:bg-muted/80': editor.isEditable,
      }"
      @click.stop="onBlockClick"
      v-html="renderedFormula"
    />

    <div
      v-if="editorOpen"
      class="bg-popover text-popover-foreground absolute left-1/2 z-50 mt-2 min-w-[280px] -translate-x-1/2 rounded-md border p-2 shadow-md"
      @click.stop
    >
      <label class="mb-1 block text-xs text-muted-foreground"> LaTeX </label>
      <textarea
        v-model="draft"
        class="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[72px] w-full rounded-md border px-3 py-2 text-xs font-mono focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        placeholder="\int_0^1 x\,dx"
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
