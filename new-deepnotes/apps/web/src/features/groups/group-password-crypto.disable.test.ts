import {
  createSymmetricKeyring,
  DataLayer,
  deriveGroupPasswordValues,
} from "@deepnotes/e2ee";
import { describe, expect, it } from "vitest";

import { readSessionCrypto } from "../auth/crypto-storage";
import { buildGroupPasswordDisableRequestBody } from "./group-password-crypto";
import { setupSession } from "./group-password-crypto.setup";

describe("group-password-crypto disable", () => {
  it("buildGroupPasswordDisableRequestBody removes password layer", async () => {
    const groupId = "g123456789012345678902";
    const userId = "u123456789012345678902";
    const password = "disable-me-789";

    const { keyPair } = await setupSession(groupId, userId);

    const accessKeyring = createSymmetricKeyring();
    const groupContentKeyring = createSymmetricKeyring();

    const memberEncryptedAccessKeyring = accessKeyring
      .wrapAsymmetric(keyPair, keyPair.publicKey)
      .wrappedValue;

    const { passwordKey } = deriveGroupPasswordValues(groupId, password);
    const groupEncryptedContentKeyring = groupContentKeyring
      .wrapSymmetric(passwordKey, {
        associatedData: { context: "GroupContentKeyringPasswordProtection", groupId },
      })
      .wrapSymmetric(accessKeyring, {
        associatedData: { context: "GroupContentKeyring", groupId },
      }).wrappedValue;

    const body = await buildGroupPasswordDisableRequestBody({
      groupId,
      currentPassword: password,
      groupEncryptedContentKeyring,
      memberEncryptedAccessKeyring,
      groupAccessKeyring: null,
      stored: readSessionCrypto()!,
    });

    expect(body.groupPasswordHash).toBeTruthy();
    expect(body.groupEncryptedContentKeyring).toBeTruthy();

    // Verify no password layer remains (only access-wrapped raw)
    let unlocked = createSymmetricKeyring(
      new Uint8Array(Buffer.from(body.groupEncryptedContentKeyring, "base64")),
    );
    unlocked = unlocked.unwrapSymmetric(accessKeyring, {
      associatedData: { context: "GroupContentKeyring", groupId },
    });
    expect(unlocked.topLayer).toBe(DataLayer.Raw);
    expect(unlocked.value).toEqual(groupContentKeyring.value);
  });
});
