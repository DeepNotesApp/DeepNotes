<template>
  <q-menu
    ref="notificationsMenu"
    anchor="bottom middle"
    self="top middle"
    style="width: 250px"
    @before-show="onBeforeShow()"
  >
    <template v-if="pagesStore().notifications.items.length === 0">
      <div
        style="
          margin: 12px;
          display: flex;
          flex-direction: column;
          text-align: center;
        "
      >
        You have no notifications.
      </div>
    </template>

    <template v-else>
      <q-list
        class="overflow-auto"
        style="flex: 1"
      >
        <q-infinite-scroll
          @load="onLoad"
          :disable="!pagesStore().notifications.hasMore"
          :offset="250"
        >
          <template
            v-for="notification in pagesStore().notifications.items"
            :key="notification.id"
          >
            <GroupRequestSent
              v-if="notification.type === 'group-request-sent'"
              :notification="notification"
            />
            <GroupRequestCanceled
              v-else-if="notification.type === 'group-request-canceled'"
              :notification="notification"
            />
            <GroupRequestAccepted
              v-else-if="notification.type === 'group-request-accepted'"
              :notification="notification"
            />
            <GroupRequestRejected
              v-else-if="notification.type === 'group-request-rejected'"
              :notification="notification"
            />

            <GroupInvitationSent
              v-else-if="notification.type === 'group-invitation-sent'"
              :notification="notification"
            />
            <GroupInvitationCanceled
              v-else-if="notification.type === 'group-invitation-canceled'"
              :notification="notification"
            />
            <GroupInvitationAccepted
              v-else-if="notification.type === 'group-invitation-accepted'"
              :notification="notification"
            />
            <GroupInvitationRejected
              v-else-if="notification.type === 'group-invitation-rejected'"
              :notification="notification"
            />

            <GroupMemberRoleChanged
              v-else-if="notification.type === 'group-member-role-changed'"
              :notification="notification"
            />
            <GroupMemberRemoved
              v-else-if="notification.type === 'group-member-removed'"
              :notification="notification"
            />
          </template>

          <template v-slot:loading>
            <div class="row justify-center q-my-md">
              <q-circular-progress
                indeterminate
                size="md"
              />
            </div>
          </template>
        </q-infinite-scroll>
      </q-list>
    </template>
  </q-menu>
</template>

<script setup lang="ts">
import { useRealtimeContext } from 'src/code/realtime/context';
import { handleError } from 'src/code/utils/misc';

import GroupInvitationAccepted from './Items/GroupInvitationAccepted.vue';
import GroupInvitationCanceled from './Items/GroupInvitationCanceled.vue';
import GroupInvitationRejected from './Items/GroupInvitationRejected.vue';
import GroupInvitationSent from './Items/GroupInvitationSent.vue';
import GroupMemberRemoved from './Items/GroupMemberRemoved.vue';
import GroupMemberRoleChanged from './Items/GroupMemberRoleChanged.vue';
import GroupRequestAccepted from './Items/GroupRequestAccepted.vue';
import GroupRequestCanceled from './Items/GroupRequestCanceled.vue';
import GroupRequestRejected from './Items/GroupRequestRejected.vue';
import GroupRequestSent from './Items/GroupRequestSent.vue';

const notificationsMenu = ref();
provide('notificationsMenu', notificationsMenu);

const realtimeCtx = useRealtimeContext();
provide('realtimeCtx', realtimeCtx);

async function onBeforeShow() {
  try {
    if (pagesStore().notifications.items[0]?.id == null) {
      return;
    }

    if (
      pagesStore().notifications.items[0].id ===
      pagesStore().notifications.lastNotificationRead
    ) {
      return;
    }

    pagesStore().notifications.lastNotificationRead =
      pagesStore().notifications.items[0].id;

    await trpcClient.users.pages.notifications.markAsRead.mutate();
  } catch (error: any) {
    handleError(error);
  }
}

async function onLoad(index: number, done: (stop?: boolean) => void) {
  try {
    const notifications = await trpcClient.users.pages.notifications.load.query(
      { lastNotificationId: pagesStore().notifications.items.at(-1)?.id },
    );

    pagesStore().notifications.items.push(...notifications.items);
    pagesStore().notifications.hasMore = notifications.hasMore;
  } catch (error: any) {
    handleError(error);

    pagesStore().notifications.hasMore = false;
  }

  done(!pagesStore().notifications.hasMore);
}
</script>
