import type { DeepnotesDb } from "@deepnotes/db/client";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

import { sessions } from "@deepnotes/db/schema";

import { buildSessionCookies } from "./cookies.js";
import type { CookieBuildOptions } from "./cookies.js";
import type { SessionEnv } from "./env.js";
import { signAccessToken, signRefreshToken } from "./jwt.js";
import { addDays } from "./datetime.js";
import { getRandomBytes, KEY_SIZE } from "@deepnotes/e2ee";

export async function createSessionRowAndCookies(input: {
  db: DeepnotesDb;
  sessionId: string;
  userId: string;
  deviceId: string;
  rememberSession: boolean;
  env: SessionEnv;
  cookieOpts: CookieBuildOptions;
}): Promise<{
  sessionKey: Uint8Array;
  refreshCode: string;
  cookieLines: string[];
}> {
  const sessionKey = getRandomBytes(KEY_SIZE);
  const refreshCode = nanoid();
  const expirationDate = addDays(new Date(), 7).toISOString();

  await input.db.insert(sessions).values({
    id: input.sessionId,
    userId: input.userId,
    deviceId: input.deviceId,
    encryptionKey: Buffer.from(sessionKey),
    refreshCode,
    expirationDate,
    invalidated: false,
  });

  const accessToken = await signAccessToken({
    secret: input.env.ACCESS_SECRET,
    userId: input.userId,
    sessionId: input.sessionId,
  });
  const refreshToken = await signRefreshToken({
    secret: input.env.REFRESH_SECRET,
    sessionId: input.sessionId,
    refreshCode,
    rememberSession: input.rememberSession,
  });

  const cookieLines = buildSessionCookies({
    opts: input.cookieOpts,
    accessToken,
    refreshToken,
    rememberSession: input.rememberSession,
  });

  return { sessionKey, refreshCode, cookieLines };
}

export async function rotateSessionRowAndCookies(input: {
  db: DeepnotesDb;
  sessionId: string;
  userId: string;
  rememberSession: boolean;
  env: SessionEnv;
  cookieOpts: CookieBuildOptions;
}): Promise<{
  sessionKey: Uint8Array;
  cookieLines: string[];
  oldSessionKey: Uint8Array;
}> {
  const sessionKey = getRandomBytes(KEY_SIZE);
  const refreshCode = nanoid();
  const expirationDate = addDays(new Date(), 7).toISOString();

  const existing = await input.db
    .select({ encryptionKey: sessions.encryptionKey })
    .from(sessions)
    .where(eq(sessions.id, input.sessionId))
    .limit(1);
  const oldRow = existing[0];
  if (oldRow?.encryptionKey == null) {
    throw new Error("Session row missing for refresh.");
  }
  const oldSessionKey = new Uint8Array(oldRow.encryptionKey);

  await input.db
    .update(sessions)
    .set({
      encryptionKey: Buffer.from(sessionKey),
      refreshCode,
      lastRefreshDate: new Date().toISOString(),
      expirationDate,
    })
    .where(eq(sessions.id, input.sessionId));

  const accessToken = await signAccessToken({
    secret: input.env.ACCESS_SECRET,
    userId: input.userId,
    sessionId: input.sessionId,
  });
  const refreshToken = await signRefreshToken({
    secret: input.env.REFRESH_SECRET,
    sessionId: input.sessionId,
    refreshCode,
    rememberSession: input.rememberSession,
  });

  const cookieLines = buildSessionCookies({
    opts: input.cookieOpts,
    accessToken,
    refreshToken,
    rememberSession: input.rememberSession,
  });

  return { sessionKey, cookieLines, oldSessionKey };
}
