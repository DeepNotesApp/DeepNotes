import { ref, type Ref } from "vue";

/** Route `params.groupId` may be undefined until matched. */
export type GroupIdParamRef = Ref<string | string[] | undefined>;

import type { components } from "../../api/api-types.generated";
import { useSession } from "../auth/useSession";
import {
  fetchGroupMembersDetail,
  type GroupMembersDetail,
} from "./group-members-detail";

type GroupMemberRole = components["schemas"]["GroupMemberRole"];

export function useGroupMembersDetail(groupId: GroupIdParamRef) {
  const loading: Ref<boolean> = ref(false);
  const actionLoading: Ref<boolean> = ref(false);
  const error: Ref<string | null> = ref(null);
  const detail: Ref<GroupMembersDetail | null> = ref(null);

  const { client, isAuthenticated, user } = useSession();

  function resolvedGroupId(): string | null {
    const g = groupId.value;
    const id = Array.isArray(g) ? g[0] : g;
    return id && /^[A-Za-z0-9_-]{21}$/.test(id) ? id : null;
  }

  async function load() {
    const id = resolvedGroupId();
    if (!isAuthenticated.value || id == null) {
      detail.value = null;
      return;
    }
    loading.value = true;
    error.value = null;
    try {
      const out = await fetchGroupMembersDetail({ client, groupId: id });
      detail.value = out.data;
      error.value = out.error;
    } finally {
      loading.value = false;
    }
  }

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

  async function cancelInvitation(inviteeUserId: string) {
    const id = resolvedGroupId();
    if (id == null) {
      return;
    }
    actionLoading.value = true;
    error.value = null;
    try {
      const res = await client.DELETE(
        "/api/groups/{groupId}/join-invitations/{userId}",
        { params: { path: { groupId: id, userId: inviteeUserId } } },
      );
      if (res.response.status !== 204) {
        error.value =
          res.error && typeof res.error === "object" && "message" in res.error
            ? String((res.error as { message?: string }).message)
            : "Could not cancel invitation.";
        return;
      }
      await load();
    } finally {
      actionLoading.value = false;
    }
  }

  async function rejectMyInvitation() {
    const id = resolvedGroupId();
    if (id == null) {
      return;
    }
    actionLoading.value = true;
    error.value = null;
    try {
      const res = await client.POST(
        "/api/groups/{groupId}/join-invitations/me/reject",
        { params: { path: { groupId: id } } },
      );
      if (res.response.status !== 204) {
        error.value =
          res.error && typeof res.error === "object" && "message" in res.error
            ? String((res.error as { message?: string }).message)
            : "Could not reject invitation.";
        return;
      }
      await load();
    } finally {
      actionLoading.value = false;
    }
  }

  async function rejectJoinRequest(requesterUserId: string) {
    const id = resolvedGroupId();
    if (id == null) {
      return;
    }
    actionLoading.value = true;
    error.value = null;
    try {
      const res = await client.POST(
        "/api/groups/{groupId}/join-requests/{userId}/reject",
        { params: { path: { groupId: id, userId: requesterUserId } } },
      );
      if (res.response.status !== 204) {
        error.value =
          res.error && typeof res.error === "object" && "message" in res.error
            ? String((res.error as { message?: string }).message)
            : "Could not reject join request.";
        return;
      }
      await load();
    } finally {
      actionLoading.value = false;
    }
  }

  return {
    loading,
    actionLoading,
    error,
    detail,
    load,
    leaveGroup,
    removeMember,
    patchMemberRole,
    cancelInvitation,
    rejectMyInvitation,
    rejectJoinRequest,
  };
}
