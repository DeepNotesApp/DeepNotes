import type { Ref } from "vue";

import type { DeepnotesApiClient } from "../../api/client";
import type { GroupMembersDetail } from "./group-members-detail";
import {
  buildMakePublicAccessKeyringB64,
  type InviteCryptoBootstrapJson,
} from "./group-membership-crypto";
import {
  buildGroupPrivacyMakePrivateRequest,
  type GroupPrivacyMakePrivateBootstrapJson,
} from "./group-make-private-crypto";
import { readSessionCrypto } from "../auth/session-keyrings";

/**
 * Group privacy actions: make public/private, allow join requests.
 */
export function useGroupPrivacyActions({
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
        "Client crypto is not unlocked. Sign in with your account password on this device.";
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

  return { makeGroupPublic, makeGroupPrivate, setJoinRequestsAllowed };
}
