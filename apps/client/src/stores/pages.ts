import type { DeepNotesNotification } from '@deeplib/misc';
import { defineStore } from 'pinia';

export const GROUP_CONTENT_KEYRING = 'group-content-keyring';

export const usePagesStore = defineStore('pages', () => {
  const state = reactive({
    loading: true,

    dict: {} as Record<string, any>,

    notifications: {
      items: [] as DeepNotesNotification[],
      hasMore: true,
      lastNotificationRead: -1 as number | undefined,
    },

    groups: {} as Record<string, { userIds: Set<string> }>,
  });

  return {
    ...toRefs(state),
  };
});
