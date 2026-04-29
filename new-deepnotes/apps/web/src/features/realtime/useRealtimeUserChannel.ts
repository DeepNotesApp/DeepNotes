import { unpack } from "msgpackr";
import { onMounted, onUnmounted, ref, watch, type Ref } from "vue";

import { decodeRealtimeServerBinaryMessage } from "@deepnotes/realtime-wire";

import {
  formatNotificationPayload,
  tryDecryptNotificationBody,
} from "../notifications/decrypt-notification-body";

/** Shown briefly when a live USER_NOTIFICATION arrives (legacy Quasar notify parity, minimal UI). */
export const realtimeToastMessage: Ref<string | null> = ref(null);

let toastTimer: ReturnType<typeof setTimeout> | null = null;

function showRealtimeToast(text: string) {
  if (toastTimer != null) {
    clearTimeout(toastTimer);
  }
  realtimeToastMessage.value = text;
  toastTimer = setTimeout(() => {
    realtimeToastMessage.value = null;
    toastTimer = null;
  }, 8000);
}

/**
 * Maintains `GET /api/realtime-ws` when the user is signed in (non-demo), for legacy-style
 * `USER_NOTIFICATION` pushes.
 */
export function useRealtimeUserChannel(
  input: Ref<{ userId: string; demo: boolean } | null>,
) {
  let ws: WebSocket | null = null;

  function teardown() {
    if (ws != null) {
      ws.close();
      ws = null;
    }
  }

  function connect() {
    teardown();
    const u = input.value;
    if (u == null || u.demo || typeof window === "undefined") {
      return;
    }
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const url = `${proto}://${window.location.host}/api/realtime-ws`;
    const socket = new WebSocket(url);
    ws = socket;
    socket.binaryType = "arraybuffer";
    socket.onmessage = async (ev: MessageEvent) => {
      if (!(ev.data instanceof ArrayBuffer)) {
        return;
      }
      const decoded = decodeRealtimeServerBinaryMessage(new Uint8Array(ev.data));
      if (decoded == null || decoded.kind !== "user-notification") {
        return;
      }
      let outer: unknown;
      try {
        outer = unpack(decoded.packedNotification);
      } catch {
        return;
      }
      if (
        outer == null ||
        typeof outer !== "object" ||
        !("encryptedSymmetricKey" in outer) ||
        !("encryptedContent" in outer)
      ) {
        return;
      }
      const o = outer as {
        encryptedSymmetricKey: unknown;
        encryptedContent: unknown;
      };
      if (typeof o.encryptedSymmetricKey !== "string") {
        return;
      }
      if (typeof o.encryptedContent !== "string") {
        return;
      }
      const decrypted = await tryDecryptNotificationBody({
        encryptedSymmetricKey: o.encryptedSymmetricKey,
        encryptedContent: o.encryptedContent,
      });
      if (decrypted != null) {
        showRealtimeToast(formatNotificationPayload(decrypted));
      }
    };
  }

  watch(
    () => input.value?.userId,
    () => {
      connect();
    },
    { flush: "post" },
  );

  onMounted(() => {
    connect();
  });

  onUnmounted(() => {
    teardown();
  });
}
