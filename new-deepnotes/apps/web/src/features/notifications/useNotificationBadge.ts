import { ref, type Ref } from "vue";

/**
 * Global unread notification count for the toolbar badge.
 * Updated when notifications are loaded or when new realtime notifications arrive.
 */
export const unreadNotificationCount: Ref<number> = ref(0);

/**
 * Increment the unread count (called when a realtime notification arrives).
 */
export function incrementUnreadCount() {
  unreadNotificationCount.value += 1;
}

/**
 * Set the unread count from the notifications list (called when user visits /notifications).
 */
export function setUnreadCount(count: number) {
  unreadNotificationCount.value = count;
}

/**
 * Reset the unread count to 0 (called when user marks all as read).
 */
export function resetUnreadCount() {
  unreadNotificationCount.value = 0;
}
