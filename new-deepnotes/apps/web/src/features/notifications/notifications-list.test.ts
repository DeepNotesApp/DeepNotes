import { describe, expect, it, vi } from "vitest";

import type { DeepnotesApiClient } from "../../api/client";
import {
  fetchNotificationsPage,
  isNotificationUnread,
  markAllNotificationsRead,
} from "./notifications-list";

describe("isNotificationUnread", () => {
  it("treats all as unread when the user has no read cursor", () => {
    expect(isNotificationUnread(42, null)).toBe(true);
  });

  it("compares id to the stored read cursor", () => {
    expect(isNotificationUnread(5, 4)).toBe(true);
    expect(isNotificationUnread(4, 4)).toBe(false);
    expect(isNotificationUnread(3, 4)).toBe(false);
  });
});

describe("fetchNotificationsPage", () => {
  it("maps items and first-page read cursor", async () => {
    const client = {
      GET: vi.fn().mockResolvedValue({
        response: { status: 200 },
        data: {
          items: [
            {
              id: 10,
              type: "group-invite",
              encryptedSymmetricKey: "YQ==",
              encryptedContent: "Yg==",
              dateTime: "2026-01-01T12:00:00.000Z",
            },
          ],
          hasMore: false,
          lastNotificationRead: 4,
        },
      }),
    };
    const out = await fetchNotificationsPage({
      client: client as unknown as DeepnotesApiClient,
    });
    expect(out.error).toBeNull();
    expect(out.hasMore).toBe(false);
    expect(out.lastNotificationRead).toBe(4);
    expect(out.rows[0]).toMatchObject({
      id: 10,
      type: "group-invite",
      unread: true,
    });
  });

  it("uses readCursorForUnread when loading older pages", async () => {
    const client = {
      GET: vi.fn().mockResolvedValue({
        response: { status: 200 },
        data: {
          items: [
            {
              id: 2,
              type: "old",
              encryptedSymmetricKey: "YQ==",
              encryptedContent: "Yg==",
              dateTime: "2025-01-01T12:00:00.000Z",
            },
          ],
          hasMore: false,
        },
      }),
    };
    const out = await fetchNotificationsPage({
      client: client as unknown as DeepnotesApiClient,
      lastNotificationId: 10,
      readCursorForUnread: 5,
    });
    expect(out.rows[0]?.unread).toBe(false);
  });

  it("returns an error on failed GET", async () => {
    const client = {
      GET: vi.fn().mockResolvedValue({
        response: { status: 401 },
        error: { message: "No session" },
        data: undefined,
      }),
    };
    const out = await fetchNotificationsPage({
      client: client as unknown as DeepnotesApiClient,
    });
    expect(out.rows).toEqual([]);
    expect(out.error).toBe("No session");
  });
});

describe("markAllNotificationsRead", () => {
  it("returns ok on 204", async () => {
    const client = {
      POST: vi.fn().mockResolvedValue({
        response: { status: 204 },
      }),
    };
    const out = await markAllNotificationsRead({
      client: client as unknown as DeepnotesApiClient,
    });
    expect(out).toEqual({ ok: true, error: null });
  });
});
