import { onBeforeUnmount, ref, watch, type ComputedRef, type Ref } from "vue";
import * as Y from "yjs";
import { base64ToBytes } from "@deepnotes/e2ee";
import type { Awareness } from "y-protocols/awareness";

import type { DeepnotesApiClient } from "@/api/client";
import type { components } from "@/api/api-types.generated";

import type { UserMe } from "../auth/useSession";
import { loadCollabState } from "./usePageCollabEditor-bootstrap";
import { useCollabCrypto } from "./useCollabCrypto";
import { useCollabPush } from "./useCollabPush";
import { useCollabWebSocket } from "./useCollabWebSocket";
import { usePageEditor } from "./usePageEditor";
import { type SnapshotRow } from "./page-snapshot-list";

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

      collabLoading.value = true;
      ws.teardownCollabWebSocket();

      const firstData = await loadCollabState({
        pageId: id,
        client,
        ydoc,
        collabAwareness,
        crypto,
        push,
        snapshots,
        snapshotLoading,
        setCollabGroupId: (v) => (collabGroupId.value = v),
        setPageEncRelTitleB64: (v) => (pageEncRelTitleB64.value = v),
        setPageEncAbsTitleB64: (v) => (pageEncAbsTitleB64.value = v),
        setCollabEncryptedUpdatesForMove: (v) => (collabEncryptedUpdatesForMove.value = v),
        setUpdateCount: (v) => (updateCount.value = v),
        setLoadError: (v) => (loadError.value = v),
        setHydrating: (v) => (hydrating.value = v),
        refreshYMetrics,
        legacyPlainToImport,
      });

      if (firstData) {
        lastCollabBootstrapData.value = firstData;
      }

      collabLoading.value = false;
    },
    { immediate: true },
  );

  watch(
    [collabLoading, loadError, () => crypto.cryptoError.value, pageId],
    () => {
      if (
        collabLoading.value ||
        loadError.value ||
        crypto.cryptoError.value ||
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
        crypto.cryptoError.value == null;
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
