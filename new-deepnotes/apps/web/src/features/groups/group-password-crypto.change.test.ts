import {
  createSymmetricKeyring,
  DataLayer,
  deriveGroupPasswordValues,
} from "@deepnotes/e2ee";
import { describe, expect, it } from "vitest";

import { readSessionCrypto } from "../auth/crypto-storage";
import { buildGroupPasswordChangeRequestBody } from "./group-password-crypto";
import { setupSession } from "./group-password-crypto.setup";

describe("group-password-crypto change", () => {
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
});
