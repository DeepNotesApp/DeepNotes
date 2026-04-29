import { describe, expect, it } from "vitest";

import {
  buildDataUpdatePublishPayload,
  bytesToBase64,
  parseDataUpdateSubscribePayload,
  parseRealtimeFullKey,
  parseUpstashPubSubSseLine,
  realtimeDataUpdateChannel,
} from "./realtime-redis-pubsub.js";

describe("realtime-redis-pubsub", () => {
  it("parseRealtimeFullKey round-trips typical page key", () => {
    const fk = "page:p9>encrypted-absolute-title";
    expect(parseRealtimeFullKey(fk)).toEqual({
      prefix: "page",
      suffix: "p9",
      field: "encrypted-absolute-title",
    });
    expect(realtimeDataUpdateChannel(fk)).toBe(
      "data-update|page:p9>encrypted-absolute-title",
    );
  });

  it("publish payload survives base64 + self vs remote", () => {
    const self = new Uint8Array(16);
    self.fill(3);
    const other = new Uint8Array(16);
    other.fill(9);

    const value = { title: "n", n: 1 };
    const raw = buildDataUpdatePublishPayload(self, value);
    const b64 = bytesToBase64(raw);

    expect(parseDataUpdateSubscribePayload(b64, self)).toEqual({
      ok: true,
      fromSelf: true,
      value,
    });
    expect(parseDataUpdateSubscribePayload(b64, other)).toEqual({
      ok: true,
      fromSelf: false,
      value,
    });
  });

  it("parseUpstashPubSubSseLine", () => {
    expect(parseUpstashPubSubSseLine("data: subscribe,chat,1")).toEqual({
      kind: "subscribe_ack",
    });
    expect(
      parseUpstashPubSubSseLine("data: message,chat,SGVsbG8="),
    ).toEqual({
      kind: "message",
      channel: "chat",
      payload: "SGVsbG8=",
    });
  });

  it("rejects truncated payload", () => {
    const bad = bytesToBase64(new Uint8Array([1, 2, 3]));
    expect(parseDataUpdateSubscribePayload(bad, new Uint8Array(16))).toEqual({
      ok: false,
    });
  });
});
