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
        <TextField
          ref="urlElem"
          label="URL"
          filled
          dense
          v-model="url"
          :maxlength="maxUrlLength"
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
          label="Link new page"
          color="secondary"
          @click="() => {
              dialogRef.onDialogHide()

              $q.dialog({
                component: NewPageDialog,
                
                componentProps: {
                  callback: (url: string) => {
                    page.selection.setMark('link', { href: url });
                  },
                },
              })
            }"
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
import { maxUrlLength, sleep } from '@stdlib/misc';
import type { ComponentPublicInstance, Ref } from 'vue';

import NewPageDialog from '../RightSidebar/NoteProperties/NewPageDialog.vue';

const dialogRef = ref() as Ref<InstanceType<typeof CustomDialog>>;

const page = computed(() => internals.pages.react.page);

const url = ref('');
const urlElem = ref<ComponentPublicInstance>();

onMounted(async () => {
  await sleep();

  urlElem.value?.$el.focus();
});

function insertLink() {
  page.value.selection.setMark('link', { href: url.value });

  dialogRef.value.onDialogOK();
}
</script>
