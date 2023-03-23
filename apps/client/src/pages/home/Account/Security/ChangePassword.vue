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
import { sleep } from '@stdlib/misc';
import { zxcvbn } from '@zxcvbn-ts/core';
import { QForm } from 'quasar';
import { logout } from 'src/code/auth/logout';
import { deriveUserValues } from 'src/code/crypto';
import { asyncPrompt, handleError } from 'src/code/utils';

// Change password

const oldPassword = ref('');
const newPassword = ref('');
const confirmNewPassword = ref('');

async function changePassword() {
  try {
    if (newPassword.value === oldPassword.value) {
      throw new Error('New password must be different than old password.');
    }

    if (newPassword.value !== confirmNewPassword.value) {
      throw new Error('New passwords do not match.');
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
        .unwrapSymmetric(wrappedSessionKey, {
          associatedData: {
            context: 'SessionUserPrivateKeyring',
            userId: authStore().userId,
          },
        })
        .wrapSymmetric(newDerivedValues.masterKey, {
          associatedData: {
            context: 'UserPrivateKeyring',
            userId: authStore().userId,
          },
        }).fullValue,
    );

    const encryptedSymmetricKeyring = bytesToBase64(
      createSymmetricKeyring(
        base64ToBytes(internals.storage.getItem('encryptedSymmetricKeyring')!),
      )
        .unwrapSymmetric(wrappedSessionKey, {
          associatedData: {
            context: 'SessionUserSymmetricKeyring',
            userId: authStore().userId,
          },
        })
        .wrapSymmetric(newDerivedValues.masterKey, {
          associatedData: {
            context: 'UserSymmetricKeyring',
            userId: authStore().userId,
          },
        }).fullValue,
    );

    // Request password change

    await api().post('/api/users/account/security/change-password', {
      oldLoginHash: bytesToBase64(oldDerivedValues.loginHash),
      newLoginHash: bytesToBase64(newDerivedValues.loginHash),

      encryptedPrivateKeyring,
      encryptedSymmetricKeyring,
    });

    $quasar().notify({
      message: 'Password changed successfully.',
      type: 'positive',
    });

    await sleep(2000);

    await logout();
  } catch (error: any) {
    handleError(error);
  }
}
</script>
