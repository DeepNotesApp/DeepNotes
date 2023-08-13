<template>
  <div style="font-size: 28px; font-weight: bold">{{ title }}</div>

  <Gap style="height: 36px" />

  <div style="max-width: 600px">
    <ol class="steps">
      <li>
        Go to a page of the group you want to add members to. Make sure there's
        nothing selected on the page.
      </li>

      <li>
        On the right sidebar, click on <b>Group settings</b>.<br />

        <br />

        <img src="/help/inviting-users/group-settings-button.webp" />
      </li>

      <li>
        Go to the <b>Join invitations</b> tab and click on
        <b>Invite new member</b>.<br />

        <br />

        <img src="/help/inviting-users/group-settings-tabs.webp" />

        <InlineGap style="width: 24px" />

        <img src="/help/inviting-users/invite-new-member-button.webp" />
      </li>

      <li>
        Fill the form fields and click <b>Ok</b> to invite the user.<br />

        <br />

        <img src="/help/inviting-users/invite-user-dialog.webp" />
      </li>

      <li>
        Now the user decides if they want to <b>accept</b> or <b>reject</b> the
        invitation.<br />

        <br />

        <img src="/help/inviting-users/accept-reject-invitation.webp" />
      </li>
    </ol>
  </div>
</template>

<script setup lang="ts">
const title = 'How to invite users to a group?';

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
