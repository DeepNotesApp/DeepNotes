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
  <ToolbarBtn
    :tooltip="`Take screenshot`"
    icon="mdi-camera-outline"
    @click="takeScreenshot()"
  />

  <q-separator
    vertical
    :class="{ popup }"
  />

  <ToolbarBtn
    :tooltip="`Undo\n(${getCtrlKeyName()} + Z)`"
    icon="mdi-undo"
    :disable="page.react.readOnly || !page.undoRedo.react.canUndo"
    @click="page.undoRedo.undo()"
  />
  <ToolbarBtn
    :tooltip="`Redo\n(${getCtrlKeyName()} + Y)`"
    icon="mdi-redo"
    :disable="page.react.readOnly || !page.undoRedo.react.canRedo"
    @click="page.undoRedo.redo()"
  />

  <q-separator
    v-if="!popup"
    vertical
  />

  <ToolbarBtn
    :tooltip="`Select all\n(${getCtrlKeyName()} + A)`"
    icon="mdi-select-all"
    icon-size="24px"
    @click="page.selection.selectAll()"
  />
  <ToolbarBtn
    :tooltip="`Delete\n(Delete)`"
    icon="mdi-delete-outline"
    icon-size="24px"
    :disable="page.react.readOnly || !page.activeElem.react.exists"
    @click="page.deleting.perform()"
  />
</template>

<script setup lang="ts">
import download from 'downloadjs';
import html2canvas from 'html2canvas';
import type { IRegionElemsOutput } from 'src/code/pages/page/regions/region';
import { getCtrlKeyName } from 'src/code/utils';

defineProps<{
  popup?: boolean;
}>();

const page = computed(() => internals.pages.react.page);

async function takeScreenshot() {
  let regionElems: IRegionElemsOutput;

  if (
    page.value.selection.react.notes.length > 0 ||
    page.value.selection.react.arrows.length > 0
  ) {
    regionElems = page.value.selection.react;
  } else {
    regionElems = page.value.react;
  }

  const worldRect = page.value.regions.getWorldRect(regionElems);

  if (worldRect == null) {
    return;
  }

  const displayRect = page.value.rects.worldToDisplay(worldRect);

  const margin = 100;

  const selectedElems = page.value.selection.react.elems;
  page.value.selection.clear();

  await nextTick();

  const canvas = await html2canvas(
    document.querySelector(
      `.display-world[data-page-id="${page.value.id}"]`,
    ) as HTMLElement,
    {
      scale: 1 / page.value.camera.react.zoom,

      x: -margin * page.value.camera.react.zoom + displayRect.topLeft.x,
      y: -margin * page.value.camera.react.zoom + displayRect.topLeft.y,

      width: Math.round(
        (margin + worldRect.size.x + margin) * page.value.camera.react.zoom,
      ),
      height: Math.round(
        (margin + worldRect.size.y + margin) * page.value.camera.react.zoom,
      ),

      useCORS: true,
      allowTaint: true,
    },
  );

  page.value.selection.set(...selectedElems);

  const dataUrl = canvas.toDataURL('image/png');

  download(dataUrl, 'screenshot.png', 'image/png');
}
</script>

<style scoped>
.q-separator {
  margin: 6px 7px;
}
.q-separator.popup {
  margin: 0;
}
</style>
