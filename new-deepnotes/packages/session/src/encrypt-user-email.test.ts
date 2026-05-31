import { describe, expect, it, beforeAll } from "vitest";

import { ensureSodiumReady } from "@deepnotes/session-core";
import { decryptUserEmail, encryptUserEmail } from "@deepnotes/session-core";

/** 32-byte XChaCha key as standard base64 */
const TEST_KEY_B64 = Buffer.alloc(32, 9).toString("base64");

describe("encryptUserEmail / decryptUserEmail", () => {
  beforeAll(async () => {
    await ensureSodiumReady();
  });

  it("round-trips and lowercases by default", () => {
    const email = "User@Example.COM";
    const ct = encryptUserEmail(email, TEST_KEY_B64, "");
    const out = decryptUserEmail(ct, TEST_KEY_B64, "");
    expect(out).toBe("user@example.com");
  });

  it("preserves casing for addresses in EMAIL_CASE_SENSITIVITY_EXCEPTIONS", () => {
    const email = "PreserveCase@X.org";
    const exceptions = "PreserveCase@X.org";
    const ct = encryptUserEmail(email, TEST_KEY_B64, exceptions);
    const out = decryptUserEmail(ct, TEST_KEY_B64, exceptions);
    expect(out).toBe("PreserveCase@X.org");
  });

  it("rejects tampered ciphertext", () => {
    const ct = encryptUserEmail("a@b.co", TEST_KEY_B64, "");
    const tampered = new Uint8Array(ct);
    tampered[0] = (tampered[0] ?? 0) ^ 0xff;
    expect(() => decryptUserEmail(tampered, TEST_KEY_B64, "")).toThrow();
  });
});
