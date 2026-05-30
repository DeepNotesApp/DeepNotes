import type { SymmetricKeyring } from "@deepnotes/e2ee";
import {
  decodeIncomingCollabBinaryMessage,
  encodeAwarenessMessage,
} from "@deepnotes/collab-wire";
import type { ComputedRef, Ref } from "vue";
import { ref } from "vue";
import { encodeAwarenessUpdate, removeAwarenessStates, type Awareness } from "y-protocols/awareness";
import * as Y from "yjs";

import { encryptPageAwarenessUpdate } from "./page-collab-crypto";
import { applyIncomingCollabWsMessage, type CollabWsIncomingContext } from "./page-collab-ws-incoming";

export function useCollabWebSocket(opts: {
  pageId: ComputedRef<string>;
  user: Ref<{ demo?: boolean; userId: string } | null>;
  pageKeyring: Ref<SymmetricKeyring | null>;
  collabAwareness: Awareness;
  serverDoc: Y.Doc;
  unackedUpdates: Map<number, Uint8Array>;
}) {
  const { pageId, user, pageKeyring, collabAwareness, serverDoc, unackedUpdates } = opts;

  const collabWsLive = ref(false);
  const collabWsError = ref<string | null>(null);
  let collabWs: WebSocket | null = null;
  let awarenessPushTimer: ReturnType<typeof setTimeout> | null = null;

  const hydrating = ref(false);

  const wsIncomingCtx: CollabWsIncomingContext = {
    ydoc: collabAwareness.doc,
    collabAwareness,
    getPageId: () => pageId.value,
    getPageKeyring: () => pageKeyring.value,
    hydrating,
    collabLastIndex: ref(null),
    serverDoc,
    unackedUpdates,
    refreshYMetrics: (): void => {
      // set by orchestrator
    },
  };

  function setRefreshYMetrics(fn: () => void) {
    wsIncomingCtx.refreshYMetrics = fn;
  }

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

  return {
    collabWsLive,
    collabWsError,
    teardownCollabWebSocket,
    connectCollabWebSocket,
    flushAwarenessWs,
    scheduleAwarenessPush,
    setRefreshYMetrics,
  };
}
