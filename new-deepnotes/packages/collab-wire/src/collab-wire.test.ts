import { describe, expect, it } from "vitest";

import {
  decodeClientCollabBinaryMessage,
  decodeServerDocBinaryMessage,
  encodeDocSingleUpdateAck,
  encodeDocSingleUpdateFromClient,
  encodeDocSingleUpdateFromServer,
  uint8ToBase64Standard,
  base64ToUint8Standard,
} from "./index.js";

describe("@deepnotes/collab-wire", () => {
  it("round-trips client SINGLE_UPDATE and server ACK with dbIndex", () => {
    const enc = new Uint8Array([1, 2, 3, 255]);
    const bin = encodeDocSingleUpdateFromClient({ updateId: 7, encryptedUpdate: enc });
    const dec = decodeClientCollabBinaryMessage(bin);
    expect(dec).toEqual({
      kind: "doc-single",
      updateId: 7,
      encryptedUpdate: enc,
    });

    const ack = encodeDocSingleUpdateAck({ updateId: 7, dbIndex: 42 });
    const ackDec = decodeServerDocBinaryMessage(ack);
    expect(ackDec).toEqual({
      kind: "single-update-ack",
      updateId: 7,
      dbIndex: 42,
    });
  });

  it("server SINGLE_UPDATE decodes ciphertext and optional dbIndex", () => {
    const enc = new Uint8Array([9, 9]);
    const bin = encodeDocSingleUpdateFromServer(enc, 5);
    expect(decodeServerDocBinaryMessage(bin)).toEqual({
      kind: "single-update",
      encryptedUpdate: enc,
      dbIndex: 5,
    });
    expect(decodeServerDocBinaryMessage(encodeDocSingleUpdateFromServer(enc))).toEqual({
      kind: "single-update",
      encryptedUpdate: enc,
      dbIndex: null,
    });
  });

  it("base64 helpers round-trip", () => {
    const u8 = new Uint8Array(5000).map((_, i) => i % 256);
    expect(base64ToUint8Standard(uint8ToBase64Standard(u8))).toEqual(u8);
  });
});
