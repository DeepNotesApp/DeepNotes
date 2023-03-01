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
import { getGroupInvitationRejectedNotificationInfo } from 'src/code/pages/notifications/group-invitation-rejected.client';

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
    symmetricKey.decrypt(base64ToBytes(props.notification.encryptedContent)),
  );
});

const notificationInfo = createSmartComputed({
  get: () =>
    getGroupInvitationRejectedNotificationInfo(notificationContent.value),
});

async function onClick() {
  await router().push(`/groups/${notificationContent.value.groupId}`);
}
</script>
