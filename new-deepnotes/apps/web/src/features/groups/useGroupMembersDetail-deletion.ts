import type { Ref } from "vue";

import type { DeepnotesApiClient } from "../../api/client";
import type { GroupMembersDetail } from "./group-members-detail";

/**
 * Group deletion actions: soft delete, purge.
 */
export function useGroupDeletionActions({
  client,
  resolvedGroupId,
  detail,
  actionLoading,
  error,
}: {
  client: DeepnotesApiClient;
  resolvedGroupId: () => string | null;
  detail: Ref<GroupMembersDetail | null>;
  actionLoading: Ref<boolean>;
  error: Ref<string | null>;
}) {
  async function softDeleteGroup() {
    const id = resolvedGroupId();
    if (id == null) {
      return;
    }
    actionLoading.value = true;
    error.value = null;
    try {
      const res = await client.DELETE("/api/groups/{groupId}", {
        params: { path: { groupId: id } },
      });
      if (res.response.status !== 204) {
        error.value =
          res.error && typeof res.error === "object" && "message" in res.error
            ? String((res.error as { message?: string }).message)
            : "Could not delete group.";
        return;
      }
      detail.value = null;
    } finally {
      actionLoading.value = false;
    }
  }

  async function purgeGroup() {
    const id = resolvedGroupId();
    if (id == null) {
      return;
    }
    actionLoading.value = true;
    error.value = null;
    try {
      const res = await client.POST("/api/groups/{groupId}/purge", {
        params: { path: { groupId: id } },
      });
      if (res.response.status !== 204) {
        error.value =
          res.error && typeof res.error === "object" && "message" in res.error
            ? String((res.error as { message?: string }).message)
            : "Could not purge group.";
        return;
      }
      detail.value = null;
    } finally {
      actionLoading.value = false;
    }
  }

  return { softDeleteGroup, purgeGroup };
}
