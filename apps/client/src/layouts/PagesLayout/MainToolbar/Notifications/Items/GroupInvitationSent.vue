<template>
  <NotificationItem
    :notification="notification"
    @click="onClick"
  >
    <q-item-label>{{ notificationInfo.get()?.message }}</q-item-label>

    <q-item-label
      v-if="
        notificationContent.recipientType === 'agent' && canCancelInvitation
      "
      style="text-align: center"
    >
      <DeepBtn
        label="Cancel invitation"
        color="negative"
        style="margin: 8px"
        @click.stop="_cancelJoinInvitation"
      />
    </q-item-label>

    <q-item-label
      v-if="
        notificationContent.recipientType === 'target' && canAcceptInvitation
      "
      style="text-align: center"
    >
      <DeepBtn
        label="Reject"
        color="negative"
        style="margin: 8px"
        @click.stop="_rejectJoinInvitation"
      />

      <DeepBtn
        label="Accept"
        color="positive"
        style="margin: 8px"
        @click.stop="_acceptJoinInvitation"
      />
    </q-item-label>
  </NotificationItem>
</template>

<script setup lang="ts">
import type { DeepNotesNotification } from '@deeplib/misc';
import { canManageRole } from '@deeplib/misc';
import { wrapSymmetricKey } from '@stdlib/crypto';
import { createSmartComputed } from '@stdlib/vue';
import { unpack } from 'msgpackr';
import type { QMenu } from 'quasar';
import { cancelJoinInvitation } from 'src/code/api-interface/groups/join-invitations/cancel';
import { rejectJoinInvitation } from 'src/code/api-interface/groups/join-invitations/reject';
import { getGroupInvitationSentNotificationInfo } from 'src/code/pages/notifications/group-invitation-sent';
import type { RealtimeContext } from 'src/code/realtime/context';
import { asyncDialog, handleError } from 'src/code/utils/misc';
import AcceptInvitationDialog from 'src/layouts/PagesLayout/MainContent/DisplayPage/DisplayScreens/AcceptInvitationDialog.vue';
import GroupSettingsDialog from 'src/layouts/PagesLayout/RightSidebar/PageProperties/GroupSettingsDialog/GroupSettingsDialog.vue';
import type { Ref } from 'vue';

import NotificationItem from '../NotificationItem.vue';

const props = defineProps<{
  notification: DeepNotesNotification;
}>();

const notificationsMenu = inject('notificationsMenu') as Ref<QMenu>;

const realtimeCtx = inject('realtimeCtx') as RealtimeContext;

const canCancelInvitation = computed(() => {
  const selfGroupRole = realtimeCtx.hget(
    'group-member',
    `${notificationContent.value.groupId}:${authStore().userId}`,
    'role',
  );

  const inviteeGroupRole = realtimeCtx.hget(
    'group-join-invitation',
    `${notificationContent.value.groupId}:${notificationContent.value.patientId}`,
    'role',
  );

  return canManageRole(selfGroupRole, inviteeGroupRole);
});

const canAcceptInvitation = computed(() =>
  realtimeCtx.hget(
    'group-join-invitation',
    `${notificationContent.value.groupId}:${authStore().userId}`,
    'exists',
  ),
);

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
  get: () => getGroupInvitationSentNotificationInfo(notificationContent.value),
});

async function onClick() {
  await router().push(`/groups/${notificationContent.value.groupId}`);

  if (notificationContent.value.recipientType !== 'target') {
    $quasar().dialog({
      component: GroupSettingsDialog,

      componentProps: {
        groupId: notificationContent.value.groupId,
        initialTab: 'Join invitations',
      },
    });
  }

  notificationsMenu.value.hide();
}

async function _cancelJoinInvitation() {
  try {
    await asyncDialog({
      title: 'Cancel join invitation',
      message: 'Are you sure you want to cancel the join invitation?',

      focus: 'cancel',

      cancel: { label: 'No', flat: true, color: 'primary' },
      ok: { label: 'Yes', flat: true, color: 'negative' },
    });

    await cancelJoinInvitation({
      groupId: notificationContent.value.groupId,
      patientId: notificationContent.value.patientId,
    });

    notificationsMenu.value.hide();
  } catch (error) {
    handleError(error);
  }
}

async function _rejectJoinInvitation() {
  try {
    await asyncDialog({
      title: 'Reject join invitation',
      message: 'Are you sure you want to reject the join invitation?',

      focus: 'cancel',

      cancel: { label: 'No', flat: true, color: 'primary' },
      ok: { label: 'Yes', flat: true, color: 'negative' },
    });

    await rejectJoinInvitation(notificationContent.value.groupId);

    notificationsMenu.value.hide();
  } catch (error) {
    handleError(error);
  }
}

async function _acceptJoinInvitation() {
  $quasar()
    .dialog({
      component: AcceptInvitationDialog,

      componentProps: {
        groupIds: [notificationContent.value.groupId],
      },
    })
    .onDismiss(() => {
      notificationsMenu.value.hide();
    });
}
</script>
