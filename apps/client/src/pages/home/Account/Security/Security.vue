<template>
  <h5 style="margin-block-start: 0; margin-block-end: 0">Change password</h5>

  <Gap style="height: 8px" />

  <q-separator />

  <Gap style="height: 24px" />

  <q-form style="display: flex; flex-direction: column">
    <PasswordField
      label="Old password"
      dense
      style="max-width: 300px"
      autocomplete="current-password"
      v-model="oldPassword"
    />

    <Gap style="height: 20px" />

    <EvaluatedPasswordField
      label="New password"
      dense
      style="max-width: 300px"
      autocomplete="new-password"
      v-model="newPassword"
    />

    <Gap style="height: 20px" />

    <PasswordField
      label="Confirm new password"
      dense
      style="max-width: 300px"
      autocomplete="new-password"
      v-model="confirmNewPassword"
    />

    <Gap style="height: 20px" />

    <DeepBtn
      label="Change password"
      type="submit"
      color="primary"
      style="max-width: 300px"
      delay
      @click.prevent="changePassword()"
    />
  </q-form>

  <Gap style="height: 72px" />

  <h5 style="margin-block-start: 0; margin-block-end: 0">
    Two-factor authentication
  </h5>

  <Gap style="height: 8px" />

  <q-separator />

  <Gap style="height: 24px" />

  <DeepBtn
    v-if="
      internals.realtime.globalCtx.hget(
        'user',
        authStore().userId,
        'two-factor-auth-enabled',
      )
    "
    label="Manage two-factor authentication"
    color="secondary"
    style="max-width: 300px"
    @click="manageTwoFactorAuth"
  />
  <DeepBtn
    v-else
    label="Enable two-factor authentication"
    color="primary"
    style="max-width: 300px"
    @click="enableTwoFactorAuth"
  />

  <LoadingOverlay v-if="loading" />
</template>

<script setup lang="ts">
import { base64ToBytes, bytesToBase64 } from '@stdlib/base64';
import {
  createPrivateKeyring,
  createSymmetricKeyring,
  wrapSymmetricKey,
} from '@stdlib/crypto';
import { watchUntilTrue } from '@stdlib/vue';
import { zxcvbn } from '@zxcvbn-ts/core';
import { QForm } from 'quasar';
import { deriveUserValues } from 'src/code/crypto.client';
import { asyncPrompt, handleError } from 'src/code/utils.client';

import EnableTwoFactorAuthDialog from './EnableTwoFactorAuthDialog.vue';
import ManageTwoFactorAuthDialog from './ManageTwoFactorAuthDialog.vue';

useMeta(() => ({
  title: 'Security - Account - DeepNotes',
}));

const loading = ref(true);

onMounted(async () => {
  await watchUntilTrue(() => !internals.realtime.globalCtx.loading);

  loading.value = false;
});

// Change password

const oldPassword = ref('');
const newPassword = ref('');
const confirmNewPassword = ref('');

async function changePassword() {
  if (newPassword.value === oldPassword.value) {
    $quasar().notify({
      message: 'New password must be different than old password.',
      color: 'negative',
    });

    return;
  }

  if (newPassword.value !== confirmNewPassword.value) {
    $quasar().notify({
      message: 'New passwords do not match.',
      type: 'negative',
    });

    return;
  }

  // Check password strength

  const zxcvbnResult = zxcvbn(newPassword.value);

  if (zxcvbnResult.score <= 1) {
    $quasar().notify({
      html: true,
      message: 'Password is too weak.<br/>Please use a stronger password.',
      type: 'negative',
    });

    return;
  }

  if (zxcvbnResult.score <= 2) {
    await asyncPrompt({
      title: 'Weak password',
      html: true,
      message:
        'Your password is relatively weak.<br/>Are you sure you want to continue?',
      style: { width: 'max-content', padding: '4px 8px' },

      focus: 'cancel',

      cancel: { label: 'No', flat: true, color: 'primary' },
      ok: { label: 'Yes', flat: true, color: 'negative' },
    });
  }

  try {
    const email = await internals.realtime.hget(
      'user',
      authStore().userId,
      'email',
    );

    // Compute derived keys

    const oldDerivedValues = await deriveUserValues(email, oldPassword.value);
    const newDerivedValues = await deriveUserValues(email, newPassword.value);

    // Reencrypt derived keys

    const response = (
      await api().post<{
        sessionKey: string;

        requestId: string;
      }>('/api/users/account/security/change-password', {
        oldLoginHash: bytesToBase64(oldDerivedValues.loginHash),
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

    // Request password change

    await api().post('/api/users/account/security/change-password', {
      oldLoginHash: bytesToBase64(oldDerivedValues.loginHash),
      newLoginHash: bytesToBase64(newDerivedValues.loginHash),

      encryptedPrivateKeyring,
      encryptedSymmetricKeyring,

      requestId: response.requestId,
    });

    $quasar().notify({
      message: 'Password changed successfully.',
      type: 'positive',
    });

    // Clear form data

    oldPassword.value = '';
    newPassword.value = '';
    confirmNewPassword.value = '';
  } catch (error: any) {
    handleError(error);
  }
}

async function enableTwoFactorAuth() {
  try {
    const password = await asyncPrompt<string>({
      title: 'Enable two-factor authentication',
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

    const email = await internals.realtime.hget(
      'user',
      authStore().userId,
      'email',
    );

    const loginHash = bytesToBase64(
      (await deriveUserValues(email, password)).loginHash,
    );

    const response = (
      await api().post<{
        secret: string;
        keyUri: string;
      }>('/api/users/account/security/two-factor-auth/enable/request', {
        loginHash,
      })
    ).data;

    $quasar().dialog({
      component: EnableTwoFactorAuthDialog,
      componentProps: {
        loginHash,
        ...response,
      },
    });
  } catch (error) {
    handleError(error);
  }
}

async function manageTwoFactorAuth() {
  try {
    // Use password to load two-factor authentication data

    const password = await asyncPrompt<string>({
      title: 'Manage two-factor authentication',
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

    const email = await internals.realtime.hget(
      'user',
      authStore().userId,
      'email',
    );

    const loginHash = bytesToBase64(
      (await deriveUserValues(email, password)).loginHash,
    );

    const response = (
      await api().post<{
        secret: string;
        keyUri: string;
        recoveryCodes: string[];
      }>('/api/users/account/security/two-factor-auth/load', {
        loginHash,
      })
    ).data;

    $quasar().dialog({
      component: ManageTwoFactorAuthDialog,
      componentProps: {
        loginHash,

        ...response,
      },
    });
  } catch (error) {
    handleError(error);
  }
}
</script>
