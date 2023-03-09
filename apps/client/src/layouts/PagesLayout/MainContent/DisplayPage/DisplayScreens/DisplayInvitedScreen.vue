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
    @click="acceptInvitation()"
  />

  <Gap style="height: 16px" />

  <DeepBtn
    label="Reject invitation"
    color="negative"
    @click="rejectInvitation()"
  />
</template>

<script setup lang="ts">
/* eslint-disable vue/no-mutating-props */

import { groupNames } from 'src/code/pages/computed/group-names.client';
import {
  acceptJoinInvitation,
  rejectJoinInvitation,
} from 'src/code/pages/groups.client';
import type { Page } from 'src/code/pages/page/page.client';
import { asyncPrompt, handleError } from 'src/code/utils.client';

import AcceptInvitationDialog from './AcceptInvitationDialog.vue';

const page = inject<Page>('page')!;

const groupName = computed(() => groupNames()(page.react.groupId).get());

async function acceptInvitation() {
  $quasar()
    .dialog({ component: AcceptInvitationDialog })
    .onOk(async (userName) => {
      try {
        await acceptJoinInvitation(page.react.groupId, userName);
      } catch (error: any) {
        handleError(error);
      }
    });
}

async function rejectInvitation() {
  try {
    await asyncPrompt({
      title: 'Reject invitation',
      message: 'Are you sure you want to reject the invitation?',

      focus: 'cancel',

      cancel: { label: 'No', flat: true, color: 'primary' },
      ok: { label: 'Yes', flat: true, color: 'negative' },
    });

    await rejectJoinInvitation(page.react.groupId);
  } catch (error: any) {
    handleError(error);
  }
}
</script>
