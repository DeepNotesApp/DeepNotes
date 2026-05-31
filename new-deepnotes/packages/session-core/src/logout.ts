import type { DeepnotesDb } from "@deepnotes/db/client";
import { eq } from "drizzle-orm";

import { sessions } from "@deepnotes/db/schema";

import { buildClearSessionCookies, cookieOptionsFromEnv } from "./cookies.js";
import type { SessionEnv } from "./env.js";
import { verifyAccessToken } from "./jwt.js";

export async function performSessionLogout(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
}): Promise<{ cookieLines: string[] }> {
  const cookieOpts = cookieOptionsFromEnv(input.env);

  if (input.accessCookie) {
    const payload = await verifyAccessToken(
      input.accessCookie,
      input.env.ACCESS_SECRET,
    );
    if (payload != null) {
      await input.db
        .update(sessions)
        .set({ invalidated: true })
        .where(eq(sessions.id, payload.sid));
    }
  }

  return {
    cookieLines: buildClearSessionCookies(cookieOpts),
  };
}
