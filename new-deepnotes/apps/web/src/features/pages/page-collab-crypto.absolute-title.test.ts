import { beforeAll, describe, expect, it } from "vitest";

import { createSymmetricKeyring, ensureSodiumReady } from "@deepnotes/e2ee";

import { decryptPageAbsoluteTitle } from "./page-collab-crypto";

describe("decryptPageAbsoluteTitle", () => {
  beforeAll(async () => {
    await ensureSodiumReady();
  });

  it("round-trips title ciphertext with PageAbsoluteTitle AAD", () => {
    const pageId = "p-test-uuid";
    const ring = createSymmetricKeyring();
    const plain = new TextEncoder().encode("My / Page / Title");
    const ct = ring.encrypt(plain, {
      padding: true,
      associatedData: {
        context: "PageAbsoluteTitle",
        pageId,
      },
    });
    expect(
      decryptPageAbsoluteTitle({
        pageKeyring: ring,
        pageId,
        ciphertext: ct,
      }),
    ).toBe("My / Page / Title");
  });
});
