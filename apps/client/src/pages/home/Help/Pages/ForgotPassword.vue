<template>
  <div style="font-size: 28px; font-weight: bold">{{ title }}</div>

  <Gap style="height: 36px" />

  <div style="max-width: 600px">
    <p>
      DeepNotes uses <b>end-to-end encryption</b> to ensure the highest level of
      security for your data. Due to the nature of this encryption, we do not
      have access to your password or any means to reset it.
    </p>

    <p>
      If you've forgotten your password, we regret to inform you that there is
      no recovery option available. Your only recourse would be to create a new
      account.
    </p>

    <p>
      If you wish to delete your old account and subscription, please don't
      hesitate to contact our support team, and we'll be glad to assist you with
      the process.
    </p>
  </div>
</template>

<script setup lang="ts">
const title = "I've forgotten my password. What can I do?";

useMeta(() => ({
  title: `${title} - Help - DeepNotes`,
}));
</script>
