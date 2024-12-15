<template>
  <NodeViewWrapper as="span">
    <span
      class="inline-math"
      contentEditable="false"
      draggable="true"
      data-drag-handle
      v-html="renderedFormula"
      :class="{
        selected: editor.isEditable && selected,
      }"
    ></span>

    <q-menu
      v-model="showFormulaEditor"
      anchor="bottom middle"
      self="top middle"
      :offset="[0, 8]"
      :transition-duration="200"
    >
      <div style="background-color: rgb(29, 29, 29); padding: 8px">
        <q-input
          :model-value="node.attrs.input"
          @update:model-value="(value) => updateAttributes({ input: value })"
          type="textarea"
          filled
          dense
          input-style="resize: none"
          autogrow
          autofocus
          placeholder="E = mc^2"
        />
      </div>
    </q-menu>
  </NodeViewWrapper>
</template>

<script setup lang="ts">
import type { NodeViewProps } from '@tiptap/vue-3';
import { NodeViewWrapper } from '@tiptap/vue-3';
import katex from 'katex';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Props extends NodeViewProps {}

const props = defineProps<Props>();

const showFormulaEditor = ref(false);

watch(showFormulaEditor, () => {
  if (!props.editor.isEditable) {
    showFormulaEditor.value = false;
  }
});

const renderedFormula = computed(() => {
  if (!props.node.attrs.input) {
    return '[Enter formula]';
  }

  return katex.renderToString(props.node.attrs.input, {
    throwOnError: false,
    strict: false,
    displayMode: false,
    output: 'html',
  });
});
</script>

<style scoped>
.inline-math {
  border-radius: 4px;

  text-align: center;
  font-style: italic;
  font-size: 15px;

  transition: background-color 0.1s ease-in-out;
}

.inline-math,
.inline-math :deep(*) {
  user-select: none !important;
}
</style>

<style>
.text-editor.editing .inline-math:hover {
  cursor: pointer;

  background-color: rgba(255, 255, 255, 0.1);
}
.text-editor.editing .inline-math.selected {
  background-color: rgba(0, 109, 210, 0.2);
}
</style>
