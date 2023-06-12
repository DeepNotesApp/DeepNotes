<template>
  <ToolbarBtn
    :tooltip="`Cut\n(${getCtrlKeyName()} + X)`"
    icon="mdi-content-cut"
    :disable="page.react.readOnly || !page.activeElem.react.exists"
    @click="page.selection.cut()"
  />
  <ToolbarBtn
    :tooltip="`Copy\n(${getCtrlKeyName()} + C)`"
    icon="mdi-content-copy"
    :disable="!page.activeElem.react.exists"
    @click="page.selection.copy()"
  />
  <ToolbarBtn
    :tooltip="`Paste\n(${getCtrlKeyName()} + V)`"
    icon="mdi-content-paste"
    :disable="page.react.readOnly"
    @click="page.selection.paste()"
  />
  <ToolbarBtn
    :tooltip="`Duplicate\n(${getCtrlKeyName()} + D)`"
    icon="mdi-content-duplicate"
    :disable="page.react.readOnly || !page.activeElem.react.exists"
    @click="page.cloning.perform()"
  />

  <q-separator
    vertical
    :class="{ popup }"
  />

  <ToolbarBtn
    :tooltip="`Select all\n(${getCtrlKeyName()} + A)`"
    icon="mdi-select-all"
    icon-size="24px"
    @click="page.selection.selectAll()"
  />
  <ToolbarBtn
    :tooltip="`Delete\n(Del)`"
    icon="mdi-delete-outline"
    icon-size="24px"
    :disable="page.react.readOnly || !page.activeElem.react.exists"
    @click="page.deleting.perform()"
  />
</template>

<script setup lang="ts">
import { getCtrlKeyName } from 'src/code/utils/misc';

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
