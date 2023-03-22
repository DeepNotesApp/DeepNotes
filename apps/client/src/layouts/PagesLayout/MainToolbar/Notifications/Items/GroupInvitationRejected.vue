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
import { getGroupInvitationRejectedNotificationInfo } from 'src/code/pages/notifications/group-invitation-rejected.client';
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
    getGroupInvitationRejectedNotificationInfo(notificationContent.value),
});

const notificationsMenu = inject('notificationsMenu') as Ref<QMenu>;

async function onClick() {
  await router().push(`/groups/${notificationContent.value.groupId}`);

  notificationsMenu.value.hide();
}
</script>
