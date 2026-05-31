import { onBeforeUnmount, ref, watch, type ComputedRef, type Ref } from "vue";
import * as Y from "yjs";
import { base64ToBytes } from "@deepnotes/e2ee";
import type { Awareness } from "y-protocols/awareness";

import type { DeepnotesApiClient } from "@/api/client";
import type { components } from "@/api/api-types.generated";

import type { UserMe } from "../auth/useSession";
import { readSessionCrypto } from "../auth/crypto-storage";
import { clearRemoteCollabAwareness } from "./page-awareness-utils";
import { decryptPageDocUpdate } from "./page-collab-crypto";
import { clearYjsProseMirrorAndLegacyText } from "./page-collab-yjs-clear";
import { Y_FRAG_PROSEMIRROR, Y_TEXT_DEFAULT } from "./page-editor-constants";
import { refreshSnapshotList, type SnapshotRow } from "./page-snapshot-list";
import { useCollabCrypto } from "./useCollabCrypto";
import { useCollabPush } from "./useCollabPush";
import { useCollabWebSocket } from "./useCollabWebSocket";
import { usePageEditor } from "./usePageEditor";

export function usePageCollabEditor(opts: {
  ydoc: Y.Doc;
  collabAwareness: Awareness;
  collabCaretProvider: { awareness: Awareness };
  pageId: ComputedRef<string>;
  user: Ref<UserMe | null>;
  bootstrapped: Ref<boolean>;
  isAuthenticated: Ref<boolean>;
  client: DeepnotesApiClient;
  snapshots: Ref<SnapshotRow[]>;
  snapshotLoading: Ref<boolean>;
}) {
  const {
    ydoc,
    collabAwareness,
    collabCaretProvider,
    pageId,
    user,
    bootstrapped,
    isAuthenticated,
    client,
    snapshots,
    snapshotLoading,
  } = opts;

  const loadError = ref<string | null>(null);
  const collabLoading = ref(true);
  const updateCount = ref(0);
  const hydrating = ref(false);
  const collabReloadNonce = ref(0);
  const moveDestGroupId = ref("");
  const pageEncRelTitleB64 = ref<string | null>(null);
  const pageEncAbsTitleB64 = ref<string | null>(null);
  const collabEncryptedUpdatesForMove = ref<Uint8Array[]>([]);
  const collabGroupId = ref<string | null>(null);
  const lastCollabBootstrapData = ref<components["schemas"]["PageCollabUpdatesGetResponse"] | null>(null);

  const serverDoc = new Y.Doc();
  const unackedUpdates = new Map<number, Uint8Array>();
  const collabWsLive = ref(false);
  const collabWsError = ref<string | null>(null);

  const crypto = useCollabCrypto({ pageId, user });

  const push = useCollabPush({
    ydoc,
    pageId,
    user,
    isAuthenticated,
    pageKeyring: crypto.pageKeyring,
    client,
    collabWsLive,
    getCollabWs: () => ws.getCollabWs(),
    serverDoc,
    unackedUpdates,
  });

  const ws = useCollabWebSocket({
    pageId,
    user,
    pageKeyring: crypto.pageKeyring,
    collabAwareness,
    serverDoc,
    unackedUpdates,
    hydrating,
    collabLastIndex: push.collabLastIndex,
    collabWsLive,
    collabWsError,
  });

  function refreshYMetrics() {
    editorApi.refreshYMetrics();
  }
  ws.setRefreshYMetrics(refreshYMetrics);

  const editorApi = usePageEditor({
    ydoc,
    collabCaretProvider,
    schedulePush: push.schedulePush,
    syncServerDocToYdoc: push.syncServerDocToYdoc,
  });

  const { editor, legacyPlainToImport } = editorApi;

  watch(
    [bootstrapped, isAuthenticated, pageId, collabReloadNonce],
    async () => {
      if (!bootstrapped.value) {
        return;
      }
      if (!isAuthenticated.value) {
        return;
      }
      const id = pageId.value;
      if (!id) {
        return;
      }

      collabGroupId.value = null;
      crypto.clearCrypto();
      pageEncRelTitleB64.value = null;
      pageEncAbsTitleB64.value = null;
      collabEncryptedUpdatesForMove.value = [];
      snapshots.value = [];
      loadError.value = null;
      collabLoading.value = true;
      push.collabLastIndex.value = null;
      ws.teardownCollabWebSocket();

      try {
        let sinceIndex: string | undefined = undefined;
        const allUpdates: { index: number; encryptedData: string }[] = [];
        let firstData: components["schemas"]["PageCollabUpdatesGetResponse"] | null = null;
        while (true) {
          const { data, error, response } = await client.GET(
            "/api/pages/{pageId}/collab-updates",
            {
              params: {
                path: { pageId: id },
                query: { sinceIndex, limit: "100" },
              },
            },
          ) as {
            data: components["schemas"]["PageCollabUpdatesGetResponse"] | undefined;
            error: unknown;
            response: Response;
          };
          if (response.status !== 200 || !data) {
            loadError.value =
              error && typeof error === "object" && "message" in error
                ? String(error.message)
                : "Could not load collab state.";
            return;
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
          loadError.value = "Could not load collab state.";
          return;
        }

        lastCollabBootstrapData.value = firstData;
        collabGroupId.value = firstData.groupId;
        pageEncRelTitleB64.value = firstData.pageEncryptedRelativeTitle;
        pageEncAbsTitleB64.value = firstData.pageEncryptedAbsoluteTitle;
        collabEncryptedUpdatesForMove.value = allUpdates.map((u) =>
          base64ToBytes(u.encryptedData),
        );
        updateCount.value = allUpdates.length;
        push.collabLastIndex.value =
          allUpdates.length > 0
            ? allUpdates[allUpdates.length - 1]!.index
            : firstData.lastIndex;

        if (user.value?.demo === true) {
          crypto.cryptoError.value =
            "Demo sessions do not persist client crypto; sign in with a password account to decrypt page content.";
          hydrating.value = true;
          try {
            clearYjsProseMirrorAndLegacyText(
              ydoc,
              Y_FRAG_PROSEMIRROR,
              Y_TEXT_DEFAULT,
            );
          } finally {
            hydrating.value = false;
          }
          push.syncServerDocToYdoc();
          refreshYMetrics();
          return;
        }

        const stored = readSessionCrypto();
        if (stored == null) {
          crypto.cryptoError.value =
            "Missing session crypto (sign out and sign in again with your password on this device).";
          void refreshSnapshotList({
            client,
            pageId: id,
            user: user.value,
            snapshots,
            snapshotLoading,
          });
          hydrating.value = true;
          try {
            clearYjsProseMirrorAndLegacyText(
              ydoc,
              Y_FRAG_PROSEMIRROR,
              Y_TEXT_DEFAULT,
            );
          } finally {
            hydrating.value = false;
          }
          push.syncServerDocToYdoc();
          refreshYMetrics();
          return;
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
              pageId: id,
              user: user.value,
              snapshots,
              snapshotLoading,
            });
            hydrating.value = true;
            try {
              clearYjsProseMirrorAndLegacyText(
                ydoc,
                Y_FRAG_PROSEMIRROR,
                Y_TEXT_DEFAULT,
              );
            } finally {
              hydrating.value = false;
            }
            push.syncServerDocToYdoc();
            refreshYMetrics();
            return;
          }
        } catch (e) {
          crypto.cryptoError.value =
            e instanceof Error
              ? e.message
              : "Could not unlock page encryption keys.";
          void refreshSnapshotList({
            client,
            pageId: id,
            user: user.value,
            snapshots,
            snapshotLoading,
          });
          hydrating.value = true;
          try {
            clearYjsProseMirrorAndLegacyText(
              ydoc,
              Y_FRAG_PROSEMIRROR,
              Y_TEXT_DEFAULT,
            );
          } finally {
            hydrating.value = false;
          }
          push.syncServerDocToYdoc();
          refreshYMetrics();
          return;
        }

        const pk = crypto.pageKeyring.value;
        if (pk == null) {
          return;
        }

        hydrating.value = true;
        try {
          clearRemoteCollabAwareness(collabAwareness);
          clearYjsProseMirrorAndLegacyText(
            ydoc,
            Y_FRAG_PROSEMIRROR,
            Y_TEXT_DEFAULT,
          );
          for (const u of allUpdates) {
            const plain = decryptPageDocUpdate({
              pageKeyring: pk,
              pageId: id,
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
          hydrating.value = false;
        }
        void refreshSnapshotList({
          client,
          pageId: id,
          user: user.value,
          snapshots,
          snapshotLoading,
        });
      } finally {
        collabLoading.value = false;
      }
    },
    { immediate: true },
  );

  watch(
    [collabLoading, loadError, () => crypto.cryptoError.value, pageId, () => user.value?.demo],
    () => {
      if (
        collabLoading.value ||
        loadError.value ||
        crypto.cryptoError.value ||
        user.value?.demo === true ||
        pageId.value === ""
      ) {
        ws.teardownCollabWebSocket();
        return;
      }
      ws.connectCollabWebSocket();
    },
    { flush: "post" },
  );

  watch(
    [collabLoading, loadError, () => crypto.cryptoError.value, editor],
    () => {
      const canEdit =
        !collabLoading.value &&
        loadError.value == null &&
        crypto.cryptoError.value == null &&
        user.value?.demo !== true;
      editorApi.setEditorEditable(canEdit);
    },
    { immediate: true, flush: "post" },
  );

  async function unlockKeyringWithPassword(password: string): Promise<boolean> {
    const data = lastCollabBootstrapData.value;
    if (data == null) {
      return false;
    }
    return crypto.unlockKeyringWithPassword(
      {
        groupId: data.groupId,
        pageEncryptedSymmetricKeyring: base64ToBytes(
          data.pageEncryptedSymmetricKeyring,
        ),
        groupEncryptedContentKeyring: base64ToBytes(
          data.groupEncryptedContentKeyring,
        ),
        memberEncryptedAccessKeyring:
          data.memberEncryptedAccessKeyring != null
            ? base64ToBytes(data.memberEncryptedAccessKeyring)
            : null,
        groupAccessKeyring:
          data.groupAccessKeyring != null
            ? base64ToBytes(data.groupAccessKeyring)
            : null,
      },
      password,
    );
  }

  onBeforeUnmount(() => {
    ws.teardownCollabWebSocket();
    push.teardownPushTimers();
    collabAwareness.destroy();
  });

  return {
    legacyPlainToImport,
    loadError,
    collabLoading,
    cryptoError: crypto.cryptoError,
    pushError: push.pushError,
    collabLastIndex: push.collabLastIndex,
    updateCount,
    hydrating,
    pageKeyring: crypto.pageKeyring,
    yStateBytes: editorApi.yStateBytes,
    collabWsLive: ws.collabWsLive,
    collabWsError: ws.collabWsError,
    collabGroupId,
    collabGroupCrypto: crypto.collabGroupCrypto,
    collabReloadNonce,
    moveDestGroupId,
    pageEncRelTitleB64,
    pageEncAbsTitleB64,
    collabEncryptedUpdatesForMove,
    editor,
    schedulePush: push.schedulePush,
    flushPush: push.flushPush,
    refreshYMetrics: editorApi.refreshYMetrics,
    unlockKeyringWithPassword,
  };
}
