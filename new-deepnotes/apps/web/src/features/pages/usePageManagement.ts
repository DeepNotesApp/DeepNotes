import type { ComputedRef, Ref } from "vue";

import type { DeepnotesApiClient } from "@/api/client";
import type { Router } from "vue-router";

import { readSessionCrypto } from "../auth/crypto-storage";
import type { UserMe } from "../auth/useSession";
import { buildCrossGroupPageMoveReencrypt } from "./page-move-crypto";
import type { SnapshotRow } from "./page-snapshot-list";

import type { SymmetricKeyring } from "@deepnotes/e2ee";

export function usePageManagement(opts: {
  pageId: ComputedRef<string>;
  user: Ref<UserMe | null>;
  client: DeepnotesApiClient;
  router: Router;
  collabGroupId: Ref<string | null>;
  moveDestGroupId: Ref<string>;
  pageEncRelTitleB64: Ref<string | null>;
  pageEncAbsTitleB64: Ref<string | null>;
  collabEncryptedUpdatesForMove: Ref<Uint8Array[]>;
  snapshots: Ref<SnapshotRow[]>;
  pageKeyring: Ref<SymmetricKeyring | null>;
  pageOpsMessage: Ref<string | null>;
  loadPathAndPrefs: () => Promise<void>;
  collabReloadNonce: Ref<number>;
  flushPush: () => Promise<void>;
}) {
  const {
    pageId,
    user,
    client,
    router,
    collabGroupId,
    moveDestGroupId,
    pageEncRelTitleB64,
    pageEncAbsTitleB64,
    collabEncryptedUpdatesForMove,
    snapshots,
    pageKeyring,
    pageOpsMessage,
    loadPathAndPrefs,
    collabReloadNonce,
    flushPush,
  } = opts;

  async function setAsGroupMainPage() {
    pageOpsMessage.value = null;
    const id = pageId.value;
    const gid = collabGroupId.value;
    if (!id || gid == null || user.value?.demo === true) {
      return;
    }
    if (
      !confirm(
        "Set this page as the group’s main page? Requires Pro and manager permission on this group (legacy `pages.move`).",
      )
    ) {
      return;
    }
    const res = await client.POST("/api/pages/{pageId}/move", {
      params: { path: { pageId: id } },
      body: {
        destGroupId: gid,
        setAsMainPage: true,
      },
    });
    if (res.response.status !== 204) {
      pageOpsMessage.value =
        res.error && typeof res.error === "object" && "message" in res.error
          ? String((res.error as { message?: string }).message)
          : "Could not update main page.";
      return;
    }
    pageOpsMessage.value = "Main page updated.";
    await loadPathAndPrefs();
  }

  async function softDeleteThisPage() {
    pageOpsMessage.value = null;
    const id = pageId.value;
    if (!id || user.value?.demo === true) {
      return;
    }
    if (
      !confirm(
        "Soft-delete this page? It leaves a grace period before purge (cannot delete a group’s main page).",
      )
    ) {
      return;
    }
    const res = await client.DELETE("/api/pages/{pageId}", {
      params: { path: { pageId: id } },
    });
    if (res.response.status !== 204) {
      pageOpsMessage.value =
        res.error && typeof res.error === "object" && "message" in res.error
          ? String((res.error as { message?: string }).message)
          : "Could not delete page.";
      return;
    }
    void router.replace({ path: "/" });
  }

  async function purgeThisPagePermanently() {
    pageOpsMessage.value = null;
    const id = pageId.value;
    if (!id || user.value?.demo === true) {
      return;
    }
    if (
      !confirm(
        "Permanently purge this page? Irreversible after processing (cannot purge a group’s main page).",
      )
    ) {
      return;
    }
    const res = await client.POST("/api/pages/{pageId}/purge", {
      params: { path: { pageId: id } },
    });
    if (res.response.status !== 204) {
      pageOpsMessage.value =
        res.error && typeof res.error === "object" && "message" in res.error
          ? String((res.error as { message?: string }).message)
          : "Could not purge page.";
      return;
    }
    void router.replace({ path: "/" });
  }

  async function movePageToOtherGroup() {
    pageOpsMessage.value = null;
    const id = pageId.value;
    const srcG = collabGroupId.value;
    const dest = moveDestGroupId.value.trim();
    const rel = pageEncRelTitleB64.value;
    const abs = pageEncAbsTitleB64.value;
    const pk = pageKeyring.value;
    if (!id || srcG == null || user.value?.demo === true) {
      return;
    }
    if (!/^[A-Za-z0-9_-]{21}$/.test(dest)) {
      pageOpsMessage.value =
        "Enter a valid 21-character destination group id.";
      return;
    }
    if (dest === srcG) {
      pageOpsMessage.value =
        "Destination group must differ from the current group.";
      return;
    }
    if (rel == null || abs == null || pk == null) {
      pageOpsMessage.value = "Page crypto or titles are not loaded yet.";
      return;
    }
    const stored = readSessionCrypto();
    if (stored == null) {
      pageOpsMessage.value =
        "Unlock session crypto (password login) to move pages.";
      return;
    }
    if (
      !confirm(
        "Move this page to another group? Re-encrypts titles, merges Yjs history into one update, and re-keys all snapshots (Pro). Requires editor access on the destination group.",
      )
    ) {
      return;
    }
    await flushPush();
    try {
      const destCtx = await client.GET(
        "/api/groups/{groupId}/collab-crypto-context",
        { params: { path: { groupId: dest } } },
      );
      if (destCtx.response.status !== 200 || destCtx.data == null) {
        pageOpsMessage.value =
          destCtx.error &&
          typeof destCtx.error === "object" &&
          "message" in destCtx.error
            ? String((destCtx.error as { message?: string }).message)
            : "Could not load destination group crypto.";
        return;
      }
      const snapLoads: {
        snapshotId: string;
        encryptedSymmetricKey: string | null;
        encryptedData: string;
      }[] = [];
      for (const s of snapshots.value) {
        const lr = await client.GET(
          "/api/pages/{pageId}/snapshots/{snapshotId}",
          {
            params: { path: { pageId: id, snapshotId: s.snapshotId } },
          },
        );
        if (lr.response.status !== 200 || lr.data == null) {
          pageOpsMessage.value =
            lr.error && typeof lr.error === "object" && "message" in lr.error
              ? String((lr.error as { message?: string }).message)
              : "Could not load snapshot ciphertext for move.";
          return;
        }
        snapLoads.push({
          snapshotId: s.snapshotId,
          encryptedSymmetricKey: lr.data.encryptedSymmetricKey ?? null,
          encryptedData: lr.data.encryptedData,
        });
      }
      const reencrypt = await buildCrossGroupPageMoveReencrypt({
        pageId: id,
        destGroupId: dest,
        oldPageKeyring: pk,
        pageEncryptedRelativeTitleB64: rel,
        pageEncryptedAbsoluteTitleB64: abs,
        collabUpdates: collabEncryptedUpdatesForMove.value.map((encryptedData) => ({
          encryptedData,
        })),
        snapshotRows: snapLoads,
        destGroupEncryptedContentKeyringB64:
          destCtx.data.groupEncryptedContentKeyring,
        destGroupAccessKeyringB64: destCtx.data.groupAccessKeyring ?? null,
        destMemberEncryptedAccessKeyringB64:
          destCtx.data.memberEncryptedAccessKeyring ?? null,
        stored,
      });
      const mv = await client.POST("/api/pages/{pageId}/move", {
        params: { path: { pageId: id } },
        body: {
          destGroupId: dest,
          setAsMainPage: false,
          reencrypt,
        },
      });
      if (mv.response.status !== 204) {
        pageOpsMessage.value =
          mv.error && typeof mv.error === "object" && "message" in mv.error
            ? String((mv.error as { message?: string }).message)
            : "Could not move page.";
        return;
      }
      pageOpsMessage.value = "Page moved; reloading…";
      moveDestGroupId.value = "";
      collabReloadNonce.value += 1;
      await loadPathAndPrefs();
    } catch (e) {
      pageOpsMessage.value =
        e instanceof Error ? e.message : "Could not move page.";
    }
  }

  return {
    setAsGroupMainPage,
    softDeleteThisPage,
    purgeThisPagePermanently,
    movePageToOtherGroup,
  };
}
