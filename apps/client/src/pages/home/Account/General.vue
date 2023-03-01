<template>
  <h5 style="margin-block-start: 0; margin-block-end: 0">E-mail</h5>

  <Gap style="height: 8px" />

  <q-separator />

  <Gap style="height: 24px" />

  <q-form style="display: flex; flex-direction: column; max-width: 300px">
    <TextField
      label="Current e-mail"
      dense
      :model-value="
        internals.realtime.globalCtx.hget('user', authStore().userId, 'email')
      "
      readonly
    />

    <Gap style="height: 16px" />

    <TextField
      label="New e-mail"
      dense
      v-model="newEmail"
      :maxlength="maxEmailLength"
    />

    <Gap style="height: 16px" />

    <DeepBtn
      label="Change e-mail"
      type="submit"
      color="primary"
      @click.prevent="changeEmail()"
    />
  </q-form>

  <LoadingOverlay v-if="loading" />
</template>

<script setup lang="ts">
import { base64ToBytes, bytesToBase64 } from '@stdlib/base64';
import {
  createPrivateKeyring,
  createSymmetricKeyring,
  wrapSymmetricKey,
} from '@stdlib/crypto';
import { maxEmailLength, w3cEmailRegex } from '@stdlib/misc';
import { watchUntilTrue } from '@stdlib/vue';
import { deriveUserValues } from 'src/code/crypto.client';
import { asyncPrompt, handleError } from 'src/code/utils.client';

useMeta(() => ({
  title: 'General - Account - DeepNotes',
}));

const newEmail = ref('');

const loading = ref(true);

onMounted(async () => {
  await watchUntilTrue(() => !internals.realtime.globalCtx.loading);

  loading.value = false;
});

async function changeEmail() {
  if (!newEmail.value.match(w3cEmailRegex)) {
    $quasar().notify({
      message: 'New e-mail address is invalid.',
      color: 'negative',
    });

    return;
  }

  try {
    const password = await asyncPrompt<string>({
      title: 'Change e-mail',
      message: 'Enter your password:',
      color: 'primary',
      prompt: {
        type: 'password',
        model: '',
        filled: true,
      },
      style: {
        maxWidth: '350px',
      },
      cancel: true,
    });

    // Compute derived keys

    const currentEmail = await internals.realtime.hget(
      'user',
      authStore().userId,
      'email',
    );

    const oldDerivedValues = await deriveUserValues(currentEmail!, password);
    const newDerivedValues = await deriveUserValues(newEmail.value, password);

    await api().post('/api/users/account/general/change-email', {
      newEmail: newEmail.value,

      oldLoginHash: bytesToBase64(oldDerivedValues.loginHash),
    });

    $quasar().notify({
      message: 'A verification code has been sent to the new e-mail address.',
      color: 'positive',
    });

    // Verification code promise

    const emailVerificationCode = await asyncPrompt<string>({
      title: 'Verify the new e-mail',
      message: 'Enter the verification code sent to the new e-mail:',
      color: 'primary',
      prompt: {
        model: '',
        filled: true,
      },
      style: {
        maxWidth: '350px',
      },
      cancel: true,
    });

    const response = (
      await api().post<{
        sessionKey: string;
      }>('/api/users/account/general/change-email', {
        newEmail: newEmail.value,

        oldLoginHash: bytesToBase64(oldDerivedValues.loginHash),

        emailVerificationCode,
      })
    ).data;

    const wrappedSessionKey = wrapSymmetricKey(
      base64ToBytes(response.sessionKey),
    );

    // Reencrypt values

    const encryptedPrivateKeyring = bytesToBase64(
      createPrivateKeyring(
        base64ToBytes(internals.storage.getItem('encryptedPrivateKeyring')!),
      )
        .unwrapSymmetric(wrappedSessionKey)
        .wrapSymmetric(newDerivedValues.masterKey).fullValue,
    );

    const encryptedSymmetricKeyring = bytesToBase64(
      createSymmetricKeyring(
        base64ToBytes(internals.storage.getItem('encryptedSymmetricKeyring')!),
      )
        .unwrapSymmetric(wrappedSessionKey)
        .wrapSymmetric(newDerivedValues.masterKey).fullValue,
    );

    // Request e-mail change

    await api().post('/api/users/account/general/change-email', {
      newEmail: newEmail.value,

      oldLoginHash: bytesToBase64(oldDerivedValues.loginHash),
      newLoginHash: bytesToBase64(newDerivedValues.loginHash),

      encryptedPrivateKeyring,
      encryptedSymmetricKeyring,

      emailVerificationCode,
    });

    if (internals.localStorage.getItem('email') != null) {
      internals.localStorage.setItem('email', newEmail.value);
    }

    newEmail.value = '';

    $quasar().notify({
      message: 'E-mail changed successfully.',
      type: 'positive',
    });
  } catch (error: any) {
    handleError(error);
  }
}
</script>
