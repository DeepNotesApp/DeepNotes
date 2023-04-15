<template>
  <q-page>
    <ResponsiveContainer
      v-if="status !== undefined"
      style="padding: 160px 0; text-align: center"
    >
      <template v-if="status">
        <div style="font-size: 16px">Your email has been verified.</div>

        <Gap style="height: 16px" />

        <div>
          <q-icon
            name="done"
            size="48px"
            color="green"
          />
        </div>

        <Gap style="height: 24px" />

        <DeepBtn
          label="Go to Login"
          color="primary"
          style="font-size: 16px; padding: 10px 22px"
          :to="{ name: 'login' }"
        />
      </template>

      <template v-else>
        <div style="font-size: 16px">Invalid email verification code.</div>

        <Gap style="height: 24px" />

        <DeepBtn
          label="Go home"
          color="primary"
          style="font-size: 16px; padding: 10px 22px"
          :to="{ name: 'home' }"
        />
      </template>
    </ResponsiveContainer>
  </q-page>

  <LoadingOverlay v-if="status === undefined" />
</template>

<script setup lang="ts">
import { trpcClient } from 'src/code/trpc';

useMeta(() => ({
  title: 'Email verification - DeepNotes',
}));

const status = ref<boolean | undefined>(undefined);

onMounted(async () => {
  try {
    await trpcClient.users.account.verifyEmail.mutate({
      emailVerificationCode: route().value.params.code as string,
    });

    status.value = true;
  } catch (error) {
    mainLogger().error(error);

    status.value = false;
  }
});
</script>
