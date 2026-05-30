import type { SymmetricKeyring } from "@deepnotes/e2ee";
import type { DecodedIncomingCollabMessage } from "@deepnotes/collab-wire";
import * as Y from "yjs";
import { applyAwarenessUpdate, type Awareness } from "y-protocols/awareness";
import type { Ref } from "vue";

import {
  decryptPageAwarenessUpdate,
  decryptPageDocUpdate,
} from "./page-collab-crypto";

export type CollabWsIncomingContext = {
  ydoc: Y.Doc;
  collabAwareness: Awareness;
  getPageId: () => string;
  getPageKeyring: () => SymmetricKeyring | null;
  hydrating: Ref<boolean>;
  collabLastIndex: Ref<number | null>;
  /** Server-acknowledged Yjs document (advances on ACK / remote update). */
  serverDoc: Y.Doc;
  /** Unacked WS updates keyed by client updateId. */
  unackedUpdates: Map<number, Uint8Array>;
  refreshYMetrics: () => void;
};

export function applyIncomingCollabWsMessage(
  incoming: DecodedIncomingCollabMessage,
  ctx: CollabWsIncomingContext,
): void {
  const id = ctx.getPageId();
  const pk = ctx.getPageKeyring();
  if (incoming.kind === "awareness") {
    if (pk == null || !id) {
      return;
    }
    ctx.hydrating.value = true;
    try {
      for (const chunk of incoming.encryptedChunks) {
        try {
          const plain = decryptPageAwarenessUpdate({
            pageKeyring: pk,
            pageId: id,
            ciphertext: chunk,
          });
          applyAwarenessUpdate(ctx.collabAwareness, plain, "remote");
        } catch {
          // ignore decrypt failures
        }
      }
    } finally {
      ctx.hydrating.value = false;
    }
    return;
  }
  const msg = incoming;
  if (msg.kind === "single-update") {
    if (pk == null || !id) {
      return;
    }
    ctx.hydrating.value = true;
    try {
      const plain = decryptPageDocUpdate({
        pageKeyring: pk,
        pageId: id,
        ciphertext: msg.encryptedUpdate,
      });
      Y.applyUpdateV2(ctx.ydoc, plain, "collab-ws-remote");
      Y.applyUpdateV2(ctx.serverDoc, plain);
      if (msg.dbIndex != null) {
        ctx.collabLastIndex.value = msg.dbIndex;
      }
      ctx.refreshYMetrics();
    } catch {
      // ignore decrypt failures
    } finally {
      ctx.hydrating.value = false;
    }
    return;
  }
  if (msg.kind === "single-update-ack") {
    const ackedDiff = ctx.unackedUpdates.get(msg.updateId);
    if (ackedDiff) {
      Y.applyUpdateV2(ctx.serverDoc, ackedDiff);
      ctx.unackedUpdates.delete(msg.updateId);
    }
    if (msg.dbIndex != null) {
      ctx.collabLastIndex.value = msg.dbIndex;
    }
    return;
  }

  if (msg.kind === "page-single-update") {
    if (pk == null || !id) {
      return;
    }
    ctx.hydrating.value = true;
    try {
      const plain = decryptPageDocUpdate({
        pageKeyring: pk,
        pageId: id,
        ciphertext: msg.encryptedUpdate,
      });
      Y.applyUpdateV2(ctx.ydoc, plain, "collab-ws-remote");
      Y.applyUpdateV2(ctx.serverDoc, plain);
      if (msg.dbIndex != null) {
        ctx.collabLastIndex.value = msg.dbIndex;
      }
      ctx.refreshYMetrics();
    } catch {
      // ignore decrypt failures
    } finally {
      ctx.hydrating.value = false;
    }
    return;
  }

  if (msg.kind === "page-single-update-ack") {
    const ackedDiff = ctx.unackedUpdates.get(msg.updateId);
    if (ackedDiff) {
      Y.applyUpdateV2(ctx.serverDoc, ackedDiff);
      ctx.unackedUpdates.delete(msg.updateId);
    }
    if (msg.dbIndex != null) {
      ctx.collabLastIndex.value = msg.dbIndex;
    }
  }
}
