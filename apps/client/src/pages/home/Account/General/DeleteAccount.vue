<template>
  <div style="display: flex; flex-direction: column; max-width: 300px">
    <DeepBtn
      label="Delete account"
      color="negative"
      @click="_deleteAccount()"
    />
  </div>
</template>

<script setup lang="ts">
import { sleep } from '@stdlib/misc';
import { deleteAccount } from 'src/code/api-interface/users/delete-account';
import { logout } from 'src/code/areas/auth/logout';
import { asyncDialog, handleError } from 'src/code/utils/misc';

async function _deleteAccount() {
  try {
    await asyncDialog({
      title: 'Delete account',
      message: 'Are you sure you want to delete your account?',

      focus: 'cancel',

      cancel: { label: 'No', flat: true, color: 'primary' },
      ok: { label: 'Yes', flat: true, color: 'negative' },
    });

    const password = await asyncDialog<string>({
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

    await deleteAccount({ password });

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
