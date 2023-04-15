<template>
  <div style="display: flex; flex-direction: column; max-width: 300px">
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
      @click="manageTwoFactorAuth"
    />

    <DeepBtn
      v-else
      label="Enable two-factor authentication"
      color="primary"
      @click="enableTwoFactorAuth"
    />
  </div>
</template>

<script setup lang="ts">
import { deriveUserValues } from 'src/code/crypto';
import { trpcClient } from 'src/code/trpc';
import { asyncPrompt, handleError } from 'src/code/utils';

import EnableTwoFactorAuthDialog from './EnableTwoFactorAuthDialog.vue';
import ManageTwoFactorAuthDialog from './ManageTwoFactorAuthDialog.vue';

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

    const loginHash = (await deriveUserValues(email, password)).loginHash;

    const response =
      await trpcClient.users.account.twoFactorAuth.enable.request.mutate({
        loginHash,
      });

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

    const loginHash = (await deriveUserValues(email, password)).loginHash;

    const response = await trpcClient.users.account.twoFactorAuth.load.query({
      loginHash,
    });

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
