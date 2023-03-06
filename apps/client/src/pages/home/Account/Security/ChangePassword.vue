<template>
  <q-form style="display: flex; flex-direction: column; max-width: 300px">
    <PasswordField
      label="Old password"
      dense
      autocomplete="current-password"
      v-model="oldPassword"
    />

    <Gap style="height: 16px" />

    <EvaluatedPasswordField
      label="New password"
      dense
      autocomplete="new-password"
      v-model="newPassword"
    />

    <Gap style="height: 16px" />

    <PasswordField
      label="Confirm new password"
      dense
      autocomplete="new-password"
      v-model="confirmNewPassword"
    />

    <Gap style="height: 16px" />

    <DeepBtn
      label="Change password"
      type="submit"
      color="primary"
      delay
      @click.prevent="changePassword()"
    />
  </q-form>
</template>

<script setup lang="ts">
import { base64ToBytes, bytesToBase64 } from '@stdlib/base64';
import {
  createPrivateKeyring,
  createSymmetricKeyring,
  wrapSymmetricKey,
} from '@stdlib/crypto';
import { zxcvbn } from '@zxcvbn-ts/core';
import { QForm } from 'quasar';
import { deriveUserValues } from 'src/code/crypto.client';
import { asyncPrompt, handleError } from 'src/code/utils.client';

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

  await asyncPrompt({
    html: true,
    title: 'Change password',
    message: `Are you sure you want to change password?<br/>
      <span style="color: #a0a0a0">
        <span style="color: red">Note</span>: This action will log you out of all devices.
      </span>`,

    focus: 'cancel',

    cancel: { label: 'No', flat: true, color: 'primary' },
    ok: { label: 'Yes', flat: true, color: 'negative' },
  });

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
</script>
