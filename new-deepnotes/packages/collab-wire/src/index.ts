/**
 * Binary framing for page collab over WebSocket (legacy-compatible enums;
 * see `CollabMessageType` in legacy `@deeplib/misc`).
 */
import * as decoding from "lib0/decoding";
import * as encoding from "lib0/encoding";

export const CollabMessageType = {
  DOC: 0,
  AWARENESS: 1,
} as const;

export const CollabServerDocMessageType = {
  ALL_UPDATES_UNMERGED: 0,
  SINGLE_UPDATE: 1,
  SINGLE_UPDATE_ACK: 2,
} as const;

export const CollabClientDocMessageType = {
  ALL_UPDATES_UNMERGED_RESPONSE: 0,
  SINGLE_UPDATE: 1,
} as const;

export function encodeDocSingleUpdateFromClient(input: {
  updateId: number;
  encryptedUpdate: Uint8Array;
}): Uint8Array {
  const enc = encoding.createEncoder();
  encoding.writeVarUint(enc, CollabMessageType.DOC);
  encoding.writeVarUint(enc, CollabClientDocMessageType.SINGLE_UPDATE);
  encoding.writeVarUint(enc, input.updateId);
  encoding.writeVarUint8Array(enc, input.encryptedUpdate);
  return encoding.toUint8Array(enc);
}

export function encodeDocSingleUpdateFromServer(
  encryptedUpdate: Uint8Array,
  dbIndex?: number,
): Uint8Array {
  const enc = encoding.createEncoder();
  encoding.writeVarUint(enc, CollabMessageType.DOC);
  encoding.writeVarUint(enc, CollabServerDocMessageType.SINGLE_UPDATE);
  encoding.writeVarUint8Array(enc, encryptedUpdate);
  if (dbIndex !== undefined) {
    encoding.writeVarUint(enc, dbIndex);
  }
  return encoding.toUint8Array(enc);
}

/** Legacy ACK + optional `dbIndex` when encoder supports greenfield clients. */
export function encodeDocSingleUpdateAck(input: {
  updateId: number;
  dbIndex?: number;
}): Uint8Array {
  const enc = encoding.createEncoder();
  encoding.writeVarUint(enc, CollabMessageType.DOC);
  encoding.writeVarUint(enc, CollabServerDocMessageType.SINGLE_UPDATE_ACK);
  encoding.writeVarUint(enc, input.updateId);
  if (input.dbIndex !== undefined) {
    encoding.writeVarUint(enc, input.dbIndex);
  }
  return encoding.toUint8Array(enc);
}

export function encodeAwarenessMessage(encryptedChunks: Uint8Array[]): Uint8Array {
  const enc = encoding.createEncoder();
  encoding.writeVarUint(enc, CollabMessageType.AWARENESS);
  encoding.writeVarUint(enc, encryptedChunks.length);
  for (const chunk of encryptedChunks) {
    encoding.writeVarUint8Array(enc, chunk);
  }
  return encoding.toUint8Array(enc);
}

export type DecodedClientCollabMessage =
  | { kind: "doc-single"; updateId: number; encryptedUpdate: Uint8Array }
  | { kind: "awareness"; raw: Uint8Array };

export function decodeClientCollabBinaryMessage(message: Uint8Array): DecodedClientCollabMessage | null {
  const dec = decoding.createDecoder(message);
  if (!decoding.hasContent(dec)) {
    return null;
  }
  const top = decoding.readVarUint(dec);
  if (top === CollabMessageType.AWARENESS) {
    return { kind: "awareness", raw: message };
  }
  if (top !== CollabMessageType.DOC) {
    return null;
  }
  const docKind = decoding.readVarUint(dec);
  if (docKind !== CollabClientDocMessageType.SINGLE_UPDATE) {
    return null;
  }
  const updateId = decoding.readVarUint(dec);
  const encryptedUpdate = decoding.readVarUint8Array(dec);
  return { kind: "doc-single", updateId, encryptedUpdate };
}

export type DecodedServerDocMessage =
  | { kind: "single-update"; encryptedUpdate: Uint8Array; dbIndex: number | null }
  | { kind: "single-update-ack"; updateId: number; dbIndex: number | null };

export function decodeServerDocBinaryMessage(message: Uint8Array): DecodedServerDocMessage | null {
  const dec = decoding.createDecoder(message);
  if (!decoding.hasContent(dec)) {
    return null;
  }
  const top = decoding.readVarUint(dec);
  if (top !== CollabMessageType.DOC) {
    return null;
  }
  const docKind = decoding.readVarUint(dec);
  if (docKind === CollabServerDocMessageType.SINGLE_UPDATE) {
    const encryptedUpdate = decoding.readVarUint8Array(dec);
    const dbIndex = decoding.hasContent(dec) ? decoding.readVarUint(dec) : null;
    return { kind: "single-update", encryptedUpdate, dbIndex };
  }
  if (docKind === CollabServerDocMessageType.SINGLE_UPDATE_ACK) {
    const updateId = decoding.readVarUint(dec);
    const dbIndex = decoding.hasContent(dec) ? decoding.readVarUint(dec) : null;
    return { kind: "single-update-ack", updateId, dbIndex };
  }
  return null;
}

/** Chunked base64 for large ciphertext (Workers-safe). */
export function uint8ToBase64Standard(bytes: Uint8Array): string {
  if (bytes.byteLength === 0) {
    return "";
  }
  const chunk = 8192;
  let out = "";
  for (let i = 0; i < bytes.byteLength; i += chunk) {
    const slice = bytes.subarray(i, i + chunk);
    out += String.fromCharCode(...slice);
  }
  return btoa(out);
}

export function base64ToUint8Standard(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}
