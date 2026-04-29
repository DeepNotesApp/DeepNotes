import { ref, type Ref } from "vue";

/** Route `params.groupId` may be undefined until matched. */
export type GroupIdParamRef = Ref<string | string[] | undefined>;

import { base64ToBytes } from "@deepnotes/e2ee";

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
  buildMakePublicAccessKeyringB64,
  type InviteCryptoBootstrapJson,
} from "./group-membership-crypto";
import { buildGroupInviteSentNotifications } from "./group-notification-crypto";
import {
  buildGroupPrivacyMakePrivateRequest,
  type GroupPrivacyMakePrivateBootstrapJson,
} from "./group-make-private-crypto";

type GroupMemberRole = components["schemas"]["GroupMemberRole"];
type GroupInviteNotificationPayload =
  components["schemas"]["GroupInviteNotificationPayload"];

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

  async function fetchInviteBootstrap(inviteeUserId?: string): Promise<
    | { ok: true; data: InviteCryptoBootstrapJson }
    | { ok: false; error: string }
  > {
    const id = resolvedGroupId();
    if (id == null) {
      return { ok: false, error: "Invalid group." };
    }
    const res = await client.GET("/api/groups/{groupId}/invite-crypto-bootstrap", {
      params: {
        path: { groupId: id },
        query:
          inviteeUserId != null && inviteeUserId !== ""
            ? { inviteeUserId }
            : {},
      },
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
      const boot = await fetchInviteBootstrap(input.inviteeUserId);
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

      const recipientPublicKeyrings =
        boot.data.notificationRecipientPublicKeyrings?.map((r) => ({
          userId: r.userId,
          publicKeyring: base64ToBytes(r.publicKeyring),
        })) ?? [];

      let notifications: GroupInviteNotificationPayload[] | undefined;
      if (recipientPublicKeyrings.length > 0 && user.value?.userId != null) {
        notifications = await buildGroupInviteSentNotifications({
          stored,
          agentUserId: user.value.userId,
          inviteeUserId: input.inviteeUserId,
          groupId: id,
          inviteeDisplayName: input.inviteeDisplayName,
          recipientPublicKeyrings,
        });
      }

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
          ...(notifications != null && notifications.length > 0
            ? { notifications }
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

  async function setJoinRequestsAllowed(allowed: boolean) {
    const id = resolvedGroupId();
    if (id == null) {
      return;
    }
    actionLoading.value = true;
    error.value = null;
    try {
      const res = await client.PATCH(
        "/api/groups/{groupId}/privacy/join-requests",
        {
          params: { path: { groupId: id } },
          body: { areJoinRequestsAllowed: allowed },
        },
      );
      if (res.response.status !== 204) {
        error.value =
          res.error && typeof res.error === "object" && "message" in res.error
            ? String((res.error as { message?: string }).message)
            : "Could not update join request policy.";
        return;
      }
      await load();
    } finally {
      actionLoading.value = false;
    }
  }

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

  async function makeGroupPublic() {
    const id = resolvedGroupId();
    const d = detail.value;
    if (id == null || d == null) {
      return;
    }
    if (d.groupIsPublic) {
      error.value = "Group is already public.";
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
      const accessKeyring = await buildMakePublicAccessKeyringB64({
        stored,
        bootstrap: boot.data,
      });
      const res = await client.POST("/api/groups/{groupId}/privacy/public", {
        params: { path: { groupId: id } },
        body: { accessKeyring },
      });
      if (res.response.status !== 204) {
        error.value =
          res.error && typeof res.error === "object" && "message" in res.error
            ? String((res.error as { message?: string }).message)
            : "Could not make group public.";
        return;
      }
      await load();
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Could not make group public.";
    } finally {
      actionLoading.value = false;
    }
  }

  async function makeGroupPrivate() {
    const id = resolvedGroupId();
    const d = detail.value;
    if (id == null || d == null) {
      return;
    }
    if (!d.groupIsPublic) {
      error.value = "Group is already private.";
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
      const bootRes = await client.GET(
        "/api/groups/{groupId}/privacy/make-private-bootstrap",
        { params: { path: { groupId: id } } },
      );
      if (bootRes.response.status !== 200 || bootRes.data == null) {
        error.value =
          bootRes.error &&
          typeof bootRes.error === "object" &&
          "message" in bootRes.error
            ? String((bootRes.error as { message?: string }).message)
            : "Could not load make-private bootstrap.";
        return;
      }
      const body = await buildGroupPrivacyMakePrivateRequest({
        groupId: id,
        groupIsPublic: false,
        stored,
        bootstrap: bootRes.data as GroupPrivacyMakePrivateBootstrapJson,
      });
      const res = await client.POST("/api/groups/{groupId}/privacy/private", {
        params: { path: { groupId: id } },
        body,
      });
      if (res.response.status !== 204) {
        error.value =
          res.error && typeof res.error === "object" && "message" in res.error
            ? String((res.error as { message?: string }).message)
            : "Could not make group private.";
        return;
      }
      await load();
    } catch (e) {
      error.value =
        e instanceof Error ? e.message : "Could not make group private.";
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
    setJoinRequestsAllowed,
    makeGroupPublic,
    makeGroupPrivate,
    softDeleteGroup,
    purgeGroup,
  };
}
