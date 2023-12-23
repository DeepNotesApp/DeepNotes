<template>
  <q-dialog
    ref="dialogRef"
    @hide="onDialogHide"
  >
    <q-card :style="cardStyle">
      <q-card-section style="padding: 12px 20px">
        <div class="text-h6">Delete {{ subject }}</div>
      </q-card-section>

      <q-card-section style="padding: 12px 20px">
        <div>
          Are you sure you want to delete
          {{ subject?.endsWith('s') ? 'these' : 'this' }} {{ subject }}?
        </div>

        <Gap style="height: 10px" />

        <div style="padding-left: 16px">
          <Checkbox
            v-model="deletePermanently"
            label="Delete permanently"
          />
        </div>

        <Gap style="height: 10px" />
      </q-card-section>

      <q-card-actions align="right">
        <DeepBtn
          flat
          autofocus
          color="primary"
          label="No"
          @click="onDialogCancel"
        />

        <DeepBtn
          flat
          color="negative"
          label="Yes"
          @click="onDialogOK({ deletePermanently })"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import type { QDialogProps } from 'quasar';

defineEmits([...useDialogPluginComponent.emits]);

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } =
  useDialogPluginComponent();

interface Props extends QDialogProps {
  cardStyle?: any;
  subject?: string;
}

defineProps<Props>();

const deletePermanently = ref(false);
</script>
