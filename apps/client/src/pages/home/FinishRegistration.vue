<template>
  <q-page>
    <ResponsiveContainer style="padding: 180px 0; text-align: center">
      <template v-if="internals.sessionStorage?.getItem('email') != null">
        <div style="font-size: 16px">
          We've sent a verification link to<br />
          <span style="color: #03a9f4">{{
            internals.sessionStorage?.getItem('email')
          }}</span
          >.<br />
          Check your email to proceed.
        </div>

        <Gap style="height: 24px" />

        <DeepBtn
          :label="`Resend verification email${
            secondsRemaining > 0 ? ` (${secondsRemaining}s)` : ''
          }`"
          color="primary"
          style="font-size: 16px; padding: 10px 22px"
          @click="resendVerificationEmail()"
          :disabled="secondsRemaining > 0"
        />

        <Gap style="height: 64px" />

        <DeepBtn
          label="Go to login"
          color="primary"
          style="padding: 10px 22px"
          :to="{ name: 'login' }"
        />
      </template>
    </ResponsiveContainer>
  </q-page>
</template>

<script setup lang="ts">
import { useIntervalFn } from '@vueuse/core';
import { handleError } from 'src/code/utils/misc';

useMeta(() => ({
  title: 'Finish registration - DeepNotes',
}));

const secondsRemaining = ref(60);

useIntervalFn(() => {
  secondsRemaining.value--;
}, 1000);

async function resendVerificationEmail() {
  try {
    await trpcClient.users.account.resendVerificationEmail.mutate({
      email: internals.sessionStorage?.getItem('email')!,
    });

    $quasar().notify({
      message: 'Verification email resent.',
      type: 'positive',
    });

    secondsRemaining.value = 60;
  } catch (error) {
    handleError(error);
  }
}
</script>
