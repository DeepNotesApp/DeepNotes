<template>
  <div>You do not have permission to access this page.</div>

  <template
    v-if="
      uiStore().loggedIn &&
      !realtimeCtx.loading &&
      !realtimeCtx.hget('group', page.react.groupId, 'is-personal') &&
      realtimeCtx.hget('group', page.react.groupId, 'are-join-requests-allowed')
    "
  >
    <Gap style="height: 12px" />

    <DeepBtn
      v-if="groupJoinRequestRejected == null"
      label="Request access"
      color="primary"
      @click="
        $q.dialog({
          component: RequestAccessDialog,

          componentProps: {
            groupId: page.react.groupId,
          },
        })
      "
    />

    <DeepBtn
      v-if="groupJoinRequestRejected === false"
      label="Cancel request"
      color="negative"
      @click="_cancelJoinRequest()"
    />
  </template>

  <template v-if="!uiStore().loggedIn">
    <Gap style="height: 20px" />

    <div style="display: flex">
      <DeepBtn
        label="Login"
        color="primary"
        :href="
          multiModePath(
            `/login?redirect=${encodeURIComponent($route.fullPath)}`,
          )
        "
      />

      <Gap style="width: 24px" />

      <DeepBtn
        label="Register"
        color="primary"
        :href="
          multiModePath(
            `/register?redirect=${encodeURIComponent($route.fullPath)}`,
          )
        "
      />
    </div>
  </template>
</template>

<script setup lang="ts">
import { cancelJoinRequest } from 'src/code/api-interface/groups/join-requests/cancel';
import { useRealtimeContext } from 'src/code/areas/realtime/context';
import type { Page } from 'src/code/pages/page/page';
import { asyncDialog, handleError } from 'src/code/utils/misc';
import { multiModePath } from 'src/code/utils/misc';

import RequestAccessDialog from './RequestAccessDialog.vue';

const page = inject<Page>('page')!;

const realtimeCtx = useRealtimeContext();

const groupJoinRequestRejected = computed(() =>
  realtimeCtx.hget(
    'group-join-request',
    `${page.react.groupId}:${authStore().userId}`,
    'rejected',
  ),
);

async function _cancelJoinRequest() {
  try {
    await asyncDialog({
      title: 'Cancel join request',
      message: 'Are you sure you want to cancel your join request?',

      focus: 'cancel',

      cancel: { label: 'No', flat: true, color: 'primary' },
      ok: { label: 'Yes', flat: true, color: 'negative' },
    });

    await cancelJoinRequest({
      groupId: page.react.groupId,
    });
  } catch (error: any) {
    handleError(error);
  }
}
</script>
