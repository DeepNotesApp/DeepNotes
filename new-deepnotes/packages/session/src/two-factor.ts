import type { DeepnotesDb } from "@deepnotes/db/client";
import { eq } from "drizzle-orm";
import { authenticator } from "otplib";

import { devices, users } from "@deepnotes/db/schema";

import { incrementFailedLoginAttempts } from "./login-rate-limit.js";
import type { SessionRedisPort } from "./login-rate-limit.js";
import { SessionError } from "./errors.js";
import {
  decryptRecoveryCodes,
  decryptUserAuthenticatorSecret,
  encryptRecoveryCodes,
  verifyRecoveryCode,
} from "./crypto/session-crypto.js";

type User2faRow = {
  id: string;
  /** Required when caller enables the 2FA branch. */
  encryptedAuthenticatorSecret: Buffer;
  encryptedRecoveryCodes: Buffer | null;
};

export async function assertTwoFactorOk(input: {
  tx: DeepnotesDb;
  user: User2faRow;
  device: { id: string; trusted: boolean };
  authenticatorToken: string | undefined;
  recoveryCode: string | undefined;
  rememberDevice: boolean | undefined;
  userAuthenticatorKeyB64: string;
  userRecoveryCodesKeyB64: string;
  /** When set, increments failed-login counters on bad token / recovery (legacy `sessions.login`). */
  failedLoginRateLimit?: {
    redis: SessionRedisPort;
    email: string;
    ip: string;
  };
}): Promise<void> {
  if (input.device.trusted) {
    return;
  }

  if (input.authenticatorToken != null) {
    const secret = decryptUserAuthenticatorSecret(
      new Uint8Array(input.user.encryptedAuthenticatorSecret),
      input.userAuthenticatorKeyB64,
    );
    if (authenticator.check(input.authenticatorToken, secret)) {
      if (input.rememberDevice) {
        await input.tx
          .update(devices)
          .set({ trusted: true })
          .where(eq(devices.id, input.device.id));
      }
      return;
    }
    if (input.failedLoginRateLimit != null) {
      await incrementFailedLoginAttempts(
        input.failedLoginRateLimit.redis,
        input.failedLoginRateLimit.email,
        input.failedLoginRateLimit.ip,
      );
    }
    throw new SessionError(401, "UNAUTHORIZED", "Invalid authenticator token.");
  }

  if (input.recoveryCode != null) {
    if (input.user.encryptedRecoveryCodes == null) {
      if (input.failedLoginRateLimit != null) {
        await incrementFailedLoginAttempts(
          input.failedLoginRateLimit.redis,
          input.failedLoginRateLimit.email,
          input.failedLoginRateLimit.ip,
        );
      }
      throw new SessionError(401, "UNAUTHORIZED", "Invalid recovery code.");
    }
    const recoveryCodes = decryptRecoveryCodes(
      new Uint8Array(input.user.encryptedRecoveryCodes),
      input.userRecoveryCodesKeyB64,
    );

    for (let i = 0; i < recoveryCodes.length; i++) {
      if (verifyRecoveryCode(input.recoveryCode, recoveryCodes[i]!)) {
        recoveryCodes.splice(i, 1);
        await input.tx
          .update(users)
          .set({
            encryptedRecoveryCodes: Buffer.from(
              encryptRecoveryCodes(recoveryCodes, input.userRecoveryCodesKeyB64),
            ),
          })
          .where(eq(users.id, input.user.id));
        return;
      }
    }

    if (input.failedLoginRateLimit != null) {
      await incrementFailedLoginAttempts(
        input.failedLoginRateLimit.redis,
        input.failedLoginRateLimit.email,
        input.failedLoginRateLimit.ip,
      );
    }
    throw new SessionError(401, "UNAUTHORIZED", "Invalid recovery code.");
  }

  throw new SessionError(
    401,
    "UNAUTHORIZED",
    "Requires two-factor authentication.",
  );
}
