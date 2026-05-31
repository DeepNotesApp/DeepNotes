import type { Ref } from "vue";
import * as Y from "yjs";
import { base64ToBytes } from "@deepnotes/e2ee";

import type { DeepnotesApiClient } from "@/api/client";
import type { components } from "@/api/api-types.generated";

import { readSessionCrypto } from "../auth/crypto-storage";
import { clearRemoteCollabAwareness } from "./page-awareness-utils";
import { decryptPageDocUpdate } from "./page-collab-crypto";
import { clearYjsProseMirrorAndLegacyText } from "./page-collab-yjs-clear";
import { Y_FRAG_PROSEMIRROR, Y_TEXT_DEFAULT } from "./page-editor-constants";
import { refreshSnapshotList, type SnapshotRow } from "./page-snapshot-list";

/**
 * Loads collab updates from the server and hydrates the Yjs document.
 * Handles crypto unlocking, decryption, and error states.
 */
export async function loadCollabState({
  pageId,
  client,
  ydoc,
  collabAwareness,
  crypto,
  push,
  snapshots,
  snapshotLoading,
  setCollabGroupId,
  setPageEncRelTitleB64,
  setPageEncAbsTitleB64,
  setCollabEncryptedUpdatesForMove,
  setUpdateCount,
  setLoadError,
  setHydrating,
  refreshYMetrics,
  legacyPlainToImport,
}: {
  pageId: string;
  client: DeepnotesApiClient;
  ydoc: Y.Doc;
  collabAwareness: any;
  crypto: any;
  push: any;
  snapshots: Ref<SnapshotRow[]>;
  snapshotLoading: Ref<boolean>;
  setCollabGroupId: (id: string | null) => void;
  setPageEncRelTitleB64: (b64: string | null) => void;
  setPageEncAbsTitleB64: (b64: string | null) => void;
  setCollabEncryptedUpdatesForMove: (updates: Uint8Array[]) => void;
  setUpdateCount: (count: number) => void;
  setLoadError: (error: string | null) => void;
  setHydrating: (hydrating: boolean) => void;
  refreshYMetrics: () => void;
  legacyPlainToImport: Ref<string | null>;
}): Promise<components["schemas"]["PageCollabUpdatesGetResponse"] | null> {
  setCollabGroupId(null);
  crypto.clearCrypto();
  setPageEncRelTitleB64(null);
  setPageEncAbsTitleB64(null);
  setCollabEncryptedUpdatesForMove([]);
  snapshots.value = [];
  setLoadError(null);
  push.collabLastIndex.value = null;

  try {
    let sinceIndex: string | undefined = undefined;
    const allUpdates: { index: number; encryptedData: string }[] = [];
    let firstData: components["schemas"]["PageCollabUpdatesGetResponse"] | null = null;
    while (true) {
      const { data, error, response } = await client.GET(
        "/api/pages/{pageId}/collab-updates",
        {
          params: {
            path: { pageId },
            query: { sinceIndex, limit: "100" },
          },
        },
      ) as {
        data: components["schemas"]["PageCollabUpdatesGetResponse"] | undefined;
        error: unknown;
        response: Response;
      };
      if (response.status !== 200 || !data) {
        setLoadError(
          error && typeof error === "object" && "message" in error
            ? String(error.message)
            : "Could not load collab state.",
        );
        return null;
      }
      if (firstData == null) {
        firstData = data;
      }
      allUpdates.push(...data.updates);
      if (data.updates.length === 0 || data.updates.length < 100) {
        break;
      }
      sinceIndex = String(data.lastIndex ?? 0);
    }
    if (firstData == null) {
      setLoadError("Could not load collab state.");
      return null;
    }

    setCollabGroupId(firstData.groupId);
    setPageEncRelTitleB64(firstData.pageEncryptedRelativeTitle);
    setPageEncAbsTitleB64(firstData.pageEncryptedAbsoluteTitle);
    setCollabEncryptedUpdatesForMove(allUpdates.map((u) => base64ToBytes(u.encryptedData)));
    setUpdateCount(allUpdates.length);
    push.collabLastIndex.value =
      allUpdates.length > 0
        ? allUpdates[allUpdates.length - 1]!.index
        : firstData.lastIndex;

    const stored = readSessionCrypto();
    if (stored == null) {
      crypto.cryptoError.value =
        "Missing session crypto (sign out and sign in again with your password on this device).";
      void refreshSnapshotList({
        client,
        pageId,
        snapshots,
        snapshotLoading,
      });
      setHydrating(true);
      try {
        clearYjsProseMirrorAndLegacyText(ydoc, Y_FRAG_PROSEMIRROR, Y_TEXT_DEFAULT);
      } finally {
        setHydrating(false);
      }
      push.syncServerDocToYdoc();
      refreshYMetrics();
      return firstData;
    }

    try {
      const bootstrapData = {
        groupId: firstData.groupId,
        pageEncryptedSymmetricKeyring: base64ToBytes(
          firstData.pageEncryptedSymmetricKeyring,
        ),
        groupEncryptedContentKeyring: base64ToBytes(
          firstData.groupEncryptedContentKeyring,
        ),
        memberEncryptedAccessKeyring:
          firstData.memberEncryptedAccessKeyring != null
            ? base64ToBytes(firstData.memberEncryptedAccessKeyring)
            : null,
        groupAccessKeyring:
          firstData.groupAccessKeyring != null
            ? base64ToBytes(firstData.groupAccessKeyring)
            : null,
      };
      const unlocked = await crypto.unlockKeyring(bootstrapData);
      if (!unlocked) {
        void refreshSnapshotList({
          client,
          pageId,
          snapshots,
          snapshotLoading,
        });
        setHydrating(true);
        try {
          clearYjsProseMirrorAndLegacyText(ydoc, Y_FRAG_PROSEMIRROR, Y_TEXT_DEFAULT);
        } finally {
          setHydrating(false);
        }
        push.syncServerDocToYdoc();
        refreshYMetrics();
        return firstData;
      }
    } catch (e) {
      crypto.cryptoError.value =
        e instanceof Error
          ? e.message
          : "Could not unlock page encryption keys.";
      void refreshSnapshotList({
        client,
        pageId,
        snapshots,
        snapshotLoading,
      });
      setHydrating(true);
      try {
        clearYjsProseMirrorAndLegacyText(ydoc, Y_FRAG_PROSEMIRROR, Y_TEXT_DEFAULT);
      } finally {
        setHydrating(false);
      }
      push.syncServerDocToYdoc();
      refreshYMetrics();
      return firstData;
    }

    const pk = crypto.pageKeyring.value;
    if (pk == null) {
      return firstData;
    }

    setHydrating(true);
    try {
      clearRemoteCollabAwareness(collabAwareness);
      clearYjsProseMirrorAndLegacyText(ydoc, Y_FRAG_PROSEMIRROR, Y_TEXT_DEFAULT);
      for (const u of allUpdates) {
        const plain = decryptPageDocUpdate({
          pageKeyring: pk,
          pageId,
          ciphertext: base64ToBytes(u.encryptedData),
        });
        Y.applyUpdateV2(ydoc, plain);
      }
      const legacyAfter = ydoc.getText(Y_TEXT_DEFAULT);
      if (legacyAfter.length > 0) {
        legacyPlainToImport.value = legacyAfter.toString();
        ydoc.transact(() => {
          legacyAfter.delete(0, legacyAfter.length);
        });
      }
      push.syncServerDocToYdoc();
      refreshYMetrics();
    } finally {
      setHydrating(false);
    }
    void refreshSnapshotList({
      client,
      pageId,
      snapshots,
      snapshotLoading,
    });
    return firstData;
  } catch (e) {
    setLoadError(e instanceof Error ? e.message : "Could not load collab state.");
    return null;
  }
}
