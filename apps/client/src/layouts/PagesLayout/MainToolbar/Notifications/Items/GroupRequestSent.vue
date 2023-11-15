<template>
  <NotificationItem
    :notification="notification"
    @click="onClick"
  >
    <q-item-label>{{ notificationInfo.get()?.message }}</q-item-label>

    <q-item-label
      v-if="notificationContent.recipientType === 'agent' && canCancelRequest"
      style="text-align: center"
    >
      <DeepBtn
        label="Cancel request"
        color="negative"
        style="margin: 8px"
        @click.stop="_cancelJoinRequest"
      />
    </q-item-label>

    <q-item-label
      v-if="
        notificationContent.recipientType === 'observer' && canAcceptRequest
      "
      style="text-align: center"
    >
      <DeepBtn
        label="Reject"
        color="negative"
        style="margin: 8px"
        @click.stop="_rejectJoinRequest"
      />

      <DeepBtn
        label="Accept"
        color="positive"
        style="margin: 8px"
        @click.stop="_acceptJoinRequest"
      />
    </q-item-label>
  </NotificationItem>
</template>

<script setup lang="ts">
import type { DeepNotesNotification } from '@deeplib/misc';
import { rolesMap } from '@deeplib/misc';
import { wrapSymmetricKey } from '@stdlib/crypto';
import { createSmartComputed } from '@stdlib/vue';
import { unpack } from 'msgpackr';
import type { QMenu } from 'quasar';
import { cancelJoinRequest } from 'src/code/api-interface/groups/join-requests/cancel';
import { rejectJoinRequest } from 'src/code/api-interface/groups/join-requests/reject';
import { getGroupRequestSentNotificationInfo } from 'src/code/pages/notifications/group-request-sent';
import type { RealtimeContext } from 'src/code/realtime/context';
import { asyncDialog, handleError } from 'src/code/utils/misc';
import GroupSettingsDialog from 'src/layouts/PagesLayout/RightSidebar/PageProperties/GroupSettingsDialog/GroupSettingsDialog.vue';
import AcceptRequestDialog from 'src/layouts/PagesLayout/RightSidebar/PageProperties/GroupSettingsDialog/RequestsTab/AcceptRequestDialog.vue';
import type { Ref } from 'vue';

import NotificationItem from '../NotificationItem.vue';

const props = defineProps<{
  notification: DeepNotesNotification;
}>();

const notificationsMenu = inject('notificationsMenu') as Ref<QMenu>;

const realtimeCtx = inject('realtimeCtx') as RealtimeContext;

const canCancelRequest = computed(
  () =>
    realtimeCtx.hget(
      'group-join-request',
      `${notificationContent.value.groupId}:${authStore().userId}`,
      'rejected',
    ) === false,
);

const canAcceptRequest = computed(() => {
  const rejected = realtimeCtx.hget(
    'group-join-request',
    `${notificationContent.value.groupId}:${notificationContent.value.agentId}`,
    'rejected',
  );

  const selfGroupRole = realtimeCtx.hget(
    'group-member',
    `${notificationContent.value.groupId}:${authStore().userId}`,
    'role',
  );

  return (
    rejected === false &&
    rolesMap()[selfGroupRole]?.permissions.manageLowerRanks
  );
});

const notificationContent = computed(() => {
  const symmetricKey = wrapSymmetricKey(
    internals.keyPair.decrypt(props.notification.encryptedSymmetricKey),
  );

  return unpack(
    symmetricKey.decrypt(props.notification.encryptedContent, {
      padding: true,
      associatedData: { context: 'UserNotificationContent' },
    }),
  );
});

const notificationInfo = createSmartComputed({
  get: () => getGroupRequestSentNotificationInfo(notificationContent.value),
});

async function onClick() {
  await router().push(`/groups/${notificationContent.value.groupId}`);

  $quasar().dialog({
    component: GroupSettingsDialog,

    componentProps: {
      groupId: notificationContent.value.groupId,
      initialTab: 'Join requests',
    },
  });

  notificationsMenu.value.hide();
}

async function _cancelJoinRequest() {
  try {
    await asyncDialog({
      title: 'Cancel join request',
      message: 'Are you sure you want to cancel the join request?',

      focus: 'cancel',

      cancel: { label: 'No', flat: true, color: 'primary' },
      ok: { label: 'Yes', flat: true, color: 'negative' },
    });

    await cancelJoinRequest({
      groupId: notificationContent.value.groupId,
    });

    notificationsMenu.value.hide();
  } catch (error) {
    handleError(error);
  }
}

async function _rejectJoinRequest() {
  try {
    await asyncDialog({
      title: 'Reject join request',
      message: 'Are you sure you want to reject the join request?',

      focus: 'cancel',

      cancel: { label: 'No', flat: true, color: 'primary' },
      ok: { label: 'Yes', flat: true, color: 'negative' },
    });

    await rejectJoinRequest({
      groupId: notificationContent.value.groupId,
      patientId: notificationContent.value.agentId,
    });

    notificationsMenu.value.hide();
  } catch (error) {
    handleError(error);
  }
}

async function _acceptJoinRequest() {
  $quasar()
    .dialog({
      component: AcceptRequestDialog,

      componentProps: {
        groupId: notificationContent.value.groupId,
        userIds: [notificationContent.value.agentId],
      },
    })
    .onDismiss(() => {
      notificationsMenu.value.hide();
    });
}
</script>
