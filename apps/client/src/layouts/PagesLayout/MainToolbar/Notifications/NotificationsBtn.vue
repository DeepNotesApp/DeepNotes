<template>
  <ToolbarBtn
    tooltip="Notifications"
    icon="mdi-bell"
    icon-size="24px"
    round
    :disable="!uiStore().loggedIn"
  >
    <NotificationsPopup />

    <NotificationsBadge />
  </ToolbarBtn>
</template>

<script setup lang="ts">
import NotificationsBadge from './NotificationsBadge.vue';
import NotificationsPopup from './NotificationsPopup.vue';
</script>
