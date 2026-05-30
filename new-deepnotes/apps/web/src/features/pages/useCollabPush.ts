import { encodeDocSingleUpdateFromClient } from "@deepnotes/collab-wire";
import type { SymmetricKeyring } from "@deepnotes/e2ee";
import type { ComputedRef, Ref } from "vue";
import { ref } from "vue";
import * as Y from "yjs";

import type { DeepnotesApiClient } from "@/api/client";

import { uint8ToBase64 } from "../auth/bytes";
import { encryptPageDocUpdate } from "./page-collab-crypto";

export function useCollabPush(opts: {
  ydoc: Y.Doc;
  pageId: ComputedRef<string>;
  user: Ref<{ demo?: boolean } | null>;
  isAuthenticated: Ref<boolean>;
  pageKeyring: Ref<SymmetricKeyring | null>;
  client: DeepnotesApiClient;
  collabWsLive: Ref<boolean>;
  getCollabWs: () => WebSocket | null;
  serverDoc?: Y.Doc;
  unackedUpdates?: Map<number, Uint8Array>;
  collabLastIndex?: Ref<number | null>;
}) {
  const {
    ydoc,
    pageId,
    user,
    isAuthenticated,
    pageKeyring,
    client,
    collabWsLive,
    getCollabWs,
  } = opts;

  const pushError = ref<string | null>(null);
  const collabLastIndex = opts.collabLastIndex ?? ref<number | null>(null);
  const serverDoc = opts.serverDoc ?? new Y.Doc();
  const unackedUpdates = opts.unackedUpdates ?? new Map<number, Uint8Array>();
  let collabClientUpdateId = 0;
  let pushTimer: ReturnType<typeof setTimeout> | null = null;

  function syncServerDocToYdoc() {
    const diff = Y.encodeStateAsUpdateV2(ydoc, Y.encodeStateVector(serverDoc));
    if (diff.byteLength > 0) {
      Y.applyUpdateV2(serverDoc, diff);
    }
  }

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
    const ws = getCollabWs();
    if (
      collabWsLive.value &&
      ws != null &&
      ws.readyState === WebSocket.OPEN
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

  function flushPushWs() {
    pushTimer = null;
    if (pageKeyring.value == null || !isAuthenticated.value) {
      return;
    }
    const id = pageId.value;
    if (!id) {
      return;
    }
    const ws = getCollabWs();
    if (
      !collabWsLive.value ||
      ws == null ||
      ws.readyState !== WebSocket.OPEN
    ) {
      return;
    }
    const diff = Y.encodeStateAsUpdateV2(ydoc, Y.encodeStateVector(serverDoc));
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
      unackedUpdates.set(uid, diff);
      ws.send(
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

  async function flushPush() {
    pushTimer = null;
    const ws = getCollabWs();
    if (
      collabWsLive.value &&
      ws != null &&
      ws.readyState === WebSocket.OPEN
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
    const diff = Y.encodeStateAsUpdateV2(ydoc, Y.encodeStateVector(serverDoc));
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
        Y.applyUpdateV2(serverDoc, diff);
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

  function teardownPushTimers() {
    if (pushTimer != null) {
      clearTimeout(pushTimer);
      pushTimer = null;
    }
  }

  return {
    pushError,
    collabLastIndex,
    serverDoc,
    unackedUpdates,
    schedulePush,
    flushPush,
    syncServerDocToYdoc,
    teardownPushTimers,
  };
}
