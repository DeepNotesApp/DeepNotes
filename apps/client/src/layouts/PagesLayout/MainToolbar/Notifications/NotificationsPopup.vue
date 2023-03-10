<template>
  <q-menu
    anchor="bottom middle"
    self="top middle"
    style="width: 250px"
    @before-show="onBeforeShow()"
  >
    <q-list>
      <template v-if="filteredNotifications.length === 0">
        <q-item>
          <q-item-section style="padding: 8px 0">
            You have no new notifications.

            <template v-if="pagesStore().notifications.items.length > 0">
              <Gap style="height: 8px" />

              <DeepBtn
                label="Show older notifications"
                color="primary"
                style="text-transform: none"
                @click="minNotificationId = 0"
              />
            </template>
          </q-item-section>
        </q-item>
      </template>

      <template v-else>
        <q-infinite-scroll @load="onLoad">
          <template
            v-for="notification in filteredNotifications"
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
        </q-infinite-scroll>
      </template>
    </q-list>
  </q-menu>
</template>

<script setup lang="ts">
import type { DeepNotesNotification } from '@deeplib/misc';
import { handleError } from 'src/code/utils.client';

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

const minNotificationId = ref<number>(0);

const filteredNotifications = computed(() =>
  pagesStore().notifications.items.filter(
    (notification) => !(notification.id <= minNotificationId.value),
  ),
);

async function onBeforeShow() {
  try {
    minNotificationId.value = pagesStore().notifications.lastNotificationRead!;

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

    await api().post('/api/users/notifications/mark-as-read');
  } catch (error: any) {
    handleError(error);
  }
}

async function onLoad(index: number, done: (stop?: boolean) => void) {
  try {
    const notifications = (
      await api().post<{
        notifications: {
          items: DeepNotesNotification[];

          hasMore: boolean;
        };
      }>('/api/users/notifications/load', {
        lastNotificationId: pagesStore().notifications.items.at(-1)?.id,
      })
    ).data.notifications;

    pagesStore().notifications.items.push(...notifications.items);
    pagesStore().notifications.hasMore = notifications.hasMore;

    done(!notifications.hasMore);
  } catch (error: any) {
    handleError(error);

    done(true);
  }
}
</script>
