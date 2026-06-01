import { randomBytes } from "node:crypto";

import {
  createSymmetricKeyring,
  DataLayer,
  deriveGroupPasswordValues,
} from "@deepnotes/e2ee";
import { describe, expect, it } from "vitest";

import { readSessionCrypto } from "../auth/crypto-storage";
import { buildGroupPasswordEnableRequestBody } from "./group-password-crypto";
import { setupSession } from "./group-password-crypto.setup";

describe("group-password-crypto enable", () => {
  it("buildGroupPasswordEnableRequestBody wraps raw content with password key", async () => {
    const groupId = "g12345678901234567890";
    const userId = "u12345678901234567890";
    const password = "secret-group-password";

    const { keyPair } = await setupSession(groupId, userId);

    const accessKeyring = createSymmetricKeyring();
    const groupContentKeyring = createSymmetricKeyring();

    const memberEncryptedAccessKeyring = accessKeyring
      .wrapAsymmetric(keyPair, keyPair.publicKey)
      .wrappedValue;

    const groupEncryptedContentKeyring = groupContentKeyring
      .wrapSymmetric(accessKeyring, {
        associatedData: { context: "GroupContentKeyring", groupId },
      }).wrappedValue;

    const body = await buildGroupPasswordEnableRequestBody({
      groupId,
      password,
      groupEncryptedContentKeyring,
      memberEncryptedAccessKeyring,
      groupAccessKeyring: null,
      stored: readSessionCrypto()!,
    });

    expect(body.groupPasswordHash).toBeTruthy();
    expect(body.groupEncryptedContentKeyring).toBeTruthy();

    // Verify the produced keyring can be unwrapped
    const { passwordKey } = deriveGroupPasswordValues(groupId, password);
    let unlocked = createSymmetricKeyring(
      new Uint8Array(Buffer.from(body.groupEncryptedContentKeyring, "base64")),
    );
    unlocked = unlocked.unwrapSymmetric(accessKeyring, {
      associatedData: { context: "GroupContentKeyring", groupId },
    });
    unlocked = unlocked.unwrapSymmetric(passwordKey, {
      associatedData: { context: "GroupContentKeyringPasswordProtection", groupId },
    });
    expect(unlocked.topLayer).toBe(DataLayer.Raw);
    expect(unlocked.value).toEqual(groupContentKeyring.value);
  });
});
