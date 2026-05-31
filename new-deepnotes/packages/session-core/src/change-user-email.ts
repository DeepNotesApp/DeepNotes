import type { DeepnotesDb } from "@deepnotes/db/client";
import { eq } from "drizzle-orm";
import sodium from "libsodium-wrappers-sumo";

import { sessions, users } from "@deepnotes/db/schema";

import {
  createPrivateKeyring,
  createSymmetricKeyring,
  getPasswordHashValues,
} from "./crypto/index.js";
import { encodePasswordHash } from "./crypto/password-hashing.js";
import {
  decryptUserRehashedLoginHash,
  derivePasswordValues,
  encryptUserRehashedLoginHash,
  ensureSodiumReady,
} from "./crypto/session-crypto.js";
import { buildClearSessionCookies, cookieOptionsFromEnv } from "./cookies.js";
import { decryptUserEmail, encryptUserEmail } from "./encrypt-user-email.js";
import { hashUserEmail } from "./email-hash.js";
import type { SessionEnv } from "./env.js";
import { SessionError } from "./errors.js";
import { verifyAccessToken } from "./jwt.js";
import { sendEmailChangeVerificationEmail } from "./send-email-change-code.js";

function toBuf(u: Uint8Array): Buffer {
  return Buffer.from(u);
}

/**
 * `users.account.emailChange.request` (tRPC): password check, non-demo, new email
 * not in use, stores `encrypted_new_email` + 6-digit `email_verification_code`, sends email.
 */
export async function performUserEmailChangeRequest(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  oldLoginHash: Uint8Array;
  newEmail: string;
}): Promise<{ devEmailVerificationCode?: string }> {
  await ensureSodiumReady();

  if (input.accessCookie == null || input.accessCookie === "") {
    throw new SessionError(401, "UNAUTHORIZED", "No access token.");
  }
  const payload = await verifyAccessToken(
    input.accessCookie,
    input.env.ACCESS_SECRET,
  );
  if (payload == null) {
    throw new SessionError(401, "UNAUTHORIZED", "Invalid access token.");
  }
  const userId = payload.uid;

  const userRows = await input.db
    .select({
      id: users.id,
      demo: users.demo,
      encryptedRehashedLoginHash: users.encryptedRehashedLoginHash,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const userRow = userRows[0];
  if (userRow == null) {
    throw new SessionError(404, "NOT_FOUND", "User not found.");
  }
  if (userRow.demo === true) {
    throw new SessionError(
      403,
      "FORBIDDEN",
      "This action is unavailable for demo accounts.",
    );
  }

  const passwordHashValues = getPasswordHashValues(
    decryptUserRehashedLoginHash(
      new Uint8Array(userRow.encryptedRehashedLoginHash),
      input.env.USER_REHASHED_LOGIN_HASH_ENCRYPTION_KEY,
    ),
  );
  const passwordValues = derivePasswordValues({
    password: input.oldLoginHash,
    salt: passwordHashValues.saltBytes,
  });
  if (!sodium.memcmp(passwordValues.hash, passwordHashValues.hashBytes)) {
    throw new SessionError(400, "BAD_REQUEST", "Password is incorrect.");
  }

  const exceptions = input.env.EMAIL_CASE_SENSITIVITY_EXCEPTIONS ?? "";
  const newEmail = input.newEmail.trim();
  if (newEmail.length === 0) {
    throw new SessionError(400, "BAD_REQUEST", "Invalid email.");
  }
  const normalized = exceptions.split(";").includes(newEmail)
    ? newEmail
    : newEmail.toLowerCase();

  const newEmailHash = Buffer.from(
    await hashUserEmail(normalized, input.env.USER_EMAIL_SECRET, exceptions),
  );

  // Legacy checks global `email_hash` (includes current user — re-entering the same address fails).
  const inUse = await input.db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.emailHash, newEmailHash))
    .limit(1);
  if (inUse.length > 0) {
    throw new SessionError(400, "BAD_REQUEST", "Email is already in use");
  }

  const u32 = crypto.getRandomValues(new Uint32Array(1))[0]!;
  const codeNum = u32 % 1_000_000;
  const emailVerificationCode = String(codeNum).padStart(6, "0");

  const encNew = encryptUserEmail(
    normalized,
    input.env.USER_EMAIL_ENCRYPTION_KEY,
    exceptions,
  );

  const updated = await input.db
    .update(users)
    .set({
      encryptedNewEmail: toBuf(encNew),
      emailVerificationCode: emailVerificationCode,
    })
    .where(eq(users.id, userId))
    .returning({ id: users.id });
  if (updated.length !== 1) {
    throw new SessionError(500, "SERVER_MISCONFIG", "Failed to set email change state.");
  }

  if (input.env.SEND_EMAILS === "false") {
    return { devEmailVerificationCode: emailVerificationCode };
  }

  await sendEmailChangeVerificationEmail({
    env: input.env,
    toEmail: normalized,
    emailVerificationCode,
  });

  return {};
}

/**
 * `users.account.emailChange.finish` (WS steps 1+2) as one call: 6-digit code, old+new
 * password, keyrings re-wrapped; writes new `encrypted_email` / `email_hash`, clears pending
 * change, invalidates sessions, clears cookies; optional Stripe `customers.update` email.
 */
export async function performUserEmailChangeConfirm(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  oldLoginHash: Uint8Array;
  emailVerificationCode: string;
  newLoginHash: Uint8Array;
  newEncryptedPrivateKeyring: Uint8Array;
  newEncryptedSymmetricKeyring: Uint8Array;
  updateStripeCustomerEmail?: (
    customerId: string,
    email: string,
  ) => Promise<void>;
}): Promise<{ cookieLines: string[] }> {
  await ensureSodiumReady();
  const cookieOpts = cookieOptionsFromEnv(input.env);

  if (input.accessCookie == null || input.accessCookie === "") {
    throw new SessionError(401, "UNAUTHORIZED", "No access token.");
  }
  const payload = await verifyAccessToken(
    input.accessCookie,
    input.env.ACCESS_SECRET,
  );
  if (payload == null) {
    throw new SessionError(401, "UNAUTHORIZED", "Invalid access token.");
  }
  const userId = payload.uid;

  const userRows = await input.db
    .select({
      id: users.id,
      demo: users.demo,
      customerId: users.customerId,
      emailVerificationCode: users.emailVerificationCode,
      encryptedNewEmail: users.encryptedNewEmail,
      encryptedRehashedLoginHash: users.encryptedRehashedLoginHash,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const u = userRows[0];
  if (u == null) {
    throw new SessionError(404, "NOT_FOUND", "User not found.");
  }
  if (u.demo === true) {
    throw new SessionError(
      403,
      "FORBIDDEN",
      "This action is unavailable for demo accounts.",
    );
  }
  if (u.emailVerificationCode !== input.emailVerificationCode) {
    throw new SessionError(
      400,
      "BAD_REQUEST",
      "Invalid email verification code.",
    );
  }
  if (u.encryptedNewEmail == null) {
    throw new SessionError(
      400,
      "BAD_REQUEST",
      "No email change requested.",
    );
  }

  const passwordHashValues = getPasswordHashValues(
    decryptUserRehashedLoginHash(
      new Uint8Array(u.encryptedRehashedLoginHash),
      input.env.USER_REHASHED_LOGIN_HASH_ENCRYPTION_KEY,
    ),
  );
  const passwordCheck = derivePasswordValues({
    password: input.oldLoginHash,
    salt: passwordHashValues.saltBytes,
  });
  if (!sodium.memcmp(passwordCheck.hash, passwordHashValues.hashBytes)) {
    throw new SessionError(400, "BAD_REQUEST", "Password is incorrect.");
  }

  const exceptions = input.env.EMAIL_CASE_SENSITIVITY_EXCEPTIONS ?? "";
  const newEmail = decryptUserEmail(
    new Uint8Array(u.encryptedNewEmail),
    input.env.USER_EMAIL_ENCRYPTION_KEY,
    exceptions,
  );

  const newEmailHash = Buffer.from(
    await hashUserEmail(newEmail, input.env.USER_EMAIL_SECRET, exceptions),
  );

  const newPw = derivePasswordValues({ password: input.newLoginHash });
  const encodedRehash = encodePasswordHash(newPw.hash, newPw.salt, 2, 32);
  const encryptedRehashedLoginHash = toBuf(
    encryptUserRehashedLoginHash(
      encodedRehash,
      input.env.USER_REHASHED_LOGIN_HASH_ENCRYPTION_KEY,
    ),
  );
  const encryptedEmailStored = toBuf(
    encryptUserEmail(
      newEmail,
      input.env.USER_EMAIL_ENCRYPTION_KEY,
      exceptions,
    ),
  );

  let encryptedPrivateStored: Buffer;
  let encryptedSymmetricStored: Buffer;
  try {
    encryptedPrivateStored = toBuf(
      createPrivateKeyring(input.newEncryptedPrivateKeyring)
        .wrapSymmetric(newPw.key, {
          associatedData: {
            context: "UserEncryptedPrivateKeyring",
            userId,
          },
        }).wrappedValue,
    );
    encryptedSymmetricStored = toBuf(
      createSymmetricKeyring(input.newEncryptedSymmetricKeyring)
        .wrapSymmetric(newPw.key, {
          associatedData: {
            context: "UserEncryptedSymmetricKeyring",
            userId,
          },
        }).wrappedValue,
    );
  } catch {
    throw new SessionError(
      400,
      "BAD_REQUEST",
      "Invalid keyring material for the new password.",
    );
  }

  const customerId = u.customerId;

  await input.db.transaction(async (tx) => {
    const updated = await tx
      .update(users)
      .set({
        encryptedEmail: encryptedEmailStored,
        emailHash: newEmailHash,
        encryptedNewEmail: null,
        emailVerificationCode: null,
        encryptedRehashedLoginHash,
        encryptedPrivateKeyring: encryptedPrivateStored,
        encryptedSymmetricKeyring: encryptedSymmetricStored,
      })
      .where(eq(users.id, userId))
      .returning({ id: users.id });

    if (updated.length !== 1) {
      throw new SessionError(
        500,
        "SERVER_MISCONFIG",
        "Email change did not apply.",
      );
    }
    await tx
      .update(sessions)
      .set({ invalidated: true })
      .where(eq(sessions.userId, userId));
  });

  const stripe = input.updateStripeCustomerEmail;
  if (
    customerId != null &&
    customerId.length > 0 &&
    stripe != null
  ) {
    try {
      await stripe(customerId, newEmail);
    } catch {
      // match legacy: non-fatal; account email is already updated in DB
    }
  }

  return { cookieLines: buildClearSessionCookies(cookieOpts) };
}
