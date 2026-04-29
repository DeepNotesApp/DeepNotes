/**
 * Legacy realtime server binary framing (`@deeplib/misc` enums + lib0 + msgpackr payload).
 * See `apps/realtime-server/src/sockets.ts` and `apps/client/.../realtime/client.ts`.
 */
import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";
import { pack, unpack } from "msgpackr";

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
  | { kind: "user-notification"; packedNotification: Uint8Array }
  | {
      kind: "response";
      responses: { commandId: number; packedValue: Uint8Array }[];
    }
  | {
      kind: "data-notification";
      items: {
        prefix: string;
        suffix: string;
        field: string;
        packedValue: Uint8Array;
      }[];
    };

/** Decode any legacy realtime server → client binary frame (RESPONSE, DATA_NOTIFICATION, USER_NOTIFICATION). */
export function decodeRealtimeServerBinaryMessage(
  message: Uint8Array,
): DecodedRealtimeServerMessage | null {
  const dec = decoding.createDecoder(message);
  if (!decoding.hasContent(dec)) {
    return null;
  }
  const t = decoding.readVarUint(dec);
  if (t === RealtimeServerMessageType.USER_NOTIFICATION) {
    const packedNotification = decoding.readVarUint8Array(dec);
    return { kind: "user-notification", packedNotification };
  }
  if (t === RealtimeServerMessageType.RESPONSE) {
    const numCommands = decoding.readVarUint(dec);
    const responses: { commandId: number; packedValue: Uint8Array }[] = [];
    for (let i = 0; i < numCommands; i++) {
      const commandId = decoding.readVarUint(dec);
      const packedValue = decoding.readVarUint8Array(dec);
      responses.push({ commandId, packedValue });
    }
    return { kind: "response", responses };
  }
  if (t === RealtimeServerMessageType.DATA_NOTIFICATION) {
    const numItems = decoding.readVarUint(dec);
    const items: {
      prefix: string;
      suffix: string;
      field: string;
      packedValue: Uint8Array;
    }[] = [];
    for (let i = 0; i < numItems; i++) {
      const prefix = decoding.readVarString(dec);
      const suffix = decoding.readVarString(dec);
      const field = decoding.readVarString(dec);
      const packedValue = decoding.readVarUint8Array(dec);
      items.push({ prefix, suffix, field, packedValue });
    }
    return { kind: "data-notification", items };
  }
  return null;
}

export type RealtimeClientCommand = {
  type: number;
  /** Passed through `msgpackr.pack` on the wire (same as legacy `RealtimeCommand.args`). */
  args: unknown;
};

/** Legacy client → server REQUEST batch (`RealtimeClient.flushCommandBuffer`). */
export function encodeRealtimeClientRequest(input: {
  firstCommandId: number;
  commands: RealtimeClientCommand[];
}): Uint8Array {
  const enc = encoding.createEncoder();
  encoding.writeVarUint(enc, RealtimeClientMessageType.REQUEST);
  encoding.writeVarUint(enc, input.firstCommandId);
  encoding.writeVarUint(enc, input.commands.length);
  for (const command of input.commands) {
    encoding.writeVarUint(enc, command.type);
    encoding.writeVarUint8Array(enc, pack(command.args));
  }
  return encoding.toUint8Array(enc);
}

export type DecodedRealtimeClientRequest = {
  firstCommandId: number;
  commands: RealtimeClientCommand[];
};

export function decodeRealtimeClientBinaryMessage(
  message: Uint8Array,
): DecodedRealtimeClientRequest | null {
  const dec = decoding.createDecoder(message);
  if (!decoding.hasContent(dec)) {
    return null;
  }
  const messageType = decoding.readVarUint(dec);
  if (messageType !== RealtimeClientMessageType.REQUEST) {
    return null;
  }
  const firstCommandId = decoding.readVarUint(dec);
  const commandCount = decoding.readVarUint(dec);
  const commands: RealtimeClientCommand[] = [];
  for (let i = 0; i < commandCount; i++) {
    const type = decoding.readVarUint(dec);
    const argsPacked = decoding.readVarUint8Array(dec);
    const args = unpack(argsPacked) as unknown;
    commands.push({ type, args });
  }
  return { firstCommandId, commands };
}

/** Server → client RESPONSE (`SocketAuxObject` after HGET batch). */
export function encodeRealtimeServerResponse(input: {
  responses: { commandId: number; value: unknown }[];
}): Uint8Array {
  const enc = encoding.createEncoder();
  encoding.writeVarUint(enc, RealtimeServerMessageType.RESPONSE);
  encoding.writeVarUint(enc, input.responses.length);
  for (const r of input.responses) {
    encoding.writeVarUint(enc, r.commandId);
    encoding.writeVarUint8Array(enc, pack(r.value));
  }
  return encoding.toUint8Array(enc);
}

/** Server → client DATA_NOTIFICATION (subscribed hash fields). */
export function encodeRealtimeServerDataNotification(input: {
  items: {
    prefix: string;
    suffix: string;
    field: string;
    value: unknown;
  }[];
}): Uint8Array {
  const enc = encoding.createEncoder();
  encoding.writeVarUint(enc, RealtimeServerMessageType.DATA_NOTIFICATION);
  encoding.writeVarUint(enc, input.items.length);
  for (const it of input.items) {
    encoding.writeVarString(enc, it.prefix);
    encoding.writeVarString(enc, it.suffix);
    encoding.writeVarString(enc, it.field);
    encoding.writeVarUint8Array(enc, pack(it.value));
  }
  return encoding.toUint8Array(enc);
}

/** Unpack msgpack payloads from RESPONSE (HGET values). */
export function unpackRealtimeResponseValues(
  decoded: Extract<DecodedRealtimeServerMessage, { kind: "response" }>,
): { commandId: number; value: unknown }[] {
  return decoded.responses.map((r) => ({
    commandId: r.commandId,
    value: unpack(r.packedValue),
  }));
}

/** Unpack msgpack payloads from DATA_NOTIFICATION items. */
export function unpackRealtimeDataNotificationItems(
  decoded: Extract<DecodedRealtimeServerMessage, { kind: "data-notification" }>,
): { prefix: string; suffix: string; field: string; value: unknown }[] {
  return decoded.items.map((it) => ({
    prefix: it.prefix,
    suffix: it.suffix,
    field: it.field,
    value: unpack(it.packedValue),
  }));
}
