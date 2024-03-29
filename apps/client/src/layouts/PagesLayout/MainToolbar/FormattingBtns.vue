<template>
  <ToolbarBtn
    :tooltip="`Bold\n(${getCtrlKeyName()} + B)`"
    icon="mdi-format-bold"
    icon-size="25px"
    :disable="page.react.readOnly || !page.activeElem.react.exists"
    @click="page.selection.toggleMark('bold')"
  />
  <ToolbarBtn
    :tooltip="`Italic\n(${getCtrlKeyName()} + I)`"
    icon="mdi-format-italic"
    icon-size="25px"
    :disable="page.react.readOnly || !page.activeElem.react.exists"
    @click="page.selection.toggleMark('italic')"
  />
  <ToolbarBtn
    :tooltip="`Strikethrough\n(${getCtrlKeyName()} + Shift + X)`"
    icon="mdi-format-strikethrough"
    icon-size="25px"
    :disable="page.react.readOnly || !page.activeElem.react.exists"
    @click="page.selection.toggleMark('strike')"
  />
  <ToolbarBtn
    :tooltip="`Underline\n(${getCtrlKeyName()} + U)`"
    icon="mdi-format-underline"
    icon-size="25px"
    :disable="page.react.readOnly || !page.activeElem.react.exists"
    @click="page.selection.toggleMark('underline')"
  />
  <ToolbarBtn
    :tooltip="`Clear formatting\n(${getCtrlKeyName()} + Space)`"
    icon="mdi-format-clear"
    icon-size="24px"
    :disable="page.react.readOnly || !page.activeElem.react.exists"
    @click="
      page.selection.format((chain) => chain.clearNodes().unsetAllMarks())
    "
  />

  <q-separator
    vertical
    :class="{ popup }"
  />

  <ToolbarBtn
    :tooltip="`Align left\n(${getCtrlKeyName()} + Shift + L)`"
    icon="mdi-format-align-left"
    icon-size="21px"
    :disable="page.react.readOnly || !page.activeElem.react.exists"
    @click="page.selection.format((chain) => chain.setTextAlign('left'))"
  />
  <ToolbarBtn
    :tooltip="`Align center\n(${getCtrlKeyName()} + Shift + E)`"
    icon="mdi-format-align-center"
    icon-size="21px"
    :disable="page.react.readOnly || !page.activeElem.react.exists"
    @click="page.selection.format((chain) => chain.setTextAlign('center'))"
  />
  <ToolbarBtn
    :tooltip="`Align right\n(${getCtrlKeyName()} + Shift + R)`"
    icon="mdi-format-align-right"
    icon-size="21px"
    :disable="page.react.readOnly || !page.activeElem.react.exists"
    @click="page.selection.format((chain) => chain.setTextAlign('right'))"
  />
  <ToolbarBtn
    :tooltip="`Justify\n(${getCtrlKeyName()} + Shift + J)`"
    icon="mdi-format-align-justify"
    icon-size="21px"
    :disable="page.react.readOnly || !page.activeElem.react.exists"
    @click="page.selection.format((chain) => chain.setTextAlign('justify'))"
  />
  <ToolbarBtn
    :tooltip="`Highlight\n(${getCtrlKeyName()} + Shift + H)`"
    icon="mdi-marker"
    icon-size="20px"
    style="padding-top: 1px"
    :disable="page.react.readOnly || !page.activeElem.react.exists"
    @click="page.selection.format((chain) => chain.toggleHighlight())"
  />

  <q-separator
    vertical
    :class="{ popup }"
  />

  <ToolbarBtn
    :tooltip="`Subscript\n(${getCtrlKeyName()} + ,)`"
    icon="mdi-format-subscript"
    icon-size="23px"
    :disable="page.react.readOnly || !page.activeElem.react.exists"
    @click="page.selection.toggleMark('subscript')"
  />
  <ToolbarBtn
    :tooltip="`Superscript\n(${getCtrlKeyName()} + .)`"
    icon="mdi-format-superscript"
    icon-size="23px"
    :disable="page.react.readOnly || !page.activeElem.react.exists"
    @click="page.selection.toggleMark('superscript')"
  />
  <ToolbarBtn
    :tooltip="`Insert link\n(${getCtrlKeyName()} + K)`"
    icon="mdi-link"
    icon-size="24px"
    :disable="page.react.readOnly || !page.activeElem.react.exists"
    @click="$q.dialog({ component: InsertLinkDialog })"
  />
  <ToolbarBtn
    :tooltip="`Remove link\n(${getCtrlKeyName()} + Shift + K)`"
    icon="mdi-link-off"
    icon-size="24px"
    :disable="page.react.readOnly || !page.activeElem.react.exists"
    @click="page.selection.format((chain) => chain.unsetMark('link'))"
  />
  <ToolbarBtn
    :tooltip="`Code\n(${getCtrlKeyName()} + E)`"
    icon="mdi-code-tags"
    icon-size="23px"
    :disable="page.react.readOnly || !page.activeElem.react.exists"
    @click="page.selection.toggleMark('code')"
  />

  <q-separator
    vertical
    :class="{ popup }"
  />

  <ToolbarBtn
    :tooltip="`Heading 1\n(${getAltKeyName()} + 1)`"
    icon="mdi-format-header-1"
    icon-size="24px"
    :disable="page.react.readOnly || !page.activeElem.react.exists"
    @click="page.selection.toggleNode('heading', { level: 1 })"
  />
  <ToolbarBtn
    :tooltip="`Heading 2\n(${getAltKeyName()} + 2)`"
    icon="mdi-format-header-2"
    icon-size="24px"
    :disable="page.react.readOnly || !page.activeElem.react.exists"
    @click="page.selection.toggleNode('heading', { level: 2 })"
  />
  <ToolbarBtn
    :tooltip="`Heading 3\n(${getAltKeyName()} + 3)`"
    icon="mdi-format-header-3"
    icon-size="24px"
    :disable="page.react.readOnly || !page.activeElem.react.exists"
    @click="page.selection.toggleNode('heading', { level: 3 })"
  />
  <ToolbarBtn
    :tooltip="`Remove heading\n(${getAltKeyName()} + 0)`"
    icon="mdi-format-header-pound"
    icon-size="24px"
    :disable="page.react.readOnly || !page.activeElem.react.exists"
    @click="
      page.selection.format((chain, editor) =>
        unsetNode(editor, chain, 'heading'),
      )
    "
  />
</template>

<script setup lang="ts">
import { unsetNode } from 'src/code/tiptap/utils';
import { getAltKeyName, getCtrlKeyName } from 'src/code/utils/misc';

import InsertLinkDialog from './InsertLinkDialog.vue';

defineProps<{
  popup?: boolean;
}>();

const page = computed(() => internals.pages.react.page);
</script>

<style scoped>
.q-separator {
  margin: 6px 7px;
}
.q-separator.popup {
  margin: 0;
}
</style>
