import type { DeepnotesDb } from "@deepnotes/db/client";
import { eq } from "drizzle-orm";

import { users } from "@deepnotes/db/schema";

import type { SessionEnv } from "./env.js";
import { SessionError } from "./errors.js";
import { verifyAccessToken } from "./jwt.js";
import { bytesToBase64 } from "./crypto/bytes.js";

export type AuthenticatedUserSummary = {
  userId: string;
  emailVerified: boolean;
  demo: boolean;
  personalGroupId: string;
  encryptedDefaultNote: string;
  encryptedDefaultArrow: string;
};

export async function getAuthenticatedUserSummary(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
}): Promise<AuthenticatedUserSummary> {
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

  const rows = await input.db
    .select({
      id: users.id,
      emailVerified: users.emailVerified,
      demo: users.demo,
      personalGroupId: users.personalGroupId,
      encryptedDefaultNote: users.encryptedDefaultNote,
      encryptedDefaultArrow: users.encryptedDefaultArrow,
    })
    .from(users)
    .where(eq(users.id, payload.uid))
    .limit(1);

  const row = rows[0];
  if (row == null) {
    throw new SessionError(401, "UNAUTHORIZED", "User not found.");
  }

  return {
    userId: row.id,
    emailVerified: row.emailVerified,
    demo: row.demo ?? false,
    personalGroupId: row.personalGroupId,
    encryptedDefaultNote: bytesToBase64(
      new Uint8Array(row.encryptedDefaultNote),
    ),
    encryptedDefaultArrow: bytesToBase64(
      new Uint8Array(row.encryptedDefaultArrow),
    ),
  };
}

/**
 * Legacy `optionalAuthProcedure`: missing/invalid JWT yields `null` (not 401).
 * Invalid user id in DB yields `null`.
 */
export async function tryGetAuthenticatedUserSummary(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
}): Promise<AuthenticatedUserSummary | null> {
  if (input.accessCookie == null || input.accessCookie === "") {
    return null;
  }

  const payload = await verifyAccessToken(
    input.accessCookie,
    input.env.ACCESS_SECRET,
  );
  if (payload == null) {
    return null;
  }

  const rows = await input.db
    .select({
      id: users.id,
      emailVerified: users.emailVerified,
      demo: users.demo,
      personalGroupId: users.personalGroupId,
      encryptedDefaultNote: users.encryptedDefaultNote,
      encryptedDefaultArrow: users.encryptedDefaultArrow,
    })
    .from(users)
    .where(eq(users.id, payload.uid))
    .limit(1);

  const row = rows[0];
  if (row == null) {
    return null;
  }

  return {
    userId: row.id,
    emailVerified: row.emailVerified,
    demo: row.demo ?? false,
    personalGroupId: row.personalGroupId,
    encryptedDefaultNote: bytesToBase64(
      new Uint8Array(row.encryptedDefaultNote),
    ),
    encryptedDefaultArrow: bytesToBase64(
      new Uint8Array(row.encryptedDefaultArrow),
    ),
  };
}
