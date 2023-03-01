<template>
  <ToolbarBtn
    tooltip="Align left"
    icon="mdi-align-horizontal-left"
    icon-size="25px"
    :disable="page.react.readOnly || page.selection.react.notes.length < 2"
    @click="page.aligning.alignLeft()"
  />
  <ToolbarBtn
    tooltip="Centralize horizontally"
    icon="mdi-align-horizontal-center"
    icon-size="25px"
    :disable="page.react.readOnly || page.selection.react.notes.length < 2"
    @click="page.aligning.alignCenterHorizontal()"
  />
  <ToolbarBtn
    tooltip="Align right"
    icon="mdi-align-horizontal-right"
    icon-size="25px"
    :disable="page.react.readOnly || page.selection.react.notes.length < 2"
    @click="page.aligning.alignRight()"
  />

  <q-separator
    vertical
    :class="{ popup }"
  />

  <ToolbarBtn
    tooltip="Align top"
    icon="mdi-align-vertical-top"
    icon-size="25px"
    :disable="page.react.readOnly || page.selection.react.notes.length < 2"
    @click="page.aligning.alignTop()"
  />
  <ToolbarBtn
    tooltip="Centralize vertically"
    icon="mdi-align-vertical-center"
    icon-size="25px"
    :disable="page.react.readOnly || page.selection.react.notes.length < 2"
    @click="page.aligning.alignCenterVertical()"
  />
  <ToolbarBtn
    tooltip="Align bottom"
    icon="mdi-align-vertical-bottom"
    icon-size="25px"
    :disable="page.react.readOnly || page.selection.react.notes.length < 2"
    @click="page.aligning.alignBottom()"
  />
</template>

<script setup lang="ts">
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
