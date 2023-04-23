<template>
  <div style="max-width: 400px">
    You were invited to join the group
    <b>
      {{
        groupName.status === 'success' ? groupName.text : page.react.groupId
      }}</b
    >.
  </div>

  <Gap style="height: 20px" />

  <DeepBtn
    label="Accept invitation"
    color="positive"
    @click="_acceptJoinInvitation()"
  />

  <Gap style="height: 16px" />

  <DeepBtn
    label="Reject invitation"
    color="negative"
    @click="_rejectJoinInvitation()"
  />
</template>

<script setup lang="ts">
/* eslint-disable vue/no-mutating-props */

import { rejectJoinInvitation } from 'src/code/api-interface/groups/join-invitations/reject';
import { groupNames } from 'src/code/pages/computed/group-names';
import type { Page } from 'src/code/pages/page/page';
import { asyncDialog, handleError } from 'src/code/utils/misc';

import AcceptInvitationDialog from './AcceptInvitationDialog.vue';

const page = inject<Page>('page')!;

const groupName = computed(() => groupNames()(page.react.groupId).get());

async function _acceptJoinInvitation() {
  $quasar().dialog({
    component: AcceptInvitationDialog,

    componentProps: {
      groupIds: [page.react.groupId],
    },
  });
}

async function _rejectJoinInvitation() {
  try {
    await asyncDialog({
      title: 'Reject invitation',
      message: 'Are you sure you want to reject the invitation?',

      focus: 'cancel',

      cancel: { label: 'No', flat: true, color: 'primary' },
      ok: { label: 'Yes', flat: true, color: 'negative' },
    });

    await rejectJoinInvitation({
      groupId: page.react.groupId,
    });
  } catch (error: any) {
    handleError(error);
  }
}
</script>
