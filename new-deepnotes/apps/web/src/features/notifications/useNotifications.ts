import { ref, type Ref } from "vue";

import { useSession } from "../auth/useSession";
import {
  fetchNotificationsPage,
  markAllNotificationsRead,
  type NotificationRow,
} from "./notifications-list";

export function useNotifications() {
  const loading: Ref<boolean> = ref(false);
  const error: Ref<string | null> = ref(null);
  const rows: Ref<NotificationRow[]> = ref([]);
  const hasMore: Ref<boolean> = ref(false);
  const lastReadCursor: Ref<number | null> = ref(null);
  const markingRead: Ref<boolean> = ref(false);

  const { client, isAuthenticated } = useSession();

  async function loadFirst() {
    if (!isAuthenticated.value) {
      rows.value = [];
      hasMore.value = false;
      lastReadCursor.value = null;
      return;
    }
    loading.value = true;
    error.value = null;
    try {
      const out = await fetchNotificationsPage({ client });
      rows.value = out.rows;
      hasMore.value = out.hasMore;
      lastReadCursor.value =
        out.lastNotificationRead === undefined
          ? null
          : (out.lastNotificationRead ?? null);
      error.value = out.error;
    } finally {
      loading.value = false;
    }
  }

  async function loadMore() {
    if (!isAuthenticated.value || rows.value.length === 0) {
      return;
    }
    const oldest = rows.value[rows.value.length - 1];
    if (oldest == null) {
      return;
    }
    loading.value = true;
    error.value = null;
    try {
      const out = await fetchNotificationsPage({
        client,
        lastNotificationId: oldest.id,
        readCursorForUnread: lastReadCursor.value,
      });
      if (out.error) {
        error.value = out.error;
        return;
      }
      rows.value = [...rows.value, ...out.rows];
      hasMore.value = out.hasMore;
    } finally {
      loading.value = false;
    }
  }

  async function markRead() {
    if (!isAuthenticated.value) {
      return;
    }
    markingRead.value = true;
    error.value = null;
    try {
      const out = await markAllNotificationsRead({ client });
      if (!out.ok) {
        error.value = out.error;
        return;
      }
      const maxId =
        rows.value.length > 0
          ? Math.max(...rows.value.map((r) => r.id))
          : null;
      lastReadCursor.value = maxId;
      rows.value = rows.value.map((r) => ({ ...r, unread: false }));
    } finally {
      markingRead.value = false;
    }
  }

  return {
    loading,
    error,
    rows,
    hasMore,
    lastReadCursor,
    markingRead,
    loadFirst,
    loadMore,
    markRead,
  };
}
