import { describe, expect, it } from "vitest";

import {
  decodeRealtimeServerBinaryMessage,
  encodeUserNotificationServerMessage,
} from "./index.js";

describe("realtime-wire", () => {
  it("round-trips USER_NOTIFICATION framing", () => {
    const inner = new Uint8Array([1, 2, 3, 4, 5]);
    const framed = encodeUserNotificationServerMessage(inner);
    const dec = decodeRealtimeServerBinaryMessage(framed);
    expect(dec).toEqual({ kind: "user-notification", packedNotification: inner });
  });
});
