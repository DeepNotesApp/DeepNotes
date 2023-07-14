<template>
  <CustomDialog ref="dialogRef">
    <template #header>
      <q-card-section style="padding: 12px 20px">
        <div class="text-h6">Take screenshot</div>
      </q-card-section>
    </template>

    <template #body>
      <q-card-section
        style="padding: 20px; display: flex; flex-direction: column"
      >
        <q-input
          label="Margin (px):"
          type="number"
          filled
          dense
          v-model="margin"
          style="width: 160px"
        />

        <Gap style="height: 16px" />

        <q-input
          label="Scale (%):"
          type="number"
          filled
          dense
          v-model="scale"
          style="width: 160px"
        />
      </q-card-section>
    </template>

    <template #footer>
      <q-card-actions align="right">
        <DeepBtn
          flat
          label="Cancel"
          color="negative"
          @click="dialogRef.onDialogCancel()"
        />

        <DeepBtn
          flat
          label="Ok"
          color="primary"
          @click="takeScreenshot()"
        />
      </q-card-actions>
    </template>
  </CustomDialog>
</template>

<script lang="ts">
const margin = ref(100);

const scale = ref(100);
</script>

<script setup lang="ts">
import download from 'downloadjs';
import html2canvas from 'html2canvas';
import type { IRegionElemsOutput } from 'src/code/pages/page/regions/region';
import type { Ref } from 'vue';

const dialogRef = ref() as Ref<InstanceType<typeof CustomDialog>>;

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

  const selectedElems = page.value.selection.react.elems;
  page.value.selection.clear();

  await nextTick();

  const finalMargin = parseInt(String(margin.value));

  const canvas = await html2canvas(
    document.querySelector(
      `.display-world[data-page-id="${page.value.id}"]`,
    ) as HTMLElement,
    {
      scale: (1 / page.value.camera.react.zoom) * (scale.value / 100),

      x: -finalMargin * page.value.camera.react.zoom + displayRect.topLeft.x,
      y: -finalMargin * page.value.camera.react.zoom + displayRect.topLeft.y,

      width: Math.round(
        (finalMargin + worldRect.size.x + finalMargin) *
          page.value.camera.react.zoom,
      ),
      height: Math.round(
        (finalMargin + worldRect.size.y + finalMargin) *
          page.value.camera.react.zoom,
      ),

      useCORS: true,
      allowTaint: true,
    },
  );

  page.value.selection.set(...selectedElems);

  const dataUrl = canvas.toDataURL('image/png');

  download(dataUrl, 'DeepNotes-screenshot.png', 'image/png');

  dialogRef.value.onDialogOK();
}
</script>
