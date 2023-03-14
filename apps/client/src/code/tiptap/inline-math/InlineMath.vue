<!-- eslint-disable vue/no-mutating-props -->
<template>
  <NodeViewWrapper
    as="span"
    class="inline-math"
  >
    <span
      contentEditable="false"
      draggable="true"
      data-drag-handle
      v-html="renderedFormula"
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
          :model-value="node.attrs.content"
          @update:model-value="(value) => updateAttributes({ content: value })"
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
  if (!props.node.attrs.content) {
    return '[Enter formula]';
  }

  return katex.renderToString(props.node.attrs.content, {
    throwOnError: false,
    strict: false,
    displayMode: false,
    output: 'mathml',
  });
});
</script>
