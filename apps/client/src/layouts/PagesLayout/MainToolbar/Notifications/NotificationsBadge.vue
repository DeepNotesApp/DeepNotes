<template>
  <q-badge
    v-if="numUnreadNotifications > 0"
    color="red"
    floating
    rounded
  >
    {{ numUnreadNotifications }}
  </q-badge>
</template>

<script setup lang="ts">
const numUnreadNotifications = computed(() => {
  return (
    pagesStore().notifications.items.reduce((acc, notification) => {
      if (
        notification.id > (pagesStore().notifications.lastNotificationRead ?? 0)
      ) {
        return acc + 1;
      } else {
        return acc;
      }
    }, 0) ?? 0
  );
});
</script>
