import type { Ref } from "vue";

import type { DeepnotesApiClient } from "../../api/client";
import type { components } from "../../api/api-types.generated";
import type { GroupMembersDetail } from "./group-members-detail";
import {
  buildJoinRequestAcceptBodies,
  type InviteCryptoBootstrapJson,
} from "./group-membership-crypto";
import { readSessionCrypto } from "../auth/session-keyrings";

type GroupMemberRole = components["schemas"]["GroupMemberRole"];

/**
 * Group join request actions: accept, reject.
 */
export function useGroupJoinRequestActions({
  client,
  resolvedGroupId,
  detail,
  actionLoading,
  error,
  load,
}: {
  client: DeepnotesApiClient;
  resolvedGroupId: () => string | null;
  detail: Ref<GroupMembersDetail | null>;
  actionLoading: Ref<boolean>;
  error: Ref<string | null>;
  load: () => Promise<void>;
}) {
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
        "Client crypto is not unlocked. Sign in with your account password on this device.";
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

  return { acceptJoinRequestWithCrypto, rejectJoinRequest };
}
