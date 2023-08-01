<template>
  <CustomDialog ref="dialogRef">
    <template #header>
      <q-card-section style="padding: 12px 20px">
        <div class="text-h6">Insert image</div>
      </q-card-section>
    </template>

    <template #body>
      <q-card-section
        style="padding: 20px; display: flex; flex-direction: column"
      >
        <q-radio
          label="Local image:"
          val="local"
          dense
          v-model="fileType"
        />

        <Gap style="height: 12px" />

        <q-file
          label="Click here to select"
          filled
          dense
          accept="image/*"
          :disable="fileType !== 'local'"
          v-model="localFile"
        >
          <template #prepend>
            <q-icon name="mdi-image" />
          </template>
        </q-file>

        <Gap style="height: 24px" />

        <q-radio
          label="External image:"
          val="external"
          dense
          v-model="fileType"
        />

        <Gap style="height: 12px" />

        <TextField
          label="Image URL"
          dense
          accept="image/*"
          :disable="fileType !== 'external'"
          v-model="imageURL"
          :maxlength="maxUrlLength"
        />

        <Gap style="height: 12px" />

        <q-checkbox
          label="Embed image"
          dense
          v-model="embedImage"
        />
      </q-card-section>
    </template>

    <template #footer>
      <q-card-actions align="right">
        <DeepBtn
          flat
          label="Cancel"
          color="primary"
          @click="dialogRef.onDialogCancel()"
        />

        <DeepBtn
          flat
          label="Ok"
          color="primary"
          @click="insertImage"
        />
      </q-card-actions>
    </template>
  </CustomDialog>
</template>

<script setup lang="ts">
import { maxUrlLength } from '@stdlib/misc';
import type { Ref } from 'vue';

const dialogRef = ref() as Ref<InstanceType<typeof CustomDialog>>;

const page = computed(() => internals.pages.react.page);

const fileType = ref('local');

const localFile = ref<File>();
const imageURL = ref('');

const embedImage = ref(false);

async function insertImage() {
  if (fileType.value !== 'local' && !embedImage.value) {
    page.value.selection.format((chain) =>
      chain.setImage({
        src: imageURL.value,
      }),
    );
  } else {
    let imageBlob;

    if (fileType.value === 'local') {
      imageBlob = localFile.value!;
    } else {
      const response = await fetch(imageURL.value);

      imageBlob = await response.blob();
    }

    if (imageBlob.size > 5 * 1024 * 1024) {
      $quasar().notify({
        message: 'Cannot upload images larger than 5MB.',
        color: 'negative',
      });
      return;
    }

    const reader = new FileReader();

    reader.addEventListener('loadend', (event) => {
      page.value.selection.format((chain) =>
        chain.setImage({
          src: event.target!.result as string,
        }),
      );
    });

    reader.readAsDataURL(imageBlob);
  }

  dialogRef.value.onDialogOK();
}
</script>
