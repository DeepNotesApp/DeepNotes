/**
 * Legacy-compatible Redis pub/sub for realtime hash fields: channel `data-update|{fullKey}`,
 * payload base64(`publisherId (16 bytes)` + `msgpackr(value)`). Matches KeyDB/TCP behavior
 * described in `packages/@stdlib/data` for cross-process fan-out; Upstash uses REST PUBLISH + SSE SUBSCRIBE.
 */
import { pack, unpack } from "msgpackr";

export const REALTIME_DATA_UPDATE_CHANNEL_PREFIX = "data-update|";

export function realtimeDataUpdateChannel(fullKey: string): string {
  return `${REALTIME_DATA_UPDATE_CHANNEL_PREFIX}${fullKey}`;
}

/** Split `prefix:suffix>field` (suffix may contain ':' if ever needed). */
export function parseRealtimeFullKey(fullKey: string): {
  prefix: string;
  suffix: string;
  field: string;
} | null {
  const gt = fullKey.lastIndexOf(">");
  if (gt <= 0 || gt === fullKey.length - 1) {
    return null;
  }
  const keyPart = fullKey.slice(0, gt);
  const field = fullKey.slice(gt + 1);
  const c = keyPart.indexOf(":");
  if (c <= 0 || c === keyPart.length - 1) {
    return null;
  }
  return {
    prefix: keyPart.slice(0, c),
    suffix: keyPart.slice(c + 1),
    field,
  };
}

export function bytesToBase64(u8: Uint8Array): string {
  let bin = "";
  const chunk = 8192;
  for (let i = 0; i < u8.length; i += chunk) {
    bin += String.fromCharCode(...u8.subarray(i, i + chunk));
  }
  return btoa(bin);
}

export function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

export function buildDataUpdatePublishPayload(
  publisherId: Uint8Array,
  value: unknown,
): Uint8Array {
  const packed = pack(value);
  const out = new Uint8Array(16 + packed.length);
  out.set(publisherId.subarray(0, 16), 0);
  out.set(packed, 16);
  return out;
}

export type ParsedDataUpdatePayload =
  | { ok: false }
  | { ok: true; fromSelf: boolean; value: unknown };

export function parseDataUpdateSubscribePayload(
  messageBase64: string,
  selfPublisherId: Uint8Array,
): ParsedDataUpdatePayload {
  let bytes: Uint8Array;
  try {
    bytes = base64ToBytes(messageBase64);
  } catch {
    return { ok: false };
  }
  if (bytes.length < 16) {
    return { ok: false };
  }
  let fromSelf = true;
  for (let i = 0; i < 16; i++) {
    if (bytes[i] !== selfPublisherId[i]!) {
      fromSelf = false;
      break;
    }
  }
  try {
    const value = unpack(bytes.subarray(16));
    return { ok: true, fromSelf, value };
  } catch {
    return { ok: false };
  }
}

/** Upstash SSE lines: `data: subscribe,chat,1` or `data: message,chat,hello` */
export function parseUpstashPubSubSseLine(line: string):
  | { kind: "subscribe_ack" }
  | { kind: "message"; channel: string; payload: string }
  | { kind: "other" } {
  const trimmed = line.replace(/\r$/, "");
  if (!trimmed.startsWith("data: ")) {
    return { kind: "other" };
  }
  const rest = trimmed.slice("data: ".length);
  const parts = rest.split(",");
  const head = parts[0]?.trim();
  if (head === "subscribe") {
    return { kind: "subscribe_ack" };
  }
  if (head === "message" && parts.length >= 3) {
    const channel = parts[1] ?? "";
    const payload = parts.slice(2).join(",");
    return { kind: "message", channel, payload };
  }
  return { kind: "other" };
}

export async function upstashPublish(
  baseUrl: string,
  token: string,
  channel: string,
  message: string,
): Promise<void> {
  const u = baseUrl.replace(/\/$/, "");
  const res = await fetch(u, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(["PUBLISH", channel, message]),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Upstash PUBLISH failed: ${res.status} ${t}`);
  }
}
