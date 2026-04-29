import { describe, expect, it } from "vitest";

import {
  decodeRealtimeClientBinaryMessage,
  decodeRealtimeServerBinaryMessage,
  encodeRealtimeClientRequest,
  encodeRealtimeServerDataNotification,
  encodeRealtimeServerResponse,
  encodeUserNotificationServerMessage,
  unpackRealtimeDataNotificationItems,
  unpackRealtimeResponseValues,
  RealtimeCommandType,
} from "./index.js";

describe("@deepnotes/realtime-wire", () => {
  it("round-trips USER_NOTIFICATION framing", () => {
    const inner = new Uint8Array([1, 2, 3, 4, 5]);
    const framed = encodeUserNotificationServerMessage(inner);
    const dec = decodeRealtimeServerBinaryMessage(framed);
    expect(dec).toEqual({ kind: "user-notification", packedNotification: inner });
  });

  it("round-trips RESPONSE (legacy HGET replies)", () => {
    const bin = encodeRealtimeServerResponse({
      responses: [
        { commandId: 10, value: "hello" },
        { commandId: 11, value: null },
      ],
    });
    const dec = decodeRealtimeServerBinaryMessage(bin);
    expect(dec?.kind).toBe("response");
    if (dec?.kind !== "response") {
      throw new Error("expected response");
    }
    expect(unpackRealtimeResponseValues(dec)).toEqual([
      { commandId: 10, value: "hello" },
      { commandId: 11, value: null },
    ]);
  });

  it("round-trips DATA_NOTIFICATION (hash field push)", () => {
    const bin = encodeRealtimeServerDataNotification({
      items: [
        {
          prefix: "page",
          suffix: "pg1",
          field: "encrypted-absolute-title",
          value: new Uint8Array([1, 2]),
        },
      ],
    });
    const dec = decodeRealtimeServerBinaryMessage(bin);
    expect(dec?.kind).toBe("data-notification");
    if (dec?.kind !== "data-notification") {
      throw new Error("expected data-notification");
    }
    const rows = unpackRealtimeDataNotificationItems(dec);
    expect(rows[0]?.prefix).toBe("page");
    expect(rows[0]?.suffix).toBe("pg1");
    expect(rows[0]?.field).toBe("encrypted-absolute-title");
    expect(rows[0]?.value).toEqual(new Uint8Array([1, 2]));
  });

  it("round-trips client REQUEST batch (HGET / SUBSCRIBE args)", () => {
    const req = encodeRealtimeClientRequest({
      firstCommandId: 5,
      commands: [
        {
          type: RealtimeCommandType.HGET,
          args: ["page", "abc", "encrypted-relative-title"],
        },
        {
          type: RealtimeCommandType.SUBSCRIBE,
          args: ["group", "g1", "encrypted-name"],
        },
      ],
    });
    const dec = decodeRealtimeClientBinaryMessage(req);
    expect(dec).toEqual({
      firstCommandId: 5,
      commands: [
        {
          type: RealtimeCommandType.HGET,
          args: ["page", "abc", "encrypted-relative-title"],
        },
        {
          type: RealtimeCommandType.SUBSCRIBE,
          args: ["group", "g1", "encrypted-name"],
        },
      ],
    });
  });
});
