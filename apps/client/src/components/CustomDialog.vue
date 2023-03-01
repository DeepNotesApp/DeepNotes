<template>
  <q-dialog
    ref="dialogRef"
    @hide="onDialogHide"
  >
    <q-card :style="cardStyle">
      <q-form style="display: flex; flex-direction: column; height: 100%">
        <slot name="header"></slot>

        <q-separator />

        <slot name="body"></slot>

        <q-separator />

        <slot name="footer"></slot>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
defineEmits([...useDialogPluginComponent.emits]);

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } =
  useDialogPluginComponent();

defineProps<{
  cardStyle?: any;
}>();

defineExpose({
  onDialogHide,
  onDialogOK,
  onDialogCancel,
});
</script>
