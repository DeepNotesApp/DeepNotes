import type { SymmetricKeyring } from "@deepnotes/e2ee";
import type { Doc } from "yjs";
import type { ComputedRef, Ref } from "vue";
import { ref } from "vue";

import type { DeepnotesApiClient } from "@/api/client";
import type { UserMe } from "../auth/useSession";
import {
  applyYjsFullStateSnapshot,
  buildPageSnapshotSaveBodies,
  decryptPageSnapshotPlainUpdate,
} from "./page-snapshot-crypto";
import { Y_FRAG_PROSEMIRROR, Y_TEXT_DEFAULT } from "./page-editor-constants";
import { refreshSnapshotList, type SnapshotRow } from "./page-snapshot-list";

export type { SnapshotRow } from "./page-snapshot-list";

export function usePageSnapshots(opts: {
  pageId: ComputedRef<string>;
  user: Ref<UserMe | null>;
  client: DeepnotesApiClient;
  ydoc: Doc;
  pageKeyring: Ref<SymmetricKeyring | null>;
  hydrating: Ref<boolean>;
  refreshYMetrics: () => void;
  schedulePush: () => void;
  pageOpsMessage: Ref<string | null>;
}) {
  const {
    pageId,
    user,
    client,
    ydoc,
    pageKeyring,
    hydrating,
    refreshYMetrics,
    schedulePush,
    pageOpsMessage,
  } = opts;

  const snapshots = ref<SnapshotRow[]>([]);
  const snapshotLoading = ref(false);

  async function loadSnapshots() {
    await refreshSnapshotList({
      client,
      pageId: pageId.value,
      user: user.value,
      snapshots,
      snapshotLoading,
    });
  }

  async function saveSnapshotManual() {
    pageOpsMessage.value = null;
    const id = pageId.value;
    const pk = pageKeyring.value;
    if (!id || pk == null || user.value?.demo === true) {
      return;
    }
    const bodies = buildPageSnapshotSaveBodies({
      pageKeyring: pk,
      pageId: id,
      ydoc,
    });
    const res = await client.POST("/api/pages/{pageId}/snapshots", {
      params: { path: { pageId: id } },
      body: {
        encryptedSymmetricKey: bodies.encryptedSymmetricKey,
        encryptedData: bodies.encryptedData,
      },
    });
    if (res.response.status !== 201) {
      pageOpsMessage.value =
        res.error && typeof res.error === "object" && "message" in res.error
          ? String((res.error as { message?: string }).message)
          : "Could not save snapshot.";
      return;
    }
    await loadSnapshots();
    pageOpsMessage.value = "Snapshot saved.";
  }

  async function restoreFromSnapshot(snapshotId: string) {
    pageOpsMessage.value = null;
    const id = pageId.value;
    const pk = pageKeyring.value;
    if (!id || pk == null || user.value?.demo === true) {
      return;
    }
    if (
      !confirm(
        "Restore this snapshot? The current editor state is snapshotted as pre-restore (Pro), then content is replaced locally and queued to sync.",
      )
    ) {
      return;
    }
    const preBodies = buildPageSnapshotSaveBodies({
      pageKeyring: pk,
      pageId: id,
      ydoc,
    });
    const loadRes = await client.GET("/api/pages/{pageId}/snapshots/{snapshotId}", {
      params: { path: { pageId: id, snapshotId } },
    });
    if (loadRes.response.status !== 200 || loadRes.data == null) {
      pageOpsMessage.value =
        loadRes.error &&
        typeof loadRes.error === "object" &&
        "message" in loadRes.error
          ? String((loadRes.error as { message?: string }).message)
          : "Could not load snapshot.";
      return;
    }
    let plain: Uint8Array;
    try {
      plain = decryptPageSnapshotPlainUpdate({
        pageKeyring: pk,
        pageId: id,
        encryptedSymmetricKeyB64: loadRes.data.encryptedSymmetricKey ?? undefined,
        encryptedDataB64: loadRes.data.encryptedData,
      });
    } catch (e) {
      pageOpsMessage.value =
        e instanceof Error ? e.message : "Could not decrypt snapshot.";
      return;
    }
    hydrating.value = true;
    try {
      applyYjsFullStateSnapshot({
        ydoc,
        proseField: Y_FRAG_PROSEMIRROR,
        legacyTextName: Y_TEXT_DEFAULT,
        update: plain,
      });
    } finally {
      hydrating.value = false;
    }
    refreshYMetrics();
    const savePre = await client.POST("/api/pages/{pageId}/snapshots", {
      params: { path: { pageId: id } },
      body: {
        encryptedSymmetricKey: preBodies.encryptedSymmetricKey,
        encryptedData: preBodies.encryptedData,
        preRestore: true,
      },
    });
    if (savePre.response.status !== 201) {
      pageOpsMessage.value =
        savePre.error &&
        typeof savePre.error === "object" &&
        "message" in savePre.error
          ? String((savePre.error as { message?: string }).message)
          : "Restored locally but could not save pre-restore snapshot.";
      schedulePush();
      return;
    }
    await loadSnapshots();
    pageOpsMessage.value = "Snapshot restored; pre-restore copy saved.";
    schedulePush();
  }

  async function deleteSnapshot(snapshotId: string) {
    pageOpsMessage.value = null;
    const id = pageId.value;
    if (!id || user.value?.demo === true) {
      return;
    }
    if (!confirm("Delete this snapshot permanently?")) {
      return;
    }
    const res = await client.DELETE("/api/pages/{pageId}/snapshots/{snapshotId}", {
      params: { path: { pageId: id, snapshotId } },
    });
    if (res.response.status !== 204) {
      pageOpsMessage.value =
        res.error && typeof res.error === "object" && "message" in res.error
          ? String((res.error as { message?: string }).message)
          : "Could not delete snapshot.";
      return;
    }
    await loadSnapshots();
  }

  return {
    snapshots,
    snapshotLoading,
    loadSnapshots,
    saveSnapshotManual,
    restoreFromSnapshot,
    deleteSnapshot,
  };
}
