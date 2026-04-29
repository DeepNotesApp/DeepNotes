import { useEditor } from "@tiptap/vue-3";
import { base64ToBytes, type SymmetricKeyring } from "@deepnotes/e2ee";
import {
  decodeIncomingCollabBinaryMessage,
  encodeAwarenessMessage,
  encodeDocSingleUpdateFromClient,
} from "@deepnotes/collab-wire";
import * as Y from "yjs";
import { encodeAwarenessUpdate, removeAwarenessStates, type Awareness } from "y-protocols/awareness";
import type { ComputedRef, Ref } from "vue";
import { onBeforeUnmount, ref, watch } from "vue";

import type { DeepnotesApiClient } from "@/api/client";

import { uint8ToBase64 } from "../auth/bytes";
import { readSessionCrypto } from "../auth/crypto-storage";
import type { UserMe } from "../auth/useSession";
import { cursorColorForUserId, clearRemoteCollabAwareness } from "./page-awareness-utils";
import {
  encryptPageAwarenessUpdate,
  encryptPageDocUpdate,
  decryptPageDocUpdate,
  unlockPageCollabSymmetricKeyring,
} from "./page-collab-crypto";
import { applyIncomingCollabWsMessage } from "./page-collab-ws-incoming";
import { clearYjsProseMirrorAndLegacyText } from "./page-collab-yjs-clear";
import { Y_FRAG_PROSEMIRROR, Y_TEXT_DEFAULT } from "./page-editor-constants";
import {
  createPageEditorTipTapExtensions,
  PAGE_EDITOR_TIPTAP_CLASS,
} from "./page-editor-tiptap-extensions";
import { refreshSnapshotList, type SnapshotRow } from "./page-snapshot-list";

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

  const legacyPlainToImport = ref<string | null>(null);

  const loadError = ref<string | null>(null);
  const collabLoading = ref(true);
  const cryptoError = ref<string | null>(null);
  const pushError = ref<string | null>(null);
  const collabLastIndex = ref<number | null>(null);
  const updateCount = ref(0);

  const hydrating = ref(false);
  const serverStateVector = { current: Y.encodeStateVector(ydoc) };
  const pageKeyring = ref<SymmetricKeyring | null>(null);

  let pushTimer: ReturnType<typeof setTimeout> | null = null;

  const yStateBytes = ref(0);

  let collabWs: WebSocket | null = null;
  let collabClientUpdateId = 0;
  const collabWsLive = ref(false);
  const collabWsError = ref<string | null>(null);

  const collabGroupId = ref<string | null>(null);
  const collabReloadNonce = ref(0);
  const moveDestGroupId = ref("");
  const pageEncRelTitleB64 = ref<string | null>(null);
  const pageEncAbsTitleB64 = ref<string | null>(null);
  const collabEncryptedUpdatesForMove = ref<Uint8Array[]>([]);

  let awarenessPushTimer: ReturnType<typeof setTimeout> | null = null;

  const wsIncomingCtx = {
    ydoc,
    collabAwareness,
    getPageId: () => pageId.value,
    getPageKeyring: () => pageKeyring.value,
    hydrating,
    collabLastIndex,
    serverStateVector,
    refreshYMetrics: (): void => {
      yStateBytes.value = Y.encodeStateAsUpdateV2(ydoc).byteLength;
    },
  };

  function scheduleAwarenessPush() {
    if (user.value?.demo === true) {
      return;
    }
    if (
      !collabWsLive.value ||
      collabWs == null ||
      collabWs.readyState !== WebSocket.OPEN
    ) {
      return;
    }
    if (awarenessPushTimer != null) {
      clearTimeout(awarenessPushTimer);
    }
    awarenessPushTimer = setTimeout(() => {
      awarenessPushTimer = null;
      flushAwarenessWs();
    }, 200);
  }

  collabAwareness.on(
    "update",
    ({
      added,
      updated,
      removed,
    }: {
      added: number[];
      updated: number[];
      removed: number[];
    }) => {
      const cid = collabAwareness.doc.clientID;
      if (
        !added.includes(cid) &&
        !updated.includes(cid) &&
        !removed.includes(cid)
      ) {
        return;
      }
      scheduleAwarenessPush();
    },
  );

  function flushAwarenessWs() {
    const pk = pageKeyring.value;
    const id = pageId.value;
    if (
      pk == null ||
      !id ||
      !collabWsLive.value ||
      collabWs == null ||
      collabWs.readyState !== WebSocket.OPEN
    ) {
      return;
    }
    try {
      const encoded = encodeAwarenessUpdate(collabAwareness, [
        collabAwareness.doc.clientID,
      ]);
      const enc = encryptPageAwarenessUpdate({
        pageKeyring: pk,
        pageId: id,
        plaintext: encoded,
      });
      collabWs.send(encodeAwarenessMessage([enc]));
    } catch {
      // ignore
    }
  }

  function teardownCollabWebSocket() {
    collabWsLive.value = false;
    collabWsError.value = null;
    if (awarenessPushTimer != null) {
      clearTimeout(awarenessPushTimer);
      awarenessPushTimer = null;
    }
    try {
      removeAwarenessStates(
        collabAwareness,
        [collabAwareness.doc.clientID],
        "disconnect",
      );
    } catch {
      // ignore
    }
    if (collabWs != null) {
      collabWs.close();
      collabWs = null;
    }
    collabClientUpdateId = 0;
  }

  function connectCollabWebSocket() {
    const id = pageId.value;
    if (
      !id ||
      user.value?.demo === true ||
      pageKeyring.value == null ||
      typeof window === "undefined"
    ) {
      teardownCollabWebSocket();
      return;
    }
    teardownCollabWebSocket();
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const wsUrl = `${proto}://${window.location.host}/api/pages/${encodeURIComponent(id)}/collab-ws`;
    const ws = new WebSocket(wsUrl);
    collabWs = ws;
    ws.binaryType = "arraybuffer";
    ws.onopen = () => {
      collabWsLive.value = true;
      collabWsError.value = null;
      flushAwarenessWs();
    };
    ws.onerror = () => {
      collabWsError.value = "Live collab WebSocket error.";
    };
    ws.onclose = () => {
      collabWsLive.value = false;
      collabWs = null;
      void flushPush();
    };
    ws.onmessage = (ev: MessageEvent) => {
      if (!(ev.data instanceof ArrayBuffer)) {
        return;
      }
      const incoming = decodeIncomingCollabBinaryMessage(new Uint8Array(ev.data));
      if (incoming == null) {
        return;
      }
      applyIncomingCollabWsMessage(incoming, wsIncomingCtx);
    };
  }

  function flushPushWs() {
    pushTimer = null;
    if (pageKeyring.value == null || !isAuthenticated.value) {
      return;
    }
    const id = pageId.value;
    if (!id) {
      return;
    }
    if (
      !collabWsLive.value ||
      collabWs == null ||
      collabWs.readyState !== WebSocket.OPEN
    ) {
      return;
    }
    const diff = Y.encodeStateAsUpdateV2(ydoc, serverStateVector.current);
    if (diff.byteLength === 0) {
      return;
    }
    pushError.value = null;
    try {
      const enc = encryptPageDocUpdate({
        pageKeyring: pageKeyring.value,
        pageId: id,
        plaintext: diff,
      });
      const uid = collabClientUpdateId++;
      collabWs.send(
        encodeDocSingleUpdateFromClient({
          updateId: uid,
          encryptedUpdate: enc,
        }),
      );
    } catch (e) {
      pushError.value =
        e instanceof Error ? e.message : "Could not send collab update.";
    }
  }

  function refreshYMetrics() {
    wsIncomingCtx.refreshYMetrics();
  }

  const editor = useEditor({
    extensions: createPageEditorTipTapExtensions({ ydoc, collabCaretProvider }),
    editorProps: {
      attributes: {
        class: PAGE_EDITOR_TIPTAP_CLASS,
      },
    },
    onUpdate() {
      refreshYMetrics();
      if (!hydrating.value) {
        schedulePush();
      }
    },
    editable: false,
  });

  function setEditorEditable(on: boolean) {
    const ed = editor.value;
    if (ed != null && !ed.isDestroyed) {
      ed.setEditable(on);
    }
  }

  watch(
    [user, editor],
    () => {
      const u = user.value;
      const ed = editor.value;
      if (u == null || ed == null || ed.isDestroyed) {
        return;
      }
      const label =
        u.userId.length > 0 ? `You (${u.userId.slice(0, 8)}…)` : "You";
      ed.commands.updateUser({
        name: label,
        color: cursorColorForUserId(u.userId),
      });
    },
    { flush: "post" },
  );

  function schedulePush() {
    if (pageKeyring.value == null) {
      return;
    }
    if (user.value?.demo === true) {
      return;
    }
    if (pushTimer != null) {
      clearTimeout(pushTimer);
    }
    if (
      collabWsLive.value &&
      collabWs != null &&
      collabWs.readyState === WebSocket.OPEN
    ) {
      pushTimer = setTimeout(() => {
        void flushPushWs();
      }, 200);
      return;
    }
    pushTimer = setTimeout(() => {
      void flushPush();
    }, 700);
  }

  async function flushPush() {
    pushTimer = null;
    if (
      collabWsLive.value &&
      collabWs != null &&
      collabWs.readyState === WebSocket.OPEN
    ) {
      return;
    }
    const pk = pageKeyring.value;
    if (pk == null || !isAuthenticated.value) {
      return;
    }
    const id = pageId.value;
    if (!id) {
      return;
    }
    const diff = Y.encodeStateAsUpdateV2(ydoc, serverStateVector.current);
    if (diff.byteLength === 0) {
      return;
    }
    pushError.value = null;
    try {
      const enc = encryptPageDocUpdate({
        pageKeyring: pk,
        pageId: id,
        plaintext: diff,
      });
      const expected = collabLastIndex.value;
      const nextIndex = expected == null ? 0 : expected + 1;
      const { error, response } = await client.POST(
        "/api/pages/{pageId}/collab-updates",
        {
          params: { path: { pageId: id } },
          body: {
            expectedLastIndex: expected,
            updates: [
              {
                index: nextIndex,
                encryptedData: uint8ToBase64(enc),
              },
            ],
          },
        },
      );
      if (response.status === 204) {
        serverStateVector.current = Y.encodeStateVector(ydoc);
        collabLastIndex.value = nextIndex;
        return;
      }
      if (error && typeof error === "object" && "message" in error) {
        pushError.value = String((error as { message: string }).message);
      } else {
        pushError.value = "Could not save page update.";
      }
    } catch (e) {
      pushError.value =
        e instanceof Error ? e.message : "Could not save page update.";
    }
  }

  onBeforeUnmount(() => {
    teardownCollabWebSocket();
    if (pushTimer != null) {
      clearTimeout(pushTimer);
      pushTimer = null;
    }
    const ed = editor.value;
    if (ed != null && !ed.isDestroyed) {
      ed.destroy();
    }
    collabAwareness.destroy();
  });

  watch(
    [collabLoading, loadError, cryptoError, pageId, () => user.value?.demo],
    () => {
      if (
        collabLoading.value ||
        loadError.value != null ||
        cryptoError.value != null ||
        user.value?.demo === true ||
        pageId.value === ""
      ) {
        teardownCollabWebSocket();
        return;
      }
      connectCollabWebSocket();
    },
    { flush: "post" },
  );

  watch(
    [editor, legacyPlainToImport],
    () => {
      const ed = editor.value;
      const t = legacyPlainToImport.value;
      if (ed == null || ed.isDestroyed || t == null) {
        return;
      }
      ed.commands.setContent({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: t.length > 0 ? [{ type: "text", text: t }] : [],
          },
        ],
      });
      legacyPlainToImport.value = null;
      serverStateVector.current = Y.encodeStateVector(ydoc);
      refreshYMetrics();
    },
    { flush: "post" },
  );

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
      pageEncRelTitleB64.value = null;
      pageEncAbsTitleB64.value = null;
      collabEncryptedUpdatesForMove.value = [];
      snapshots.value = [];
      loadError.value = null;
      cryptoError.value = null;
      collabLoading.value = true;
      pageKeyring.value = null;
      try {
        const { data, error, response } = await client.GET(
          "/api/pages/{pageId}/collab-updates",
          { params: { path: { pageId: id } } },
        );
        if (response.status !== 200 || !data) {
          if (error && typeof error === "object" && "message" in error) {
            loadError.value = String((error as { message: string }).message);
          } else {
            loadError.value = "Could not load collab state.";
          }
          return;
        }

        collabGroupId.value = data.groupId;
        pageEncRelTitleB64.value = data.pageEncryptedRelativeTitle;
        pageEncAbsTitleB64.value = data.pageEncryptedAbsoluteTitle;
        collabEncryptedUpdatesForMove.value = data.updates.map((u) =>
          base64ToBytes(u.encryptedData),
        );
        collabLastIndex.value = data.lastIndex;
        updateCount.value = data.updates.length;

        if (user.value?.demo === true) {
          cryptoError.value =
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
          serverStateVector.current = Y.encodeStateVector(ydoc);
          refreshYMetrics();
          return;
        }

        const stored = readSessionCrypto();
        if (stored == null) {
          cryptoError.value =
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
          serverStateVector.current = Y.encodeStateVector(ydoc);
          refreshYMetrics();
          return;
        }

        try {
          pageKeyring.value = await unlockPageCollabSymmetricKeyring({
            pageId: id,
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
            stored,
          });
        } catch (e) {
          cryptoError.value =
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
          serverStateVector.current = Y.encodeStateVector(ydoc);
          refreshYMetrics();
          return;
        }

        const pk = pageKeyring.value;
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
          for (const u of data.updates) {
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
          serverStateVector.current = Y.encodeStateVector(ydoc);
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
    [collabLoading, loadError, cryptoError, editor],
    () => {
      const canEdit =
        !collabLoading.value &&
        loadError.value == null &&
        cryptoError.value == null &&
        user.value?.demo !== true;
      setEditorEditable(canEdit);
    },
    { immediate: true, flush: "post" },
  );

  return {
    legacyPlainToImport,
    loadError,
    collabLoading,
    cryptoError,
    pushError,
    collabLastIndex,
    updateCount,
    hydrating,
    pageKeyring,
    yStateBytes,
    collabWsLive,
    collabWsError,
    collabGroupId,
    collabReloadNonce,
    moveDestGroupId,
    pageEncRelTitleB64,
    pageEncAbsTitleB64,
    collabEncryptedUpdatesForMove,
    editor,
    schedulePush,
    flushPush,
    refreshYMetrics,
  };
}
