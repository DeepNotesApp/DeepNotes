<template>
  <CustomDialog
    ref="dialogRef"
    :maximized="maximized"
    :card-style="{
      width: maximized ? undefined : '400px',
    }"
  >
    <template #header>
      <q-card-section style="padding: 12px 20px">
        <div class="text-h6">Save your Recovery Code</div>
      </q-card-section>
    </template>

    <template #body>
      <q-card-section
        style="flex: 1; padding: 20px; display: flex; flex-direction: column"
      >
        <div>
          If you lose your authenticator app, your recovery code will be the
          only way to regain access to your account:
        </div>

        <Gap style="height: 8px" />

        <TextField
          :model-value="recoveryCodes[0]"
          dense
          copy-btn
          readonly
        />

        <Gap style="height: 16px" />

        <div>Make sure to store it in a safe and accessible place.</div>
      </q-card-section>
    </template>

    <template #footer>
      <q-card-actions align="right">
        <DeepBtn
          flat
          label="Finish"
          color="positive"
          @click="dialogRef.onDialogOK()"
        />
      </q-card-actions>
    </template>
  </CustomDialog>
</template>

<script setup lang="ts">
import { BREAKPOINT_MD_MIN } from '@stdlib/misc';
import type { Ref } from 'vue';

const dialogRef = ref() as Ref<InstanceType<typeof CustomDialog>>;

const props = defineProps<{
  recoveryCodes: string[];
}>();

const maximized = computed(() => uiStore().width < BREAKPOINT_MD_MIN);

const recoveryCodes = ref(props.recoveryCodes);
</script>
