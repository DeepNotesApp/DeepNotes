<template>
  <div style="font-size: 28px; font-weight: bold">{{ title }}</div>

  <Gap style="height: 36px" />

  <div>
    We offer a <b>100% refund</b> within 7 days of your purchase. No questions
    asked.<br />

    <br />

    If you are not satisfied with DeepNotes, please reach out at
    <a href="mailto:contact@deepnotes.app?subject=Refund Request"
      >contact@deepnotes.app</a
    >.
  </div>
</template>

<script setup lang="ts">
const title = 'What is the refund policy on DeepNotes?';

useMeta(() => ({
  title: `${title} - Help - DeepNotes`,
}));
</script>
