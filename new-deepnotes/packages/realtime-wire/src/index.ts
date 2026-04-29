/**
 * Legacy realtime server binary framing (`@deeplib/misc` enums + lib0 + msgpackr payload).
 * See `apps/realtime-server/src/sockets.ts` and `apps/client/.../realtime/client.ts`.
 */
import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";

export const RealtimeClientMessageType = {
  REQUEST: 0,
} as const;

export const RealtimeServerMessageType = {
  RESPONSE: 0,
  DATA_NOTIFICATION: 1,
  USER_NOTIFICATION: 2,
} as const;

export const RealtimeCommandType = {
  HGET: 0,
  HSET: 1,
  SUBSCRIBE: 2,
  UNSUBSCRIBE: 3,
} as const;

/** Wrap `msgpackr.pack(DeepNotesNotification)` for the wire (internal payload). */
export function encodeUserNotificationServerMessage(
  packedNotification: Uint8Array,
): Uint8Array {
  const enc = encoding.createEncoder();
  encoding.writeVarUint(enc, RealtimeServerMessageType.USER_NOTIFICATION);
  encoding.writeVarUint8Array(enc, packedNotification);
  return encoding.toUint8Array(enc);
}

export type DecodedRealtimeServerMessage =
  | { kind: "user-notification"; packedNotification: Uint8Array };

export function decodeRealtimeServerBinaryMessage(
  message: Uint8Array,
): DecodedRealtimeServerMessage | null {
  const dec = decoding.createDecoder(message);
  if (!decoding.hasContent(dec)) {
    return null;
  }
  const t = decoding.readVarUint(dec);
  if (t !== RealtimeServerMessageType.USER_NOTIFICATION) {
    return null;
  }
  const packedNotification = decoding.readVarUint8Array(dec);
  return { kind: "user-notification", packedNotification };
}
