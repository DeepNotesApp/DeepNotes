import { randomBytes } from "node:crypto";

import {
  base64ToBytes,
  createPrivateKeyring,
  createSymmetricKeyring,
  DataLayer,
  derivePasswordValues,
  ensureSodiumReady,
} from "@deepnotes/e2ee";
import { beforeEach, describe, expect, it } from "vitest";
import { nanoid } from "nanoid";

import { buildUserRegisterRequest } from "./build-user-register";
import { loginPreimageFromPassword, uint8ToBase64 } from "./bytes";
import { buildPasswordChangePayload } from "./build-password-and-email-confirm";
import { clearSessionCrypto, readSessionCrypto } from "./crypto-storage";
import {
  applyRefreshToStoredKeyrings,
  extractRawUserKeyringsBase64FromSession,
  persistSessionKeyringsFromLogin,
} from "./session-keyrings";

describe("session keyrings", () => {
  beforeEach(() => {
    clearSessionCrypto();
  });

  it("persistSessionKeyringsFromLogin is a no-op when passwordSalt is missing", async () => {
    await ensureSodiumReady();
    await persistSessionKeyringsFromLogin({
      login: {
        userId: "u1",
        sessionId: "s1",
        sessionKey: uint8ToBase64(randomBytes(32)),
        personalGroupId: "g1",
        publicKeyring: uint8ToBase64(randomBytes(32)),
        encryptedPrivateKeyring: uint8ToBase64(randomBytes(32)),
        encryptedSymmetricKeyring: uint8ToBase64(randomBytes(32)),
      },
      password: "x",
    });
    expect(readSessionCrypto()).toBe(null);
  });

  it("raw login keyrings persist, round-trip through session, and buildPasswordChangePayload", async () => {
    await ensureSodiumReady();
    const password = "correct-horse-battery";
    const reg = await buildUserRegisterRequest({
      email: `${nanoid()}@example.com`,
      password,
    });
    const sessionKey = uint8ToBase64(randomBytes(32));
    const saltB64 = uint8ToBase64(randomBytes(16));

    await persistSessionKeyringsFromLogin({
      login: {
        userId: reg.userId,
        sessionId: nanoid(),
        sessionKey,
        personalGroupId: reg.groupId,
        publicKeyring: reg.userPublicKeyring,
        encryptedPrivateKeyring: reg.userEncryptedPrivateKeyring,
        encryptedSymmetricKeyring: reg.userEncryptedSymmetricKeyring,
        passwordSalt: saltB64,
      },
      password,
    });

    const stored = readSessionCrypto();
    expect(stored?.sessionKeyB64).toBe(sessionKey);
    expect(stored?.userId).toBe(reg.userId);

    const raw = await extractRawUserKeyringsBase64FromSession();
    expect(raw).not.toBe(null);
    expect(raw!.userEncryptedPrivateKeyring).toBe(reg.userEncryptedPrivateKeyring);
    expect(raw!.userEncryptedSymmetricKeyring).toBe(
      reg.userEncryptedSymmetricKeyring,
    );

    const change = await buildPasswordChangePayload({
      oldPassword: password,
      newPassword: "new-strong-pass",
    });
    expect(change.userEncryptedPrivateKeyring).toBe(
      reg.userEncryptedPrivateKeyring,
    );
    expect(change.userEncryptedSymmetricKeyring).toBe(
      reg.userEncryptedSymmetricKeyring,
    );
    expect(change.oldLoginHash).toBe(
      uint8ToBase64(loginPreimageFromPassword(password)),
    );
  });

  it("applyRefreshToStoredKeyrings preserves raw material after extract", async () => {
    await ensureSodiumReady();
    const password = "another-pass-phrase";
    const reg = await buildUserRegisterRequest({
      email: `${nanoid()}@example.com`,
      password,
    });

    await persistSessionKeyringsFromLogin({
      login: {
        userId: reg.userId,
        sessionId: nanoid(),
        sessionKey: uint8ToBase64(randomBytes(32)),
        personalGroupId: reg.groupId,
        publicKeyring: reg.userPublicKeyring,
        encryptedPrivateKeyring: reg.userEncryptedPrivateKeyring,
        encryptedSymmetricKeyring: reg.userEncryptedSymmetricKeyring,
        passwordSalt: uint8ToBase64(randomBytes(16)),
      },
      password,
    });

    const before = await extractRawUserKeyringsBase64FromSession();
    expect(before).not.toBe(null);

    const oldSk = readSessionCrypto()!.sessionKeyB64;
    const newSk = uint8ToBase64(randomBytes(32));
    await applyRefreshToStoredKeyrings({
      oldSessionKey: oldSk,
      newSessionKey: newSk,
    });

    expect(readSessionCrypto()!.sessionKeyB64).toBe(newSk);
    const after = await extractRawUserKeyringsBase64FromSession();
    expect(after).toEqual(before);
  });

  it("unwraps legacy UserPrivate / UserSymmetric outer layers then re-wraps session", async () => {
    await ensureSodiumReady();
    const password = "legacy-style-wrapped";
    const reg = await buildUserRegisterRequest({
      email: `${nanoid()}@example.com`,
      password,
    });
    const salt = randomBytes(16);
    const saltB64 = uint8ToBase64(salt);
    const masterKey = derivePasswordValues({
      password: loginPreimageFromPassword(password),
      salt,
    }).key;

    const privLayered = createPrivateKeyring(
      base64ToBytes(reg.userEncryptedPrivateKeyring),
    ).wrapSymmetric(masterKey, {
      associatedData: {
        context: "UserPrivateKeyring",
        userId: reg.userId,
      },
    });
    const symLayered = createSymmetricKeyring(
      base64ToBytes(reg.userEncryptedSymmetricKeyring),
    ).wrapSymmetric(masterKey, {
      associatedData: {
        context: "UserSymmetricKeyring",
        userId: reg.userId,
      },
    });

    expect(privLayered.topLayer).not.toBe(DataLayer.Raw);
    expect(symLayered.topLayer).not.toBe(DataLayer.Raw);

    await persistSessionKeyringsFromLogin({
      login: {
        userId: reg.userId,
        sessionId: nanoid(),
        sessionKey: uint8ToBase64(randomBytes(32)),
        personalGroupId: reg.groupId,
        publicKeyring: reg.userPublicKeyring,
        encryptedPrivateKeyring: uint8ToBase64(privLayered.wrappedValue),
        encryptedSymmetricKeyring: uint8ToBase64(symLayered.wrappedValue),
        passwordSalt: saltB64,
      },
      password,
    });

    const raw = await extractRawUserKeyringsBase64FromSession();
    expect(raw!.userEncryptedPrivateKeyring).toBe(reg.userEncryptedPrivateKeyring);
    expect(raw!.userEncryptedSymmetricKeyring).toBe(
      reg.userEncryptedSymmetricKeyring,
    );
  });
});
