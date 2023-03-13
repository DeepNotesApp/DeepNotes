<!-- eslint-disable vue/no-mutating-props -->
<template>
  <NodeViewWrapper ref="nodeViewWrapperElem">
    <div
      class="math-block"
      contentEditable="false"
      draggable="true"
      data-drag-handle
      v-html="renderedFormula"
      :style="{
        'background-color':
          editor.isEditable && selected ? 'rgba(0, 109, 210, 0.2)' : undefined,
      }"
    ></div>

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
    displayMode: true,
    output: 'mathml',
  });
});
</script>

<style scoped>
.math-block {
  border-radius: 4px;

  padding: 20px;

  text-align: center;
  font-style: italic;
  font-size: 18px;

  transition: background-color 0.1s ease-in-out;
}

.math-block,
.math-block :deep(*) {
  user-select: none !important;
}
</style>

<style>
.text-editor.editing .math-block:hover {
  cursor: pointer;

  background-color: rgba(255, 255, 255, 0.1);
}
</style>
