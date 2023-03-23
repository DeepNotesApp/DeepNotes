<template>
  <div style="display: flex; flex-direction: column; max-width: 300px">
    <DeepBtn
      label="Delete account"
      color="negative"
      @click="deleteAccount()"
    />
  </div>
</template>

<script setup lang="ts">
import { bytesToBase64 } from '@stdlib/base64';
import { sleep } from '@stdlib/misc';
import { logout } from 'src/code/auth/logout';
import { deriveUserValues } from 'src/code/crypto';
import { asyncPrompt, handleError } from 'src/code/utils';

async function deleteAccount() {
  try {
    await asyncPrompt({
      title: 'Delete account',
      message: 'Are you sure you want to delete your account?',

      focus: 'cancel',

      cancel: { label: 'No', flat: true, color: 'primary' },
      ok: { label: 'Yes', flat: true, color: 'negative' },
    });

    const password = await asyncPrompt<string>({
      title: 'Delete account',
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
    const derivedValues = await deriveUserValues(email, password);

    await api().post('/api/users/account/general/delete', {
      loginHash: bytesToBase64(derivedValues.loginHash),
    });

    $quasar().notify({
      message: 'Account deleted successfully.',
      type: 'positive',
    });

    await sleep(2000);

    await logout();
  } catch (error: any) {
    handleError(error);
  }
}
</script>
