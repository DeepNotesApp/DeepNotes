import { describe, expect, it } from "vitest";

import { hashUserEmail } from "@deepnotes/session-core";

describe("hashUserEmail", () => {
  it("is stable for the same normalized email and secret", async () => {
    const secret = "test-email-hmac-secret";
    const exceptions = "";
    const a = await hashUserEmail("MixEd@Case.com", secret, exceptions);
    const b = await hashUserEmail("mixed@case.com", secret, exceptions);
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(true);
  });

  it("differs when the secret differs", async () => {
    const exceptions = "";
    const h1 = await hashUserEmail("same@x.co", "secret-a", exceptions);
    const h2 = await hashUserEmail("same@x.co", "secret-b", exceptions);
    expect(Buffer.from(h1).equals(Buffer.from(h2))).toBe(false);
  });

  it("respects case-sensitivity exceptions like encryptUserEmail", async () => {
    const secret = "s";
    const ex = "Special@X.co";
    const hPreserve = await hashUserEmail("Special@X.co", secret, ex);
    const hLower = await hashUserEmail("special@x.co", secret, ex);
    expect(Buffer.from(hPreserve).equals(Buffer.from(hLower))).toBe(false);
  });
});
