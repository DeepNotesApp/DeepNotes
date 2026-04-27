import type { DeepnotesDb } from "@deepnotes/db/client";
import { and, eq, gt, or } from "drizzle-orm";
import {
  createPrivateKeyring,
  createSymmetricKeyring,
} from "./crypto/index.js";
import sodium from "libsodium-wrappers-sumo";
import { nanoid } from "nanoid";

import { devices, users } from "@deepnotes/db/schema";

import { cookieOptionsFromEnv } from "./cookies.js";
import { getDeviceHash } from "./device-hash.js";
import type { SessionEnv } from "./env.js";
import { SessionError } from "./errors.js";
import { hashUserEmail } from "./email-hash.js";
import {
  decryptUserRehashedLoginHash,
  derivePasswordValues,
  ensureSodiumReady,
  getPasswordHashValues,
} from "./legacy-crypto.js";
import { createSessionRowAndCookies } from "./session-lifecycle.js";
import { assertTwoFactorOk } from "./two-factor.js";

export type SessionLoginBody = {
  email: string;
  /** Raw login hash bytes (decoded from request base64). */
  loginHash: Uint8Array;
  rememberSession: boolean;
  authenticatorToken?: string;
  rememberDevice?: boolean;
  recoveryCode?: string;
};

function toB64(u: Uint8Array): string {
  return Buffer.from(u).toString("base64");
}

export async function performSessionLogin(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  body: SessionLoginBody;
  clientIp: string;
  userAgent: string;
}): Promise<{ json: Record<string, unknown>; cookieLines: string[] }> {
  await ensureSodiumReady();

  const exceptions = input.env.EMAIL_CASE_SENSITIVITY_EXCEPTIONS ?? "";
  const emailHashBuf = Buffer.from(
    await hashUserEmail(
      input.body.email,
      input.env.USER_EMAIL_SECRET,
      exceptions,
    ),
  );

  const rows = await input.db
    .select({
      id: users.id,
      emailVerified: users.emailVerified,
      encryptedRehashedLoginHash: users.encryptedRehashedLoginHash,
      publicKeyring: users.publicKeyring,
      encryptedPrivateKeyring: users.encryptedPrivateKeyring,
      encryptedSymmetricKeyring: users.encryptedSymmetricKeyring,
      personalGroupId: users.personalGroupId,
      twoFactorAuthEnabled: users.twoFactorAuthEnabled,
      encryptedAuthenticatorSecret: users.encryptedAuthenticatorSecret,
      encryptedRecoveryCodes: users.encryptedRecoveryCodes,
    })
    .from(users)
    .where(
      and(
        eq(users.emailHash, emailHashBuf),
        or(
          eq(users.emailVerified, true),
          gt(users.emailVerificationExpirationDate, new Date().toISOString()),
        ),
      ),
    )
    .limit(1);

  const user = rows[0];
  if (user == null) {
    throw new SessionError(401, "UNAUTHORIZED", "Incorrect email or password.");
  }

  const passwordHashValues = getPasswordHashValues(
    decryptUserRehashedLoginHash(
      new Uint8Array(user.encryptedRehashedLoginHash),
      input.env.USER_REHASHED_LOGIN_HASH_ENCRYPTION_KEY,
    ),
  );

  const passwordValues = derivePasswordValues({
    password: input.body.loginHash,
    salt: passwordHashValues.saltBytes,
  });

  const passwordOk = sodium.memcmp(passwordValues.hash, passwordHashValues.hashBytes);
  if (!passwordOk) {
    throw new SessionError(401, "UNAUTHORIZED", "Incorrect email or password.");
  }

  if (!user.emailVerified) {
    throw new SessionError(
      401,
      "UNAUTHORIZED",
      "Email awaiting verification. New email sent.",
    );
  }

  const cookieOpts = cookieOptionsFromEnv(input.env);

  return await input.db.transaction(async (tx) => {
    const deviceHash = getDeviceHash({
      ip: input.clientIp,
      userAgent: input.userAgent,
      userId: user.id,
    });

    const existingDevice = await tx
      .select({ id: devices.id, trusted: devices.trusted })
      .from(devices)
      .where(
        and(eq(devices.userId, user.id), eq(devices.hash, deviceHash)),
      )
      .limit(1);

    let deviceId: string;
    let deviceTrusted: boolean;
    if (existingDevice[0]) {
      deviceId = existingDevice[0].id;
      deviceTrusted = existingDevice[0].trusted;
    } else {
      deviceId = nanoid();
      await tx.insert(devices).values({
        id: deviceId,
        userId: user.id,
        hash: deviceHash,
        trusted: false,
      });
      deviceTrusted = false;
    }

    if (user.twoFactorAuthEnabled) {
      if (user.encryptedAuthenticatorSecret == null) {
        throw new SessionError(
          500,
          "SERVER_MISCONFIG",
          "Two-factor enabled but authenticator secret is missing.",
        );
      }
      await assertTwoFactorOk({
        tx: tx as unknown as DeepnotesDb,
        user: {
          id: user.id,
          encryptedAuthenticatorSecret: user.encryptedAuthenticatorSecret,
          encryptedRecoveryCodes: user.encryptedRecoveryCodes,
        },
        device: { id: deviceId, trusted: deviceTrusted },
        authenticatorToken: input.body.authenticatorToken,
        recoveryCode: input.body.recoveryCode,
        rememberDevice: input.body.rememberDevice,
        userAuthenticatorKeyB64: input.env.USER_AUTHENTICATOR_SECRET_ENCRYPTION_KEY,
        userRecoveryCodesKeyB64: input.env.USER_RECOVERY_CODES_ENCRYPTION_KEY,
      });
    }

    const sessionId = nanoid();
    const { sessionKey, cookieLines } = await createSessionRowAndCookies({
      db: tx as unknown as DeepnotesDb,
      sessionId,
      userId: user.id,
      deviceId,
      rememberSession: input.body.rememberSession,
      env: input.env,
      cookieOpts,
    });

    const encPriv = createPrivateKeyring(
      new Uint8Array(user.encryptedPrivateKeyring),
    )
      .unwrapSymmetric(passwordValues.key, {
        associatedData: {
          context: "UserEncryptedPrivateKeyring",
          userId: user.id,
        },
      }).wrappedValue;

    const encSym = createSymmetricKeyring(
      new Uint8Array(user.encryptedSymmetricKeyring),
    )
      .unwrapSymmetric(passwordValues.key, {
        associatedData: {
          context: "UserEncryptedSymmetricKeyring",
          userId: user.id,
        },
      }).wrappedValue;

    return {
      json: {
        userId: user.id,
        sessionId,
        sessionKey: toB64(sessionKey),
        personalGroupId: user.personalGroupId,
        publicKeyring: toB64(new Uint8Array(user.publicKeyring)),
        encryptedPrivateKeyring: toB64(encPriv),
        encryptedSymmetricKeyring: toB64(encSym),
      },
      cookieLines,
    };
  });
}
