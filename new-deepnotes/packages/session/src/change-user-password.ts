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
import type { SessionEnv } from "./env.js";
import { SessionError } from "./errors.js";
import { verifyAccessToken } from "./jwt.js";

function toBuf(u: Uint8Array): Buffer {
  return Buffer.from(u);
}

/**
 * Replaces legacy `users.account.changePassword` (WS step 2) + session invalidation.
 * Verifies `oldLoginHash`, stores PHC + keyrings for `newLoginHash`, invalidates
 * all sessions, clears cookies (re-login with new password).
 */
export async function performUserPasswordChange(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  oldLoginHash: Uint8Array;
  newLoginHash: Uint8Array;
  newEncryptedPrivateKeyring: Uint8Array;
  newEncryptedSymmetricKeyring: Uint8Array;
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

  const newPw = derivePasswordValues({ password: input.newLoginHash });
  const encodedRehash = encodePasswordHash(
    newPw.hash,
    newPw.salt,
    2,
    32,
  );
  const encryptedRehashedLoginHash = toBuf(
    encryptUserRehashedLoginHash(
      encodedRehash,
      input.env.USER_REHASHED_LOGIN_HASH_ENCRYPTION_KEY,
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

  await input.db.transaction(async (tx) => {
    const updated = await tx
      .update(users)
      .set({
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
        "Password update did not apply.",
      );
    }

    await tx
      .update(sessions)
      .set({ invalidated: true })
      .where(eq(sessions.userId, userId));
  });

  return { cookieLines: buildClearSessionCookies(cookieOpts) };
}
