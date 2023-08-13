<template>
  <div style="font-size: 28px; font-weight: bold">{{ title }}</div>

  <Gap style="height: 36px" />

  <div style="max-width: 600px">
    To send a request to join a group, a user has to:

    <ol class="steps">
      <li>
        Go to a page of the group they want to join and click on
        <b>Request access</b>.<br />

        <br />

        <img src="/help/joining-group/request-access-screen.webp" />
      </li>

      <li>
        Choose a name to use within the group and click <b>Ok</b>.<br />

        <br />

        <img src="/help/joining-group/request-access-dialog.webp" />
      </li>

      <li>
        Now wait for the admins to <b>accept</b> or <b>reject</b> the request.
      </li>
    </ol>
  </div>
</template>

<script setup lang="ts">
const title = 'How to join a group?';

useMeta(() => ({
  title: `${title} - Help - DeepNotes`,
}));
</script>

<style scoped lang="scss">
ol.steps > li {
  margin-bottom: 24px;
}

img {
  vertical-align: top;
  border: 1px solid rgba(255, 255, 255, 0.3);
}
</style>
