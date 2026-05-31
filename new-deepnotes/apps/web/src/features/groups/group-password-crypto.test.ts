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
  buildGroupPasswordEnableRequestBody,
  buildGroupPasswordChangeRequestBody,
  buildGroupPasswordDisableRequestBody,
} from "./group-password-crypto";

describe("group-password-crypto", () => {
  async function setupSession(groupId: string, userId: string) {
    await ensureSodiumReady();
    clearSessionCrypto();

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

    return { keyPair };
  }

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

  it("buildGroupPasswordChangeRequestBody re-wraps with new password key", async () => {
    const groupId = "g123456789012345678901";
    const userId = "u123456789012345678901";
    const oldPassword = "old-password-123";
    const newPassword = "new-password-456";

    const { keyPair } = await setupSession(groupId, userId);

    const accessKeyring = createSymmetricKeyring();
    const groupContentKeyring = createSymmetricKeyring();

    const memberEncryptedAccessKeyring = accessKeyring
      .wrapAsymmetric(keyPair, keyPair.publicKey)
      .wrappedValue;

    const { passwordKey: oldPasswordKey } = deriveGroupPasswordValues(groupId, oldPassword);
    const groupEncryptedContentKeyring = groupContentKeyring
      .wrapSymmetric(oldPasswordKey, {
        associatedData: { context: "GroupContentKeyringPasswordProtection", groupId },
      })
      .wrapSymmetric(accessKeyring, {
        associatedData: { context: "GroupContentKeyring", groupId },
      }).wrappedValue;

    const body = await buildGroupPasswordChangeRequestBody({
      groupId,
      currentPassword: oldPassword,
      newPassword,
      groupEncryptedContentKeyring,
      memberEncryptedAccessKeyring,
      groupAccessKeyring: null,
      stored: readSessionCrypto()!,
    });

    expect(body.groupCurrentPasswordHash).toBeTruthy();
    expect(body.groupNewPasswordHash).toBeTruthy();
    expect(body.groupEncryptedContentKeyring).toBeTruthy();

    // Verify with new password
    const { passwordKey: newPasswordKey } = deriveGroupPasswordValues(groupId, newPassword);
    let unlocked = createSymmetricKeyring(
      new Uint8Array(Buffer.from(body.groupEncryptedContentKeyring, "base64")),
    );
    unlocked = unlocked.unwrapSymmetric(accessKeyring, {
      associatedData: { context: "GroupContentKeyring", groupId },
    });
    unlocked = unlocked.unwrapSymmetric(newPasswordKey, {
      associatedData: { context: "GroupContentKeyringPasswordProtection", groupId },
    });
    expect(unlocked.topLayer).toBe(DataLayer.Raw);
    expect(unlocked.value).toEqual(groupContentKeyring.value);
  });

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
