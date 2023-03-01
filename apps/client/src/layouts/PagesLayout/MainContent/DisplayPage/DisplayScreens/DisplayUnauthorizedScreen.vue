<template>
  <div>You do not have permission to access this page.</div>

  <template
    v-if="uiStore().loggedIn && !realtimeCtx.loading && !groupIsPersonal"
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
      @click="cancelRequest()"
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
/* eslint-disable vue/no-mutating-props */

import { groupRequestNames } from 'src/code/pages/computed/group-request-names.client';
import type { Page } from 'src/code/pages/page/page.client';
import { requestWithNotifications } from 'src/code/pages/utils.client';
import { useRealtimeContext } from 'src/code/realtime/context.universal';
import { handleError } from 'src/code/utils.client';
import { multiModePath } from 'src/code/utils.universal';

import RequestAccessDialog from './RequestAccessDialog.vue';

const page = inject<Page>('page')!;

const realtimeCtx = useRealtimeContext();

const groupIsPersonal = computed(() =>
  realtimeCtx.hget('group', page.react.groupId, 'is-personal'),
);

const groupJoinRequestRejected = computed(() =>
  realtimeCtx.hget(
    'group-join-request',
    `${page.react.groupId}:${authStore().userId}`,
    'rejected',
  ),
);

async function cancelRequest() {
  try {
    const agentName = await groupRequestNames()(
      `${page.react.groupId}:${authStore().userId}`,
    ).getAsync();

    await requestWithNotifications({
      url: `/api/groups/${page.react.groupId}/join-requests/cancel`,

      notifications: {
        agent: {
          groupId: page.react.groupId,

          // You canceled your join request.
        },

        observers: {
          groupId: page.react.groupId,

          agentName: agentName.text,

          // ${agentName} canceled their join request.
        },
      },
    });
  } catch (error: any) {
    handleError(error);
  }
}
</script>
