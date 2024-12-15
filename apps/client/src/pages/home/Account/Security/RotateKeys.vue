<template>
  <div style="display: flex; flex-direction: column; max-width: 300px">
    <DeepBtn
      label="Rotate encryption keys"
      type="submit"
      color="primary"
      delay
      @click.prevent="_rotateKeys()"
    />
  </div>
</template>

<script setup lang="ts">
import { rotateUserKeys } from 'src/code/api-interface/users/rotate-keys';
import { logout } from 'src/code/areas/auth/logout';
import { asyncDialog, handleError } from 'src/code/utils/misc';

async function _rotateKeys() {
  try {
    await asyncDialog({
      title: 'Rotate encryption keys',
      message: 'Are you sure you want to rotate encryption keys?',

      focus: 'cancel',

      cancel: { label: 'No', flat: true, color: 'primary' },
      ok: { label: 'Yes', flat: true, color: 'negative' },
    });

    const password = await asyncDialog<string>({
      title: 'Rotate encryption keys',
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

    await rotateUserKeys({ password });

    $quasar().notify({
      message: 'Encryption keys rotated successfully.',
      type: 'positive',
    });

    setTimeout(logout, 2000);
  } catch (error) {
    handleError(error);
  }
}
</script>
