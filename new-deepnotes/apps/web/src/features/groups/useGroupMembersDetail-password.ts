import type { Ref } from "vue";

import { base64ToBytes } from "@deepnotes/e2ee";

import type { DeepnotesApiClient } from "../../api/client";
import {
  buildGroupPasswordEnableRequestBody,
  buildGroupPasswordChangeRequestBody,
  buildGroupPasswordDisableRequestBody,
} from "./group-password-crypto";
import { readSessionCrypto } from "../auth/session-keyrings";

/**
 * Group password management actions: enable, change, disable.
 */
export function useGroupPasswordActions({
  client,
  resolvedGroupId,
  actionLoading,
  error,
  load,
}: {
  client: DeepnotesApiClient;
  resolvedGroupId: () => string | null;
  actionLoading: Ref<boolean>;
  error: Ref<string | null>;
  load: () => Promise<void>;
}) {
  async function enableGroupPassword(password: string) {
    const id = resolvedGroupId();
    if (id == null) {
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
      const ctx = await client.GET("/api/groups/{groupId}/collab-crypto-context", {
        params: { path: { groupId: id } },
      });
      if (ctx.response.status !== 200 || ctx.data == null) {
        error.value =
          ctx.error && typeof ctx.error === "object" && "message" in ctx.error
            ? String((ctx.error as { message?: string }).message)
            : "Could not load group crypto context.";
        return;
      }
      const body = await buildGroupPasswordEnableRequestBody({
        groupId: id,
        password,
        groupEncryptedContentKeyring: base64ToBytes(ctx.data.groupEncryptedContentKeyring),
        memberEncryptedAccessKeyring:
          ctx.data.memberEncryptedAccessKeyring != null
            ? base64ToBytes(ctx.data.memberEncryptedAccessKeyring)
            : null,
        groupAccessKeyring:
          ctx.data.groupAccessKeyring != null
            ? base64ToBytes(ctx.data.groupAccessKeyring)
            : null,
        stored,
      });
      const res = await client.POST("/api/groups/{groupId}/password", {
        params: { path: { groupId: id } },
        body,
      });
      if (res.response.status !== 204) {
        error.value =
          res.error && typeof res.error === "object" && "message" in res.error
            ? String((res.error as { message?: string }).message)
            : "Could not enable group password.";
        return;
      }
      await load();
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Could not enable group password.";
    } finally {
      actionLoading.value = false;
    }
  }

  async function changeGroupPassword(currentPassword: string, newPassword: string) {
    const id = resolvedGroupId();
    if (id == null) {
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
      const ctx = await client.GET("/api/groups/{groupId}/collab-crypto-context", {
        params: { path: { groupId: id } },
      });
      if (ctx.response.status !== 200 || ctx.data == null) {
        error.value =
          ctx.error && typeof ctx.error === "object" && "message" in ctx.error
            ? String((ctx.error as { message?: string }).message)
            : "Could not load group crypto context.";
        return;
      }
      const body = await buildGroupPasswordChangeRequestBody({
        groupId: id,
        currentPassword,
        newPassword,
        groupEncryptedContentKeyring: base64ToBytes(ctx.data.groupEncryptedContentKeyring),
        memberEncryptedAccessKeyring:
          ctx.data.memberEncryptedAccessKeyring != null
            ? base64ToBytes(ctx.data.memberEncryptedAccessKeyring)
            : null,
        groupAccessKeyring:
          ctx.data.groupAccessKeyring != null
            ? base64ToBytes(ctx.data.groupAccessKeyring)
            : null,
        stored,
      });
      const res = await client.PATCH("/api/groups/{groupId}/password", {
        params: { path: { groupId: id } },
        body,
      });
      if (res.response.status !== 204) {
        error.value =
          res.error && typeof res.error === "object" && "message" in res.error
            ? String((res.error as { message?: string }).message)
            : "Could not change group password.";
        return;
      }
      await load();
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Could not change group password.";
    } finally {
      actionLoading.value = false;
    }
  }

  async function disableGroupPassword(currentPassword: string) {
    const id = resolvedGroupId();
    if (id == null) {
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
      const ctx = await client.GET("/api/groups/{groupId}/collab-crypto-context", {
        params: { path: { groupId: id } },
      });
      if (ctx.response.status !== 200 || ctx.data == null) {
        error.value =
          ctx.error && typeof ctx.error === "object" && "message" in ctx.error
            ? String((ctx.error as { message?: string }).message)
            : "Could not load group crypto context.";
        return;
      }
      const body = await buildGroupPasswordDisableRequestBody({
        groupId: id,
        currentPassword,
        groupEncryptedContentKeyring: base64ToBytes(ctx.data.groupEncryptedContentKeyring),
        memberEncryptedAccessKeyring:
          ctx.data.memberEncryptedAccessKeyring != null
            ? base64ToBytes(ctx.data.memberEncryptedAccessKeyring)
            : null,
        groupAccessKeyring:
          ctx.data.groupAccessKeyring != null
            ? base64ToBytes(ctx.data.groupAccessKeyring)
            : null,
        stored,
      });
      const res = await client.DELETE("/api/groups/{groupId}/password", {
        params: { path: { groupId: id } },
        body,
      });
      if (res.response.status !== 204) {
        error.value =
          res.error && typeof res.error === "object" && "message" in res.error
            ? String((res.error as { message?: string }).message)
            : "Could not disable group password.";
        return;
      }
      await load();
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Could not disable group password.";
    } finally {
      actionLoading.value = false;
    }
  }

  return { enableGroupPassword, changeGroupPassword, disableGroupPassword };
}
