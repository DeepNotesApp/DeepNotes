import { ref, type Ref } from "vue";

import { useSession } from "../auth/useSession";
import { fetchGroupsOverview, type GroupOverviewRow } from "./groups-overview";

export function useGroupsOverview() {
  const loading: Ref<boolean> = ref(false);
  const error: Ref<string | null> = ref(null);
  const rows: Ref<GroupOverviewRow[]> = ref([]);

  const { client, user, isAuthenticated } = useSession();

  async function load() {
    if (!isAuthenticated.value || user.value == null) {
      rows.value = [];
      return;
    }
    loading.value = true;
    error.value = null;
    try {
      const out = await fetchGroupsOverview({
        client,
        personalGroupId: user.value.personalGroupId,
      });
      rows.value = out.rows;
      error.value = out.error;
    } finally {
      loading.value = false;
    }
  }

  return {
    loading,
    error,
    rows,
    load,
  };
}
