import type { DeepnotesDb } from "@deepnotes/db/client";
import { eq } from "drizzle-orm";
import { authenticator } from "otplib";

import { devices, users } from "@deepnotes/db/schema";

import { getPasswordHashValues } from "./crypto/index.js";
import { decryptUserEmail } from "./encrypt-user-email.js";
import {
  decryptUserAuthenticatorSecret,
  decryptUserRehashedLoginHash,
  derivePasswordValues,
  encryptRecoveryCodes,
  encryptUserAuthenticatorSecret,
  ensureSodiumReady,
  hashRecoveryCode,
} from "./crypto/session-crypto.js";
import type { SessionEnv } from "./env.js";
import { SessionError } from "./errors.js";
import { verifyAccessToken } from "./jwt.js";
import { getRandomBytes } from "@deepnotes/e2ee";

function toBuf(u: Uint8Array): Buffer {
  return Buffer.from(u);
}

async function requireUserId(
  accessCookie: string | undefined,
  accessSecret: string,
): Promise<string> {
  if (accessCookie == null || accessCookie === "") {
    throw new SessionError(401, "UNAUTHORIZED", "No access token.");
  }
  const payload = await verifyAccessToken(accessCookie, accessSecret);
  if (payload == null) {
    throw new SessionError(401, "UNAUTHORIZED", "Invalid access token.");
  }
  return payload.uid;
}

async function assertPasswordAndLoadUser(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  userId: string;
  loginHash: Uint8Array;
}) {
  await ensureSodiumReady();
  const userRows = await input.db
    .select({
      id: users.id,
      twoFactorAuthEnabled: users.twoFactorAuthEnabled,
      encryptedAuthenticatorSecret: users.encryptedAuthenticatorSecret,
      encryptedRecoveryCodes: users.encryptedRecoveryCodes,
      encryptedRehashedLoginHash: users.encryptedRehashedLoginHash,
      encryptedEmail: users.encryptedEmail,
    })
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);

  const userRow = userRows[0];
  if (userRow == null) {
    throw new SessionError(404, "NOT_FOUND", "User not found.");
  }

  const passwordHashValues = getPasswordHashValues(
    decryptUserRehashedLoginHash(
      new Uint8Array(userRow.encryptedRehashedLoginHash),
      input.env.USER_REHASHED_LOGIN_HASH_ENCRYPTION_KEY,
    ),
  );
  const passwordValues = derivePasswordValues({
    password: input.loginHash,
    salt: passwordHashValues.saltBytes,
  });
  const { timingSafeEqual } = require('node:crypto');
  if (!timingSafeEqual(Buffer.from(passwordValues.hash), Buffer.from(passwordHashValues.hashBytes))) {
    throw new SessionError(400, "BAD_REQUEST", "Password is incorrect.");
  }
  return userRow;
}

const emailEx = (env: SessionEnv) => env.EMAIL_CASE_SENSITIVITY_EXCEPTIONS ?? "";

/**
 * `POST /api/users/me/2fa/enable/request` — store pending TOTP secret, return
 * raw secret + otpauth URI (legacy `users.account.twoFactorAuth.enable.request`).
 */
export async function performUserTwoFactorEnableRequest(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  loginHash: Uint8Array;
}): Promise<{ secret: string; keyUri: string }> {
  const userId = await requireUserId(
    input.accessCookie,
    input.env.ACCESS_SECRET,
  );
  const userRow = await assertPasswordAndLoadUser({ ...input, userId });

  if (userRow.twoFactorAuthEnabled) {
    throw new SessionError(
      400,
      "BAD_REQUEST",
      "Two factor authentication is already enabled.",
    );
  }

  const authenticatorSecret = authenticator.generateSecret();
  const enc = encryptUserAuthenticatorSecret(
    authenticatorSecret,
    input.env.USER_AUTHENTICATOR_SECRET_ENCRYPTION_KEY,
  );

  const updated = await input.db
    .update(users)
    .set({
      encryptedAuthenticatorSecret: toBuf(enc),
    })
    .where(eq(users.id, userId))
    .returning({ id: users.id });
  if (updated.length !== 1) {
    throw new SessionError(500, "SERVER_MISCONFIG", "2FA request did not apply.");
  }

  const email = decryptUserEmail(
    new Uint8Array(userRow.encryptedEmail),
    input.env.USER_EMAIL_ENCRYPTION_KEY,
    emailEx(input.env),
  );
  return {
    secret: authenticatorSecret,
    keyUri: authenticator.keyuri(email, "DeepNotes", authenticatorSecret),
  };
}

/**
 * `POST /api/users/me/2fa/enable/finish` — verify 6-digit code, enable 2FA, store recovery codes.
 */
export async function performUserTwoFactorEnableFinish(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  loginHash: Uint8Array;
  authenticatorToken: string;
}): Promise<{ recoveryCodes: string[] }> {
  const userId = await requireUserId(
    input.accessCookie,
    input.env.ACCESS_SECRET,
  );
  const userRow = await assertPasswordAndLoadUser({ ...input, userId });

  if (userRow.twoFactorAuthEnabled) {
    throw new SessionError(
      400,
      "BAD_REQUEST",
      "Two factor authentication is already enabled.",
    );
  }
  if (userRow.encryptedAuthenticatorSecret == null) {
    throw new SessionError(
      400,
      "BAD_REQUEST",
      "Two-factor authentication is not enabled.",
    );
  }

  const authSecret = decryptUserAuthenticatorSecret(
    new Uint8Array(userRow.encryptedAuthenticatorSecret),
    input.env.USER_AUTHENTICATOR_SECRET_ENCRYPTION_KEY,
  );
  if (!authenticator.check(input.authenticatorToken, authSecret)) {
    throw new SessionError(
      400,
      "BAD_REQUEST",
      "Authenticator token is incorrect.",
    );
  }

  await ensureSodiumReady();
  const recoveryCodes = Array.from({ length: 6 }, () =>
    Buffer.from(getRandomBytes(16)).toString('hex'),
  );
  const hashed = recoveryCodes.map((c) => hashRecoveryCode(c));
  const encRecovery = encryptRecoveryCodes(
    hashed,
    input.env.USER_RECOVERY_CODES_ENCRYPTION_KEY,
  );

  const updated = await input.db
    .update(users)
    .set({
      twoFactorAuthEnabled: true,
      encryptedRecoveryCodes: toBuf(encRecovery),
    })
    .where(eq(users.id, userId))
    .returning({ id: users.id });
  if (updated.length !== 1) {
    throw new SessionError(500, "SERVER_MISCONFIG", "2FA finish did not apply.");
  }

  return { recoveryCodes };
}

/**
 * `POST /api/users/me/2fa/load` — returns TOTP secret + key URI (password in JSON; legacy `load` tRPC with loginHash).
 */
export async function performUserTwoFactorLoad(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  loginHash: Uint8Array;
}): Promise<{ secret: string; keyUri: string }> {
  const userId = await requireUserId(
    input.accessCookie,
    input.env.ACCESS_SECRET,
  );
  const userRow = await assertPasswordAndLoadUser({ ...input, userId });

  if (!userRow.twoFactorAuthEnabled || userRow.encryptedAuthenticatorSecret == null) {
    throw new SessionError(
      400,
      "BAD_REQUEST",
      "Two factor authentication is not enabled.",
    );
  }

  const email = decryptUserEmail(
    new Uint8Array(userRow.encryptedEmail),
    input.env.USER_EMAIL_ENCRYPTION_KEY,
    emailEx(input.env),
  );
  const secret = decryptUserAuthenticatorSecret(
    new Uint8Array(userRow.encryptedAuthenticatorSecret),
    input.env.USER_AUTHENTICATOR_SECRET_ENCRYPTION_KEY,
  );
  return {
    secret,
    keyUri: authenticator.keyuri(email, "DeepNotes", secret),
  };
}

/**
 * `POST /api/users/me/2fa/recovery-codes` — replace recovery codes.
 */
export async function performUserTwoFactorGenerateRecoveryCodes(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  loginHash: Uint8Array;
}): Promise<{ recoveryCodes: string[] }> {
  const userId = await requireUserId(
    input.accessCookie,
    input.env.ACCESS_SECRET,
  );
  const userRow = await assertPasswordAndLoadUser({ ...input, userId });

  if (!userRow.twoFactorAuthEnabled) {
    throw new SessionError(
      400,
      "BAD_REQUEST",
      "Two factor authentication is not enabled.",
    );
  }

  await ensureSodiumReady();
  const recoveryCodes = Array.from({ length: 6 }, () =>
    Buffer.from(getRandomBytes(16)).toString('hex'),
  );
  const encRecovery = encryptRecoveryCodes(
    recoveryCodes.map((c) => hashRecoveryCode(c)),
    input.env.USER_RECOVERY_CODES_ENCRYPTION_KEY,
  );
  const updated = await input.db
    .update(users)
    .set({
      encryptedRecoveryCodes: toBuf(encRecovery),
    })
    .where(eq(users.id, userId))
    .returning({ id: users.id });
  if (updated.length !== 1) {
    throw new SessionError(
      500,
      "SERVER_MISCONFIG",
      "Recovery code rotation did not apply.",
    );
  }
  return { recoveryCodes };
}

/**
 * `POST /api/users/me/2fa/devices/forget` — set `devices.trusted = false` for this user.
 */
export async function performUserTwoFactorForgetDevices(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  loginHash: Uint8Array;
}): Promise<void> {
  const userId = await requireUserId(
    input.accessCookie,
    input.env.ACCESS_SECRET,
  );
  const userRow = await assertPasswordAndLoadUser({ ...input, userId });
  if (!userRow.twoFactorAuthEnabled) {
    throw new SessionError(
      400,
      "BAD_REQUEST",
      "Two factor authentication is not enabled.",
    );
  }
  await input.db
    .update(devices)
    .set({ trusted: false })
    .where(eq(devices.userId, userId));
}

/**
 * `POST /api/users/me/2fa/disable` — turn off 2FA and clear secrets.
 */
export async function performUserTwoFactorDisable(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  loginHash: Uint8Array;
}): Promise<void> {
  const userId = await requireUserId(
    input.accessCookie,
    input.env.ACCESS_SECRET,
  );
  const userRow = await assertPasswordAndLoadUser({ ...input, userId });
  if (!userRow.twoFactorAuthEnabled) {
    throw new SessionError(
      400,
      "BAD_REQUEST",
      "Two factor authentication is not enabled.",
    );
  }
  await input.db
    .update(users)
    .set({
      twoFactorAuthEnabled: false,
      encryptedAuthenticatorSecret: null,
      encryptedRecoveryCodes: null,
    })
    .where(eq(users.id, userId));
}
