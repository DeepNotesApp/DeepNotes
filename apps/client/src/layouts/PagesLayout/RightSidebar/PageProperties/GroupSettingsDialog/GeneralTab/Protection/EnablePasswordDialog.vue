<template>
  <CustomDialog
    ref="dialogRef"
    card-style="width: 300px"
  >
    <template #header>
      <q-card-section style="padding: 12px 20px">
        <div class="text-h6">Password protection</div>
      </q-card-section>
    </template>

    <template #body>
      <q-card-section style="padding: 24px">
        <EvaluatedPasswordField
          label="New password"
          autocomplete="new-password"
          dense
          v-model="password"
        />

        <Gap style="height: 20px" />

        <PasswordField
          label="Repeat new password"
          autocomplete="new-password"
          dense
          v-model="repeatPassword"
        />
      </q-card-section>
    </template>

    <template #footer>
      <q-card-actions align="right">
        <DeepBtn
          flat
          label="Cancel"
          color="negative"
          @click="dialogRef.onDialogCancel()"
        />

        <DeepBtn
          label="Ok"
          type="submit"
          flat
          color="primary"
          delay
          @click.prevent="enablePasswordProtection"
        />
      </q-card-actions>
    </template>
  </CustomDialog>
</template>

<script setup lang="ts">
import { zxcvbn } from '@zxcvbn-ts/core';
import { asyncDialog, handleError } from 'src/code/utils/misc';
import type { Ref } from 'vue';

const dialogRef = ref() as Ref<InstanceType<typeof CustomDialog>>;

const password = ref('');
const repeatPassword = ref('');

async function enablePasswordProtection() {
  try {
    if (password.value !== repeatPassword.value) {
      throw new Error('Passwords do not match.');
    }

    if (zxcvbn(password.value).score <= 2) {
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

    dialogRef.value.onDialogOK(password.value);
  } catch (error) {
    handleError(error);
  }
}
</script>
