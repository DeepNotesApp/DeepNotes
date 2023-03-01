<template>
  <CustomDialog
    ref="dialogRef"
    :maximized="maximized"
    :card-style="{
      display: 'flex',
      'flex-direction': 'column',
      position: 'relative',
      width: maximized ? undefined : '400px',
    }"
  >
    <template #header>
      <q-card-section style="padding: 12px 20px">
        <div class="text-h6">Two-factor authentication</div>
      </q-card-section>
    </template>

    <template #body>
      <div
        style="
          flex: 1;
          display: flex;
          flex-direction: column;
          position: relative;
        "
      >
        <q-card-section
          style="padding: 20px; display: flex; flex-direction: column"
        >
          <div>Scan the following QR code to add another device:</div>

          <Gap style="height: 8px" />

          <div>
            <canvas
              ref="canvasElem"
              width="175"
              height="175"
            ></canvas>
          </div>

          <Gap style="height: 8px" />

          <div>Or use the following code:</div>

          <Gap style="height: 8px" />

          <TextField
            :model-value="secret"
            readonly
            dense
            copy-btn
          />

          <Gap style="height: 16px" />

          <DeepBtn
            label="Untrust all devices"
            color="secondary"
            @click="untrustDevices()"
          />
        </q-card-section>

        <q-separator />

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

          <Gap style="height: 8px" />

          <div>Make sure to store it in a safe and accessible place.</div>
        </q-card-section>

        <q-separator />

        <q-card-section
          style="padding: 20px; display: flex; flex-direction: column"
        >
          <DeepBtn
            label="Disable two-factor authentication"
            color="negative"
            @click="disableTwoFactorAuth()"
          />
        </q-card-section>

        <LoadingOverlay v-if="loading" />
      </div>
    </template>

    <template #footer>
      <q-card-actions align="right">
        <DeepBtn
          flat
          label="Close"
          color="primary"
          v-close-popup
        />
      </q-card-actions>
    </template>
  </CustomDialog>
</template>

<script setup lang="ts">
import { BREAKPOINT_MD_MIN, sleep } from '@stdlib/misc';
import QRCode from 'qrcode';
import { asyncPrompt, handleError } from 'src/code/utils.client';
import type { Ref } from 'vue';

const dialogRef = ref() as Ref<InstanceType<typeof CustomDialog>>;

const props = defineProps<{
  loginHash: string;
  secret: string;
  keyUri: string;
  recoveryCodes: string[];
}>();

const maximized = computed(() => uiStore().width < BREAKPOINT_MD_MIN);

const canvasElem = ref<HTMLElement>();

const loading = ref(true);

onMounted(async () => {
  await sleep();

  await QRCode.toCanvas(canvasElem.value, props.keyUri, {
    width: 175,
  });

  loading.value = false;
});

async function untrustDevices() {
  try {
    await api().post(
      '/api/users/account/security/two-factor-auth/untrust-devices',
      { loginHash: props.loginHash },
    );

    $quasar().notify({
      message: 'All devices have been untrusted.',
      type: 'positive',
    });
  } catch (error: any) {
    handleError(error);
  }
}

async function disableTwoFactorAuth() {
  try {
    await asyncPrompt({
      title: 'Disable two-factor authentication',
      message: 'Are you sure you want to disable two-factor authentication?',

      focus: 'cancel',

      cancel: { label: 'No', flat: true, color: 'primary' },
      ok: { label: 'Yes', flat: true, color: 'negative' },
    });

    await api().post<void>(
      '/api/users/account/security/two-factor-auth/disable',
      { loginHash: props.loginHash },
    );

    $quasar().notify({
      message: 'Two-factor authentication has been disabled.',
      type: 'positive',
    });

    dialogRef.value.onDialogOK();
  } catch (error: any) {
    handleError(error);
  }
}
</script>
