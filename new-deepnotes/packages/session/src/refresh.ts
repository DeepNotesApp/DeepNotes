import type { DeepnotesDb } from "@deepnotes/db/client";
import { and, eq } from "drizzle-orm";

import { sessions } from "@deepnotes/db/schema";

import { cookieOptionsFromEnv } from "./cookies.js";
import type { SessionEnv } from "./env.js";
import { SessionError } from "./errors.js";
import {
  decodeRefreshTokenUnsafe,
  verifyRefreshToken,
} from "./jwt.js";
import { ensureSodiumReady } from "./legacy-crypto.js";
import { rotateSessionRowAndCookies } from "./session-lifecycle.js";

export async function performSessionRefresh(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  refreshCookie: string | undefined;
  loggedInCookie: string | undefined;
}): Promise<{ json: Record<string, unknown>; cookieLines: string[] }> {
  await ensureSodiumReady();

  if (input.loggedInCookie !== "true") {
    throw new SessionError(401, "UNAUTHORIZED", "User not logged in.");
  }
  if (input.refreshCookie == null || input.refreshCookie === "") {
    throw new SessionError(401, "UNAUTHORIZED", "No refresh token received.");
  }

  const payload = await verifyRefreshToken(
    input.refreshCookie,
    input.env.REFRESH_SECRET,
  );

  if (payload == null) {
    const decoded = decodeRefreshTokenUnsafe(input.refreshCookie);
    if (decoded != null) {
      await input.db
        .update(sessions)
        .set({ invalidated: true })
        .where(eq(sessions.id, decoded.sid));
    }
    throw new SessionError(401, "UNAUTHORIZED", "Invalid refresh token.");
  }

  const sessionRows = await input.db
    .select({
      id: sessions.id,
      userId: sessions.userId,
      invalidated: sessions.invalidated,
      expirationDate: sessions.expirationDate,
      encryptionKey: sessions.encryptionKey,
    })
    .from(sessions)
    .where(
      and(
        eq(sessions.refreshCode, payload.rfc),
        eq(sessions.id, payload.sid),
      ),
    )
    .limit(1);

  const session = sessionRows[0];
  const now = new Date().toISOString();
  if (
    session == null ||
    session.invalidated ||
    session.expirationDate < now
  ) {
    throw new SessionError(401, "UNAUTHORIZED", "Session was invalidated.");
  }

  const cookieOpts = cookieOptionsFromEnv(input.env);
  const { sessionKey, cookieLines, oldSessionKey } =
    await rotateSessionRowAndCookies({
      db: input.db,
      sessionId: session.id,
      userId: session.userId,
      rememberSession: payload.rms,
      env: input.env,
      cookieOpts,
    });

  return {
    json: {
      oldSessionKey: Buffer.from(oldSessionKey).toString("base64"),
      newSessionKey: Buffer.from(sessionKey).toString("base64"),
    },
    cookieLines,
  };
}
