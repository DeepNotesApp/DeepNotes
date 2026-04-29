import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";
import { useEditor } from "@tiptap/vue-3";
import { base64ToBytes, type SymmetricKeyring } from "@deepnotes/e2ee";
import {
  decodeIncomingCollabBinaryMessage,
  encodeAwarenessMessage,
  encodeDocSingleUpdateFromClient,
} from "@deepnotes/collab-wire";
import * as Y from "yjs";
import {
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
  removeAwarenessStates,
  type Awareness,
} from "y-protocols/awareness";
import type { ComputedRef, Ref } from "vue";
import { onBeforeUnmount, ref, watch } from "vue";

import type { DeepnotesApiClient } from "@/api/client";

import { uint8ToBase64 } from "../auth/bytes";
import { readSessionCrypto } from "../auth/crypto-storage";
import type { UserMe } from "../auth/useSession";
import { cursorColorForUserId, clearRemoteCollabAwareness } from "./page-awareness-utils";
import {
  decryptPageAwarenessUpdate,
  decryptPageDocUpdate,
  encryptPageAwarenessUpdate,
  encryptPageDocUpdate,
  unlockPageCollabSymmetricKeyring,
} from "./page-collab-crypto";
import { Y_FRAG_PROSEMIRROR, Y_TEXT_DEFAULT } from "./page-editor-constants";
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
  let serverStateVector: Uint8Array = Y.encodeStateVector(ydoc);
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
      removeAwarenessStates(collabAwareness, [collabAwareness.doc.clientID], "disconnect");
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
      handleCollabWsMessage(ev);
    };
  }

  function handleCollabWsMessage(ev: MessageEvent) {
    if (!(ev.data instanceof ArrayBuffer)) {
      return;
    }
    const data = new Uint8Array(ev.data);
    const incoming = decodeIncomingCollabBinaryMessage(data);
    if (incoming == null) {
      return;
    }
    const id = pageId.value;
    const pk = pageKeyring.value;
    if (incoming.kind === "awareness") {
      if (pk == null || !id) {
        return;
      }
      hydrating.value = true;
      try {
        for (const chunk of incoming.encryptedChunks) {
          try {
            const plain = decryptPageAwarenessUpdate({
              pageKeyring: pk,
              pageId: id,
              ciphertext: chunk,
            });
            applyAwarenessUpdate(collabAwareness, plain, "remote");
          } catch {
            // ignore decrypt failures
          }
        }
      } finally {
        hydrating.value = false;
      }
      return;
    }
    const msg = incoming;
    if (msg.kind === "single-update") {
      if (pk == null || !id) {
        return;
      }
      hydrating.value = true;
      try {
        const plain = decryptPageDocUpdate({
          pageKeyring: pk,
          pageId: id,
          ciphertext: msg.encryptedUpdate,
        });
        Y.applyUpdateV2(ydoc, plain, "collab-ws-remote");
        serverStateVector = Y.encodeStateVector(ydoc);
        if (msg.dbIndex != null) {
          collabLastIndex.value = msg.dbIndex;
        }
        refreshYMetrics();
      } catch {
        // ignore decrypt failures
      } finally {
        hydrating.value = false;
      }
      return;
    }
    if (msg.kind === "single-update-ack") {
      serverStateVector = Y.encodeStateVector(ydoc);
      if (msg.dbIndex != null) {
        collabLastIndex.value = msg.dbIndex;
      }
    }
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
    const diff = Y.encodeStateAsUpdateV2(ydoc, serverStateVector);
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
    yStateBytes.value = Y.encodeStateAsUpdateV2(ydoc).byteLength;
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        undoRedo: false,
      }),
      Underline,
      Link.configure({
        autolink: true,
        linkOnPaste: true,
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder: "Write something…",
      }),
      Collaboration.configure({
        document: ydoc,
        field: Y_FRAG_PROSEMIRROR,
      }),
      CollaborationCaret.configure({
        provider: collabCaretProvider,
        user: {
          name: "You",
          color: "#64748b",
        },
      }),
    ],
    editorProps: {
      attributes: {
        class:
          "max-w-none min-h-40 px-3 py-2 text-sm leading-relaxed focus:outline-none",
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
    const diff = Y.encodeStateAsUpdateV2(ydoc, serverStateVector);
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
        serverStateVector = Y.encodeStateVector(ydoc);
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
      serverStateVector = Y.encodeStateVector(ydoc);
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
            const frag = ydoc.getXmlFragment(Y_FRAG_PROSEMIRROR);
            ydoc.transact(() => {
              while (frag.length > 0) {
                frag.delete(frag.length - 1, 1);
              }
            });
            const legacy = ydoc.getText(Y_TEXT_DEFAULT);
            if (legacy.length > 0) {
              legacy.delete(0, legacy.length);
            }
          } finally {
            hydrating.value = false;
          }
          serverStateVector = Y.encodeStateVector(ydoc);
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
            const frag = ydoc.getXmlFragment(Y_FRAG_PROSEMIRROR);
            ydoc.transact(() => {
              while (frag.length > 0) {
                frag.delete(frag.length - 1, 1);
              }
            });
            const legacy = ydoc.getText(Y_TEXT_DEFAULT);
            if (legacy.length > 0) {
              legacy.delete(0, legacy.length);
            }
          } finally {
            hydrating.value = false;
          }
          serverStateVector = Y.encodeStateVector(ydoc);
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
            const frag = ydoc.getXmlFragment(Y_FRAG_PROSEMIRROR);
            ydoc.transact(() => {
              while (frag.length > 0) {
                frag.delete(frag.length - 1, 1);
              }
            });
            const legacy = ydoc.getText(Y_TEXT_DEFAULT);
            if (legacy.length > 0) {
              legacy.delete(0, legacy.length);
            }
          } finally {
            hydrating.value = false;
          }
          serverStateVector = Y.encodeStateVector(ydoc);
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
          const frag = ydoc.getXmlFragment(Y_FRAG_PROSEMIRROR);
          ydoc.transact(() => {
            while (frag.length > 0) {
              frag.delete(frag.length - 1, 1);
            }
          });
          const legacy = ydoc.getText(Y_TEXT_DEFAULT);
          if (legacy.length > 0) {
            legacy.delete(0, legacy.length);
          }
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
          serverStateVector = Y.encodeStateVector(ydoc);
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
