import type { Ref } from "vue";

import type { DeepnotesApiClient } from "../../api/client";
import type { components } from "../../api/api-types.generated";
import type { GroupMembersDetail } from "./group-members-detail";

type GroupMemberRole = components["schemas"]["GroupMemberRole"];

/**
 * Basic group member actions: leave, remove, change role.
 */
export function useGroupMemberActions({
  client,
  resolvedGroupId,
  detail,
  actionLoading,
  error,
  load,
  user,
}: {
  client: DeepnotesApiClient;
  resolvedGroupId: () => string | null;
  detail: Ref<GroupMembersDetail | null>;
  actionLoading: Ref<boolean>;
  error: Ref<string | null>;
  load: () => Promise<void>;
  user: Ref<{ userId: string } | null>;
}) {
  async function leaveGroup() {
    const id = resolvedGroupId();
    const uid = user.value?.userId;
    if (id == null || uid == null) {
      return;
    }
    actionLoading.value = true;
    error.value = null;
    try {
      const res = await client.DELETE("/api/groups/{groupId}/members/{userId}", {
        params: { path: { groupId: id, userId: uid } },
      });
      if (res.response.status !== 204) {
        error.value =
          res.error && typeof res.error === "object" && "message" in res.error
            ? String((res.error as { message?: string }).message)
            : "Could not leave group.";
        return;
      }
      error.value = null;
      detail.value = null;
    } finally {
      actionLoading.value = false;
    }
  }

  async function removeMember(targetUserId: string) {
    const id = resolvedGroupId();
    if (id == null) {
      return;
    }
    actionLoading.value = true;
    error.value = null;
    try {
      const res = await client.DELETE("/api/groups/{groupId}/members/{userId}", {
        params: { path: { groupId: id, userId: targetUserId } },
      });
      if (res.response.status !== 204) {
        error.value =
          res.error && typeof res.error === "object" && "message" in res.error
            ? String((res.error as { message?: string }).message)
            : "Could not remove member.";
        return;
      }
      await load();
    } finally {
      actionLoading.value = false;
    }
  }

  async function patchMemberRole(targetUserId: string, role: GroupMemberRole) {
    const id = resolvedGroupId();
    if (id == null) {
      return;
    }
    actionLoading.value = true;
    error.value = null;
    try {
      const res = await client.PATCH("/api/groups/{groupId}/members/{userId}", {
        params: { path: { groupId: id, userId: targetUserId } },
        body: { role },
      });
      if (res.response.status !== 204) {
        error.value =
          res.error && typeof res.error === "object" && "message" in res.error
            ? String((res.error as { message?: string }).message)
            : "Could not change role.";
        return;
      }
      await load();
    } finally {
      actionLoading.value = false;
    }
  }

  return { leaveGroup, removeMember, patchMemberRole };
}
