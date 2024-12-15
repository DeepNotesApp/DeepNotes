<template>
  <CustomDialog ref="dialogRef">
    <template #header>
      <q-card-section style="padding: 12px 20px">
        <div class="text-h6">Insert link</div>
      </q-card-section>
    </template>

    <template #body>
      <q-card-section
        style="padding: 20px; display: flex; flex-direction: column"
      >
        <LinkURL
          ref="urlElem"
          v-model="url"
        />
      </q-card-section>
    </template>

    <template #footer>
      <q-card-actions
        align="right"
        style="padding: 12px 20px"
      >
        <DeepBtn
          flat
          label="Cancel"
          color="primary"
          @click="dialogRef.onDialogCancel()"
        />

        <DeepBtn
          flat
          label="New page"
          color="primary"
          @click="createNewPage()"
        />

        <DeepBtn
          label="Ok"
          type="submit"
          flat
          color="primary"
          @click.prevent="insertLink()"
        />
      </q-card-actions>
    </template>
  </CustomDialog>
</template>

<script setup lang="ts">
import { sleep, splitStr } from '@stdlib/misc';
import { createPageBacklink } from 'src/code/areas/api-interface/pages/backlinks/create';
import type { ComponentPublicInstance, Ref } from 'vue';

import NewPageDialog from '../RightSidebar/NoteProperties/NewPageDialog.vue';

const dialogRef = ref() as Ref<InstanceType<typeof CustomDialog>>;

const page = computed(() => internals.pages.react.page);

const url = ref('');
const urlElem = ref<ComponentPublicInstance>();

let initialPageTitle = '';

onMounted(async () => {
  initialPageTitle = splitStr(getSelection()?.toString() ?? '', '\n')[0];

  await sleep();

  urlElem.value?.$el.focus();
});

function insertLink() {
  page.value.selection.format((chain) =>
    chain.setMark('link', { href: url.value }),
  );

  dialogRef.value.onDialogOK();

  void createPageBacklink({
    sourcePageId: page.value.id,
    targetUrl: url.value,
  });
}

function createNewPage() {
  dialogRef.value.onDialogHide();

  $quasar()
    .dialog({
      component: NewPageDialog,

      componentProps: {
        initialPageTitle,
      },
    })
    .onOk(async (newPageUrl: string) => {
      page.value.selection.format((chain) =>
        chain.setMark('link', { href: newPageUrl }),
      );

      void createPageBacklink({
        sourcePageId: page.value.id,
        targetUrl: newPageUrl,
      });
    });
}
</script>
