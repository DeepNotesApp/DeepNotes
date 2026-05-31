import type { Ref } from "vue";

import { base64ToBytes } from "@deepnotes/e2ee";

import type { DeepnotesApiClient } from "../../api/client";
import type { components } from "../../api/api-types.generated";
import { readSessionCrypto } from "../auth/session-keyrings";
import type { GroupMembersDetail } from "./group-members-detail";
import {
  buildJoinInvitationSendBodies,
  type InviteCryptoBootstrapJson,
} from "./group-membership-crypto";
import { buildGroupInviteSentNotifications } from "./group-notification-crypto";

type GroupMemberRole = components["schemas"]["GroupMemberRole"];
type GroupInviteNotificationPayload =
  components["schemas"]["GroupInviteNotificationPayload"];

/**
 * Group invitation actions: send, cancel, reject.
 */
export function useGroupInvitationActions({
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

  return { sendJoinInvitation, cancelInvitation, rejectMyInvitation };
}
