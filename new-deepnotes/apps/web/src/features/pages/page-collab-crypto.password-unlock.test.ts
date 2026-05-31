import { randomBytes } from "node:crypto";

import {
  bytesToBase64,
  createKeyring,
  createPrivateKeyring,
  createSymmetricKeyring,
  DataLayer,
  deriveGroupPasswordValues,
  ensureSodiumReady,
  wrapKeyPair,
  wrapSymmetricKey,
} from "@deepnotes/e2ee";
import { describe, expect, it } from "vitest";

import { uint8ToBase64 } from "../auth/bytes";
import { clearSessionCrypto, writeSessionCrypto, readSessionCrypto } from "../auth/crypto-storage";
import {
  unlockPageCollabSymmetricKeyring,
  unwrapGroupContentSymmetricKeyring,
} from "./page-collab-crypto";

describe("page-collab-crypto password unlock", () => {
  it("unwraps password-protected group content keyring with correct password key", async () => {
    await ensureSodiumReady();
    clearSessionCrypto();

    const userId = "u12345678901234567890";
    const groupId = "g12345678901234567890";
    const pageId = "p12345678901234567890";
    const password = "secret-group-password";

    // Create user session keys
    const sessionKey = wrapSymmetricKey(randomBytes(32));
    const publicKeyring = createKeyring(randomBytes(32));
    const privateKeyring = createPrivateKeyring(randomBytes(32));
    const keyPair = wrapKeyPair(publicKeyring, privateKeyring);

    const userEncryptedPrivateKeyring = privateKeyring
      .wrapSymmetric(sessionKey, {
        associatedData: { context: "SessionUserPrivateKeyring", userId },
      })
      .wrappedValue;

    writeSessionCrypto({
      userId,
      sessionId: "s12345678901234567890",
      sessionKeyB64: bytesToBase64(sessionKey.value),
      publicKeyringB64: bytesToBase64(publicKeyring.wrappedValue),
      encryptedPrivateKeyringB64: uint8ToBase64(userEncryptedPrivateKeyring),
      encryptedSymmetricKeyringB64: uint8ToBase64(
        createSymmetricKeyring().wrapSymmetric(sessionKey, {
          associatedData: { context: "SessionUserSymmetricKeyring", userId },
        }).wrappedValue,
      ),
      personalGroupId: groupId,
    });

    // Create group keyrings
    const accessKeyring = createSymmetricKeyring();
    const groupContentKeyring = createSymmetricKeyring();
    const pageKeyring = createSymmetricKeyring();

    // Password-protect the group content keyring (legacy enable flow)
    const { passwordKey } = deriveGroupPasswordValues(groupId, password);
    const encryptedGroupContent = groupContentKeyring
      .wrapSymmetric(passwordKey, {
        associatedData: {
          context: "GroupContentKeyringPasswordProtection",
          groupId,
        },
      })
      .wrapSymmetric(accessKeyring, {
        associatedData: { context: "GroupContentKeyring", groupId },
      });

    // Member access keyring (asymmetrically wrapped with user's public key)
    const memberEncryptedAccessKeyring = accessKeyring
      .wrapAsymmetric(keyPair, keyPair.publicKey)
      .wrappedValue;

    // Page keyring (wrapped with group content keyring)
    const pageEncryptedSymmetricKeyring = pageKeyring
      .wrapSymmetric(groupContentKeyring, {
        associatedData: { context: "PageKeyring", pageId },
      }).wrappedValue;

    // Without password key, it should fail
    await expect(
      unlockPageCollabSymmetricKeyring({
        pageId,
        groupId,
        pageEncryptedSymmetricKeyring,
        groupEncryptedContentKeyring: encryptedGroupContent.wrappedValue,
        memberEncryptedAccessKeyring,
        groupAccessKeyring: null,
        stored: readSessionCrypto()!,
      }),
    ).rejects.toThrow("password-protected group");

    // With correct password key, it should succeed
    const unlockedPageKeyring = await unlockPageCollabSymmetricKeyring({
      pageId,
      groupId,
      pageEncryptedSymmetricKeyring,
      groupEncryptedContentKeyring: encryptedGroupContent.wrappedValue,
      memberEncryptedAccessKeyring,
      groupAccessKeyring: null,
      stored: readSessionCrypto()!,
      groupPasswordKey: passwordKey,
    });

    expect(unlockedPageKeyring.topLayer).toBe(DataLayer.Raw);
    expect(unlockedPageKeyring.value).toEqual(pageKeyring.value);
  });

  it("unwrapGroupContentSymmetricKeyring works with password key", async () => {
    await ensureSodiumReady();
    clearSessionCrypto();

    const userId = "u123456789012345678901";
    const groupId = "g123456789012345678901";
    const password = "another-secret";

    const sessionKey = wrapSymmetricKey(randomBytes(32));
    const publicKeyring = createKeyring(randomBytes(32));
    const privateKeyring = createPrivateKeyring(randomBytes(32));
    const keyPair = wrapKeyPair(publicKeyring, privateKeyring);

    const userEncryptedPrivateKeyring = privateKeyring
      .wrapSymmetric(sessionKey, {
        associatedData: { context: "SessionUserPrivateKeyring", userId },
      })
      .wrappedValue;

    writeSessionCrypto({
      userId,
      sessionId: "s123456789012345678901",
      sessionKeyB64: bytesToBase64(sessionKey.value),
      publicKeyringB64: bytesToBase64(publicKeyring.wrappedValue),
      encryptedPrivateKeyringB64: uint8ToBase64(userEncryptedPrivateKeyring),
      encryptedSymmetricKeyringB64: uint8ToBase64(
        createSymmetricKeyring().wrapSymmetric(sessionKey, {
          associatedData: { context: "SessionUserSymmetricKeyring", userId },
        }).wrappedValue,
      ),
      personalGroupId: groupId,
    });

    const accessKeyring = createSymmetricKeyring();
    const groupContentKeyring = createSymmetricKeyring();

    const { passwordKey } = deriveGroupPasswordValues(groupId, password);
    const encryptedGroupContent = groupContentKeyring
      .wrapSymmetric(passwordKey, {
        associatedData: {
          context: "GroupContentKeyringPasswordProtection",
          groupId,
        },
      })
      .wrapSymmetric(accessKeyring, {
        associatedData: { context: "GroupContentKeyring", groupId },
      });

    const memberEncryptedAccessKeyring = accessKeyring
      .wrapAsymmetric(keyPair, keyPair.publicKey)
      .wrappedValue;

    const result = await unwrapGroupContentSymmetricKeyring({
      groupId,
      groupEncryptedContentKeyring: encryptedGroupContent.wrappedValue,
      memberEncryptedAccessKeyring,
      groupAccessKeyring: null,
      stored: readSessionCrypto()!,
      groupPasswordKey: passwordKey,
    });

    expect(result.topLayer).toBe(DataLayer.Raw);
    expect(result.value).toEqual(groupContentKeyring.value);
  });
});
