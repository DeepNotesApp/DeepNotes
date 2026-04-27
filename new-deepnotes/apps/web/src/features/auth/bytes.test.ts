import { describe, expect, it } from "vitest";

import { loginPreimageFromPassword, uint8ToBase64 } from "./bytes";

describe("uint8ToBase64", () => {
  it("encodes small buffers", () => {
    const u = new Uint8Array([0, 1, 2, 255]);
    expect(uint8ToBase64(u)).toBe("AAEC/w==");
  });
});

describe("loginPreimageFromPassword", () => {
  it("uses UTF-8 bytes", () => {
    const b = loginPreimageFromPassword("héllo");
    expect(b).toEqual(new TextEncoder().encode("héllo"));
  });
});
