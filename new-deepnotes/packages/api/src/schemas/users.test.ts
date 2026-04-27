import { describe, expect, it } from "vitest";

import {
  userEmailChangeConfirmRequestSchema,
  userEmailChangeRequestSchema,
  userPasswordChangeRequestSchema,
} from "./users.js";

const oneByteB64 = Buffer.from([0xab]).toString("base64");

describe("user request schemas (REST body validation)", () => {
  it("userEmailChangeRequestSchema accepts byte fields and email", () => {
    const parsed = userEmailChangeRequestSchema.parse({
      oldLoginHash: oneByteB64,
      newEmail: "new@example.com",
    });
    expect(parsed.oldLoginHash).toEqual(new Uint8Array([0xab]));
    expect(parsed.newEmail).toBe("new@example.com");
  });

  it("userEmailChangeConfirmRequestSchema requires six-digit code", () => {
    const body = {
      oldLoginHash: oneByteB64,
      emailVerificationCode: "042069",
      newLoginHash: Buffer.from([1]).toString("base64"),
      userEncryptedPrivateKeyring: Buffer.from([2]).toString("base64"),
      userEncryptedSymmetricKeyring: Buffer.from([3]).toString("base64"),
    };
    const ok = userEmailChangeConfirmRequestSchema.parse(body);
    expect(ok.emailVerificationCode).toBe("042069");
    expect(() =>
      userEmailChangeConfirmRequestSchema.parse({
        ...body,
        emailVerificationCode: "12345",
      }),
    ).toThrow();
  });

  it("userPasswordChangeRequestSchema decodes all byte fields", () => {
    const a = Buffer.from("aa", "utf8").toString("base64");
    const b = Buffer.from("bb", "utf8").toString("base64");
    const c = Buffer.from("cc", "utf8").toString("base64");
    const d = Buffer.from("dd", "utf8").toString("base64");
    const p = userPasswordChangeRequestSchema.parse({
      oldLoginHash: a,
      newLoginHash: b,
      userEncryptedPrivateKeyring: c,
      userEncryptedSymmetricKeyring: d,
    });
    expect(new TextDecoder().decode(p.oldLoginHash)).toBe("aa");
    expect(new TextDecoder().decode(p.newLoginHash)).toBe("bb");
  });
});
