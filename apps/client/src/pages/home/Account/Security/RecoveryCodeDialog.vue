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
        <div class="text-h6">Save your Recovery Codes</div>
      </q-card-section>
    </template>

    <template #body>
      <q-card-section
        style="flex: 1; padding: 20px; display: flex; flex-direction: column"
      >
        <div>
          These are one-time use recovery codes that can be used to access your
          account in case you lose access to your authenticator app:
        </div>

        <Gap style="height: 24px" />

        <div style="display: flex">
          <div
            class="recovery-codes"
            style="flex: 1; font-weight: bold"
          >
            <div
              v-for="recoveryCode in recoveryCodes"
              :key="recoveryCode"
            >
              {{ recoveryCode }}
            </div>
          </div>

          <Gap style="width: 16px" />

          <div style="flex: none">
            <q-btn
              color="primary"
              style="width: 38px"
            >
              <CopyBtn :text="recoveryCodes.join('\n')" />
            </q-btn>
          </div>
        </div>

        <Gap style="height: 24px" />

        <div style="color: red">These won't be displayed again.</div>
        <div>Make sure to store them in a safe and accessible place.</div>
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
import { BREAKPOINT_SM_MIN } from '@stdlib/misc';
import type { Ref } from 'vue';

const dialogRef = ref() as Ref<InstanceType<typeof CustomDialog>>;

const props = defineProps<{
  recoveryCodes: string[];
}>();

const maximized = computed(() => uiStore().width < BREAKPOINT_SM_MIN);

const recoveryCodes = ref(props.recoveryCodes);
</script>

<style scoped>
.recovery-codes :deep(*) {
  font-family: ui-monospace, 'Cascadia Mono', 'Segoe UI Mono', 'Ubuntu Mono',
    'Roboto Mono', Menlo, Monaco, Consolas, monospace;

  font-size: 17px;
}
</style>
