<template>
  <q-form style="display: flex; flex-direction: column; max-width: 300px">
    <TextField
      label="Current email"
      dense
      :model-value="
        internals.realtime.globalCtx.hget('user', authStore().userId, 'email')
      "
      readonly
    />

    <Gap style="height: 16px" />

    <TextField
      label="New email"
      dense
      v-model="newEmail"
      :maxlength="maxEmailLength"
    />

    <Gap style="height: 16px" />

    <DeepBtn
      label="Change email"
      type="submit"
      color="primary"
      @click.prevent="_changeEmail()"
    />
  </q-form>
</template>

<script setup lang="ts">
import { maxEmailLength, sleep, w3cEmailRegex } from '@stdlib/misc';
import { changeEmail } from 'src/code/api-interface/users/change-email';
import { logout } from 'src/code/areas/auth/logout';
import { deriveUserValues } from 'src/code/crypto';
import { asyncDialog, handleError } from 'src/code/utils/misc';

const newEmail = ref('');

async function _changeEmail() {
  try {
    const currentEmail = await internals.realtime.hget(
      'user',
      authStore().userId,
      'email',
    );

    if (!w3cEmailRegex.test(newEmail.value)) {
      throw new Error('New email address is invalid.');
    }

    if (
      newEmail.value.toLowerCase() === currentEmail.toLowerCase() &&
      !(process.env.EMAIL_CASE_SENSITIVITY_EXCEPTIONS ?? '')
        .split(';')
        .includes(currentEmail)
    ) {
      throw new Error('New email address is the same as the current one.');
    }

    const password = await asyncDialog<string>({
      title: 'Change email',
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

    // Request email change

    const oldDerivedUserValues = await deriveUserValues({
      email: currentEmail,
      password,
    });

    const response = await trpcClient.users.account.emailChange.request.mutate({
      oldLoginHash: oldDerivedUserValues.loginHash,

      newEmail: newEmail.value,
    });

    if (response?.emailVerificationCode == null) {
      $quasar().notify({
        message: 'A verification code has been sent to the new email address.',
        color: 'positive',
      });
    }

    // Finish email change

    const emailVerificationCode =
      response?.emailVerificationCode ??
      (await asyncDialog<string>({
        html: true,
        title: 'Verify the new email',
        message: `Enter the verification code sent to the new email:<br/>
        <span style="color: #a0a0a0">
          <span style="color: red">Note</span>: This action will log you out of all devices.
        </span>`,

        color: 'primary',
        prompt: {
          model: '',
          filled: true,
        },
        style: {
          maxWidth: '350px',
        },
        cancel: true,
      }));

    await changeEmail({
      newEmail: newEmail.value,
      password,
      oldDerivedUserValues: oldDerivedUserValues,
      emailVerificationCode,
    });

    if (internals.localStorage.getItem('email') != null) {
      internals.localStorage.setItem('email', newEmail.value);
    }

    $quasar().notify({
      message: 'Email changed successfully.',
      type: 'positive',
    });

    await sleep(2000);

    await logout();
  } catch (error: any) {
    handleError(error);
  }
}
</script>
