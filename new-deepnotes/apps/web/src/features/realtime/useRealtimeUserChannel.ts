import { unpack } from "msgpackr";
import { onMounted, onUnmounted, ref, watch, type Ref } from "vue";

import {
  formatNotificationPayload,
  tryDecryptNotificationBody,
} from "../notifications/decrypt-notification-body";
import { incrementUnreadCount } from "../notifications/useNotificationBadge";
import {
  disconnectRealtimeUserWs,
  ensureRealtimeUserWs,
  subscribeRealtimeUserNotification,
} from "./realtime-user-ws";

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
 * `USER_NOTIFICATION` pushes and shared REQUEST batches (`realtime-user-ws.ts`).
 */
export function useRealtimeUserChannel(
  input: Ref<{ userId: string; demo: boolean } | null>,
) {
  const unsub = subscribeRealtimeUserNotification(async (packedNotification) => {
    let outer: unknown;
    try {
      outer = unpack(packedNotification);
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
      incrementUnreadCount();
    }
  });

  watch(
    () => input.value,
    (u) => {
      if (u == null || u.demo || typeof window === "undefined") {
        disconnectRealtimeUserWs();
        return;
      }
      ensureRealtimeUserWs({ demo: false });
    },
    { flush: "post" },
  );

  onMounted(() => {
    const u = input.value;
    if (u != null && !u.demo && typeof window !== "undefined") {
      ensureRealtimeUserWs({ demo: false });
    }
  });

  onUnmounted(() => {
    unsub();
  });
}
