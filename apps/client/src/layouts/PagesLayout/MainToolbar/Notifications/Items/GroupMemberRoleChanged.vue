<template>
  <NotificationItem
    :notification="notification"
    @click="onClick"
  >
    <q-item-label>{{ notificationInfo.get()?.message }}</q-item-label>
  </NotificationItem>
</template>

<script setup lang="ts">
import type { DeepNotesNotification } from '@deeplib/misc';
import { base64ToBytes } from '@stdlib/base64';
import { wrapSymmetricKey } from '@stdlib/crypto';
import { createSmartComputed } from '@stdlib/vue';
import { unpack } from 'msgpackr';
import type { QMenu } from 'quasar';
import { getGroupMemberRoleChangedNotificationInfo } from 'src/code/pages/notifications/group-member-role-changed';
import GroupSettingsDialog from 'src/layouts/PagesLayout/RightSidebar/PageProperties/GroupSettingsDialog/GroupSettingsDialog.vue';
import type { Ref } from 'vue';

import NotificationItem from '../NotificationItem.vue';

const props = defineProps<{
  notification: DeepNotesNotification;
}>();

const notificationContent = computed(() => {
  const symmetricKey = wrapSymmetricKey(
    internals.keyPair.decrypt(
      base64ToBytes(props.notification.encryptedSymmetricKey),
    ),
  );

  return unpack(
    symmetricKey.decrypt(base64ToBytes(props.notification.encryptedContent), {
      padding: true,
      associatedData: { context: 'UserNotificationContent' },
    }),
  );
});

const notificationInfo = createSmartComputed({
  get: () =>
    getGroupMemberRoleChangedNotificationInfo(notificationContent.value),
});

const notificationsMenu = inject('notificationsMenu') as Ref<QMenu>;

async function onClick() {
  await router().push(`/groups/${notificationContent.value.groupId}`);

  $quasar().dialog({
    component: GroupSettingsDialog,

    componentProps: {
      groupId: notificationContent.value.groupId,
      initialTab: 'Members',
    },
  });

  notificationsMenu.value.hide();
}
</script>
