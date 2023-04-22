<template>
  <CustomDialog
    ref="dialogRef"
    :maximized="maximized"
    :card-style="{
      width: maximized ? undefined : '500px',
    }"
  >
    <template #header>
      <q-card-section style="padding: 12px 20px">
        <div class="text-h6">Two-factor authentication</div>
      </q-card-section>
    </template>

    <template #body>
      <q-card-section
        style="
          flex: 1;
          padding: 20px;
          display: flex;
          flex-direction: column;
          position: relative;
        "
      >
        <div style="color: #c0c0c0">1. Get an authenticator app:</div>

        <Gap style="height: 8px" />

        <div>
          Android devices:
          <a
            href="https://play.google.com/store/apps/details?id=com.beemdevelopment.aegis"
            target="_blank"
            >Aegis</a
          >,
          <a
            href="https://play.google.com/store/apps/details?id=com.authy.authy"
            target="_blank"
            >Authy</a
          >,
          <a
            href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2"
            target="_blank"
            >Google Authenticator</a
          >.
        </div>
        <div>
          iOS devices:
          <a
            href="https://apps.apple.com/app/raivo-otp/id1459042137"
            target="_blank"
            >Raivo</a
          >,
          <a
            href="https://apps.apple.com/app/authy/id494168017"
            target="_blank"
            >Authy</a
          >,
          <a
            href="https://apps.apple.com/app/google-authenticator/id388497605"
            target="_blank"
            >Google Authenticator</a
          >.
        </div>

        <Gap style="height: 16px" />

        <div style="color: #c0c0c0">2. Scan the QR code below:</div>

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
          dense
          style="max-width: 250px"
          copy-btn
          readonly
        />

        <Gap style="height: 16px" />

        <div style="color: #c0c0c0">
          3. Enter the 6-digit verification code below:
        </div>

        <Gap style="height: 8px" />

        <div>
          <TextField
            type="number"
            placeholder="6-digit code"
            filled
            style="max-width: 150px"
            v-model="authenticatorToken"
            :maxlength="6"
          />
        </div>

        <LoadingOverlay v-if="loading" />
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
          ref="continueBtn"
          label="Continue"
          type="submit"
          flat
          color="positive"
          :disable="loading"
          @click.prevent="verify()"
        />
      </q-card-actions>
    </template>
  </CustomDialog>
</template>

<script setup lang="ts">
import { sleep } from '@stdlib/misc';
import { BREAKPOINT_MD_MIN } from '@stdlib/misc';
import QRCode from 'qrcode';
import { handleError } from 'src/code/utils/misc';
import DeepBtn from 'src/components/DeepBtn.vue';
import type { Ref } from 'vue';

import RecoveryCodeDialog from './RecoveryCodeDialog.vue';

const dialogRef = ref() as Ref<InstanceType<typeof CustomDialog>>;

const props = defineProps<{
  loginHash: Uint8Array;
  secret: string;
  keyUri: string;
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

// Verification

const authenticatorToken = ref('');

const continueBtn = ref<InstanceType<typeof DeepBtn>>();

watch(authenticatorToken, (value) => {
  if (/^\d{6}$/.test(value)) {
    continueBtn.value?.$el.click();
  }
});

async function verify() {
  try {
    if (!/^\d{6}$/.test(authenticatorToken.value)) {
      throw new Error('Please enter a valid 6-digit code.');
    }

    const recoveryCodes = (
      await trpcClient.users.account.twoFactorAuth.enable.finish.mutate({
        loginHash: props.loginHash,
        authenticatorToken: authenticatorToken.value,
      })
    ).recoveryCodes;

    $quasar().dialog({
      component: RecoveryCodeDialog,

      componentProps: {
        recoveryCodes,
      },
    });

    $quasar().notify({
      message: 'Two-factor authentication enabled successfully.',
      type: 'positive',
    });

    dialogRef.value.onDialogOK();
  } catch (error: any) {
    handleError(error);
  }
}
</script>

<style scoped lang="scss">
.q-dialog :deep() {
  a:not(.q-hoverable) {
    text-decoration: none;

    color: #29b6f6;

    cursor: pointer;

    &:hover {
      color: #4fc3f7;
    }
  }
}
</style>
