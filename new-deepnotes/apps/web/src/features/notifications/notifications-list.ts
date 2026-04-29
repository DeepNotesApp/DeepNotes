import type { DeepnotesApiClient } from "../../api/client";

export type NotificationRow = {
  id: number;
  type: string;
  dateTime: string;
  /** True when this row is newer than the server’s read cursor (or cursor unset). */
  unread: boolean;
  encryptedSymmetricKey: string;
  encryptedContent: string;
  /** Filled client-side after `tryDecryptNotificationBody` succeeds. */
  decryptedText?: string | null;
};

import {
  formatNotificationPayload,
  tryDecryptNotificationBody,
} from "./decrypt-notification-body";

/**
 * Fill `decryptedText` where session keyrings can unlock the ciphertext.
 */
export async function attachDecryptedNotificationText(
  rows: NotificationRow[],
): Promise<NotificationRow[]> {
  const out = await Promise.all(
    rows.map(async (r) => {
      const dec = await tryDecryptNotificationBody({
        encryptedSymmetricKey: r.encryptedSymmetricKey,
        encryptedContent: r.encryptedContent,
      });
      return {
        ...r,
        decryptedText:
          dec === null ? null : formatNotificationPayload(dec),
      };
    }),
  );
  return out;
}

/**
 * `GET /api/users/me/notifications` with optional older-than pagination.
 * The API includes `lastNotificationRead` on the first page only; for `load more`,
 * pass the same cursor you stored from the first response so unread badges stay
 * correct.
 */
export async function fetchNotificationsPage(input: {
  client: DeepnotesApiClient;
  lastNotificationId?: number;
  /** Required when `lastNotificationId` is set — the read cursor from the first page. */
  readCursorForUnread?: number | null;
}): Promise<{
  rows: NotificationRow[];
  hasMore: boolean;
  lastNotificationRead: number | null | undefined;
  error: string | null;
}> {
  const { client, lastNotificationId, readCursorForUnread } = input;
  const res = await client.GET("/api/users/me/notifications", {
    params: {
      query:
        lastNotificationId != null ? { lastNotificationId } : {},
    },
  });

  if (res.response.status !== 200 || !res.data) {
    if (res.error && typeof res.error === "object" && "message" in res.error) {
      return {
        rows: [],
        hasMore: false,
        lastNotificationRead: undefined,
        error: String((res.error as { message?: string }).message),
      };
    }
    return {
      rows: [],
      hasMore: false,
      lastNotificationRead: undefined,
      error: "Could not load notifications.",
    };
  }

  const { items, hasMore, lastNotificationRead } = res.data;
  const readCursor =
    lastNotificationId == null
      ? (lastNotificationRead ?? null)
      : (readCursorForUnread ?? null);

  const rows: NotificationRow[] = items.map((it) => ({
    id: it.id,
    type: it.type,
    dateTime: it.dateTime,
    unread: isNotificationUnread(it.id, readCursor),
    encryptedSymmetricKey: it.encryptedSymmetricKey,
    encryptedContent: it.encryptedContent,
    decryptedText: undefined,
  }));

  return {
    rows,
    hasMore: Boolean(hasMore),
    lastNotificationRead:
      lastNotificationId == null ? (lastNotificationRead ?? null) : undefined,
    error: null,
  };
}

/** Server stores the newest notification id the user has acknowledged. */
export function isNotificationUnread(
  notificationId: number,
  lastNotificationRead: number | null,
): boolean {
  if (lastNotificationRead == null) {
    return true;
  }
  return notificationId > lastNotificationRead;
}

export async function markAllNotificationsRead(input: {
  client: DeepnotesApiClient;
}): Promise<{ ok: boolean; error: string | null }> {
  const res = await input.client.POST("/api/users/me/notifications/read", {});
  if (res.response.status === 204) {
    return { ok: true, error: null };
  }
  if (res.error && typeof res.error === "object" && "message" in res.error) {
    return {
      ok: false,
      error: String((res.error as { message?: string }).message),
    };
  }
  return { ok: false, error: "Could not update read state." };
}
