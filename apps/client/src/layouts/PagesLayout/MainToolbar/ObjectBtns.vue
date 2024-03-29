<template>
  <ToolbarBtn
    :tooltip="`Ordered list\n(${getCtrlKeyName()} + Shift + 7)`"
    icon="mdi-format-list-numbered"
    icon-size="24px"
    :disable="page.react.readOnly || !page.activeElem.react.exists"
    @click="page.selection.format((chain) => chain.toggleOrderedList())"
  />
  <ToolbarBtn
    :tooltip="`Bullet list\n(${getCtrlKeyName()} + Shift + 8)`"
    icon="mdi-format-list-bulleted"
    icon-size="24px"
    :disable="page.react.readOnly || !page.activeElem.react.exists"
    @click="page.selection.format((chain) => chain.toggleBulletList())"
  />
  <ToolbarBtn
    :tooltip="`Checklist\n(${getCtrlKeyName()} + Shift + 9)`"
    icon="mdi-checkbox-marked-outline"
    icon-size="22px"
    :disable="page.react.readOnly || !page.activeElem.react.exists"
    @click="page.selection.format((chain) => chain.toggleTaskList())"
  />

  <ToolbarBtn
    :tooltip="`Inline math\n(${getCtrlKeyName()} + M)`"
    icon="mdi-sigma-lower"
    icon-size="24px"
    :disable="page.react.readOnly || !page.activeElem.react.exists"
    @click="page.selection.format((chain) => chain.addInlineMath())"
  />
  <ToolbarBtn
    :tooltip="`Math block\n(${getCtrlKeyName()} + Shift + M)`"
    icon="mdi-sigma"
    icon-size="24px"
    :disable="page.react.readOnly || !page.activeElem.react.exists"
    @click="page.selection.format((chain) => chain.addMathBlock())"
  />

  <q-separator
    vertical
    :class="{ popup }"
  />

  <ToolbarBtn
    :tooltip="`Blockquote\n(${getAltKeyName()} + Shift + Q)`"
    icon="mdi-format-quote-close"
    icon-size="23px"
    :disable="page.react.readOnly || !page.activeElem.react.exists"
    @click="page.selection.format((chain) => chain.toggleBlockquote())"
  />
  <ToolbarBtn
    :tooltip="`Codeblock\n(${getAltKeyName()} + Shift + C)`"
    icon="mdi-code-braces"
    icon-size="23px"
    :disable="page.react.readOnly || !page.activeElem.react.exists"
    @click="page.selection.format((chain) => chain.toggleCodeBlock())"
  />
  <ToolbarBtn
    :tooltip="`Rule\n(${getAltKeyName()} + Shift + R)`"
    icon="mdi-minus"
    icon-size="23px"
    :disable="page.react.readOnly || !page.editing.react.active"
    @click="page.selection.format((chain) => chain.setHorizontalRule())"
  />

  <ToolbarBtn
    :tooltip="`Image\n(${getAltKeyName()} + Shift + I)`"
    icon="mdi-image"
    icon-size="23px"
    :disable="page.react.readOnly || !page.editing.react.active"
    @click="$q.dialog({ component: InsertImageDialog })"
  />

  <ToolbarBtn
    :tooltip="`YouTube video\n(${getAltKeyName()} + Shift + Y)`"
    icon="mdi-youtube"
    icon-size="24px"
    :disable="page.react.readOnly || !page.editing.react.active"
    @click="
      $q.dialog({
        title: 'Insert YouTube video',
        message: 'Enter the video URL:',

        prompt: {
          type: 'url',
          model: '',
          filled: true,
        },
        color: 'primary',

        cancel: { flat: true, color: 'negative' },

        focus: 'cancel',
      }).onOk((url: string) =>
        page.selection.format((chain) =>
          chain.setYoutubeVideo({
            src: url,
          }),
        ),
      )
    "
  />

  <q-separator
    vertical
    :class="{ popup }"
  />

  <ToolbarBtn
    :tooltip="`Insert table\n(${getAltKeyName()} + Shift + T)`"
    icon="mdi-table-large-plus"
    icon-size="23px"
    :disable="page.react.readOnly || !page.editing.react.active"
    @click="
      page.selection.format((chain) =>
        chain.insertTable({
          rows: 3,
          cols: 3,
          withHeaderRow: false,
        }),
      )
    "
  />
  <ToolbarBtn
    tooltip="Remove table"
    icon="mdi-table-large-remove"
    icon-size="23px"
    :disable="page.react.readOnly || !page.editing.react.active"
    @click="page.selection.format((chain) => chain.deleteTable())"
  />
  <ToolbarBtn
    tooltip="Insert column before"
    icon="mdi-table-column-plus-before"
    icon-size="23px"
    :disable="page.react.readOnly || !page.editing.react.active"
    @click="page.selection.format((chain) => chain.addColumnBefore())"
  />
  <ToolbarBtn
    tooltip="Insert column after"
    icon="mdi-table-column-plus-after"
    icon-size="23px"
    :disable="page.react.readOnly || !page.editing.react.active"
    @click="page.selection.format((chain) => chain.addColumnAfter())"
  />
  <ToolbarBtn
    tooltip="Remove column"
    icon="mdi-table-column-remove"
    icon-size="23px"
    :disable="page.react.readOnly || !page.editing.react.active"
    @click="page.selection.format((chain) => chain.deleteColumn())"
  />

  <q-separator
    vertical
    :class="{ popup }"
  />

  <ToolbarBtn
    tooltip="Merge cells"
    icon="mdi-table-merge-cells"
    icon-size="23px"
    :disable="page.react.readOnly || !page.editing.react.active"
    @click="page.selection.format((chain) => chain.mergeCells())"
  />
  <ToolbarBtn
    tooltip="Split cell"
    icon="mdi-table-split-cell"
    icon-size="23px"
    :disable="page.react.readOnly || !page.editing.react.active"
    @click="page.selection.format((chain) => chain.splitCell())"
  />
  <ToolbarBtn
    tooltip="Insert row before"
    icon="mdi-table-row-plus-before"
    icon-size="23px"
    :disable="page.react.readOnly || !page.editing.react.active"
    @click="page.selection.format((chain) => chain.addRowBefore())"
  />
  <ToolbarBtn
    tooltip="Insert row after"
    icon="mdi-table-row-plus-after"
    icon-size="23px"
    :disable="page.react.readOnly || !page.editing.react.active"
    @click="page.selection.format((chain) => chain.addRowAfter())"
  />
  <ToolbarBtn
    tooltip="Remove row"
    icon="mdi-table-row-remove"
    icon-size="23px"
    :disable="page.react.readOnly || !page.editing.react.active"
    @click="page.selection.format((chain) => chain.deleteRow())"
  />
</template>

<script setup lang="ts">
import { getAltKeyName, getCtrlKeyName } from 'src/code/utils/misc';

import InsertImageDialog from './InsertImageDialog.vue';

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
