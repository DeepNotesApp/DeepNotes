import { ref, type Ref } from "vue";

/** Route `params.groupId` may be undefined until matched. */
export type GroupIdParamRef = Ref<string | string[] | undefined>;

import type { components } from "../../api/api-types.generated";
import { readSessionCrypto } from "../auth/session-keyrings";
import { useSession } from "../auth/useSession";
import {
  fetchGroupMembersDetail,
  type GroupMembersDetail,
} from "./group-members-detail";
import {
  buildJoinInvitationSendBodies,
  buildJoinRequestAcceptBodies,
  type InviteCryptoBootstrapJson,
} from "./group-membership-crypto";

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

  async function fetchInviteBootstrap(): Promise<
    | { ok: true; data: InviteCryptoBootstrapJson }
    | { ok: false; error: string }
  > {
    const id = resolvedGroupId();
    if (id == null) {
      return { ok: false, error: "Invalid group." };
    }
    const res = await client.GET("/api/groups/{groupId}/invite-crypto-bootstrap", {
      params: { path: { groupId: id } },
    });
    if (res.response.status !== 200 || res.data == null) {
      const msg =
        res.error && typeof res.error === "object" && "message" in res.error
          ? String((res.error as { message?: string }).message)
          : "Could not load invite crypto material.";
      return { ok: false, error: msg };
    }
    const d = res.data as InviteCryptoBootstrapJson;
    return { ok: true, data: d };
  }

  async function sendJoinInvitation(input: {
    inviteeUserId: string;
    invitationRole: GroupMemberRole;
    inviteeDisplayName: string;
  }) {
    const id = resolvedGroupId();
    const d = detail.value;
    if (id == null || d == null) {
      return;
    }
    const stored = readSessionCrypto();
    if (stored == null) {
      error.value =
        "Client crypto is not unlocked. Sign in with your account password (not demo) on this device.";
      return;
    }
    actionLoading.value = true;
    error.value = null;
    try {
      const boot = await fetchInviteBootstrap();
      if (!boot.ok) {
        error.value = boot.error;
        return;
      }
      const pkRes = await client.GET("/api/users/{userId}/public-keyring", {
        params: { path: { userId: input.inviteeUserId } },
      });
      if (pkRes.response.status !== 200 || pkRes.data == null) {
        error.value =
          pkRes.error &&
          typeof pkRes.error === "object" &&
          "message" in pkRes.error
            ? String((pkRes.error as { message?: string }).message)
            : "Could not load invitee public key.";
        return;
      }
      const bodies = await buildJoinInvitationSendBodies({
        stored,
        bootstrap: boot.data,
        inviteePublicKeyringB64: pkRes.data.publicKeyring,
        inviteeDisplayName: input.inviteeDisplayName,
        groupIsPublic: d.groupIsPublic,
      });
      const res = await client.POST("/api/groups/{groupId}/join-invitations", {
        params: { path: { groupId: id } },
        body: {
          inviteeUserId: input.inviteeUserId,
          invitationRole: input.invitationRole,
          encryptedInternalKeyring: bodies.encryptedInternalKeyring,
          userEncryptedName: bodies.userEncryptedName,
          userEncryptedNameForUser: bodies.userEncryptedNameForUser,
          ...(bodies.encryptedAccessKeyring != null
            ? { encryptedAccessKeyring: bodies.encryptedAccessKeyring }
            : {}),
        },
      });
      if (res.response.status !== 204) {
        error.value =
          res.error && typeof res.error === "object" && "message" in res.error
            ? String((res.error as { message?: string }).message)
            : "Could not send invitation.";
        return;
      }
      await load();
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Invitation failed.";
    } finally {
      actionLoading.value = false;
    }
  }

  async function acceptJoinRequestWithCrypto(input: {
    requesterUserId: string;
    targetRole: GroupMemberRole;
  }) {
    const id = resolvedGroupId();
    const d = detail.value;
    if (id == null || d == null) {
      return;
    }
    const stored = readSessionCrypto();
    if (stored == null) {
      error.value =
        "Client crypto is not unlocked. Sign in with your account password (not demo) on this device.";
      return;
    }
    actionLoading.value = true;
    error.value = null;
    try {
      const boot = await fetchInviteBootstrap();
      if (!boot.ok) {
        error.value = boot.error;
        return;
      }
      const pkRes = await client.GET("/api/users/{userId}/public-keyring", {
        params: { path: { userId: input.requesterUserId } },
      });
      if (pkRes.response.status !== 200 || pkRes.data == null) {
        error.value =
          pkRes.error &&
          typeof pkRes.error === "object" &&
          "message" in pkRes.error
            ? String((pkRes.error as { message?: string }).message)
            : "Could not load requester public key.";
        return;
      }
      const bodies = await buildJoinRequestAcceptBodies({
        stored,
        bootstrap: boot.data,
        requesterPublicKeyringB64: pkRes.data.publicKeyring,
        groupIsPublic: d.groupIsPublic,
      });
      const res = await client.POST(
        "/api/groups/{groupId}/join-requests/{userId}/accept",
        {
          params: {
            path: { groupId: id, userId: input.requesterUserId },
          },
          body: {
            targetRole: input.targetRole,
            encryptedInternalKeyring: bodies.encryptedInternalKeyring,
            ...(bodies.encryptedAccessKeyring != null
              ? { encryptedAccessKeyring: bodies.encryptedAccessKeyring }
              : {}),
          },
        },
      );
      if (res.response.status !== 204) {
        error.value =
          res.error && typeof res.error === "object" && "message" in res.error
            ? String((res.error as { message?: string }).message)
            : "Could not accept join request.";
        return;
      }
      await load();
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Accept request failed.";
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
    sendJoinInvitation,
    acceptJoinRequestWithCrypto,
  };
}
