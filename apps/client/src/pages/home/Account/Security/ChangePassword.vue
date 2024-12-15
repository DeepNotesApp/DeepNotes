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
      @click.prevent="_changePassword()"
    />
  </q-form>
</template>

<script setup lang="ts">
import { QForm } from 'quasar';
import { changePassword } from 'src/code/api-interface/users/change-password';
import { logout } from 'src/code/areas/auth/logout';
import { asyncDialog, handleError } from 'src/code/utils/misc';
import { zxcvbn } from 'src/code/utils/zxcvbn';

// Change password

const oldPassword = ref('');
const newPassword = ref('');
const confirmNewPassword = ref('');

async function _changePassword() {
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
      await asyncDialog({
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

    await asyncDialog({
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

    await changePassword({
      oldPassword: oldPassword.value,
      newPassword: newPassword.value,
    });

    $quasar().notify({
      message: 'Password changed successfully.',
      type: 'positive',
    });

    setTimeout(logout, 2000);
  } catch (error: any) {
    handleError(error);
  }
}
</script>
