import type { DeepnotesDb } from "@deepnotes/db/client";
import { users } from "@deepnotes/db/schema";
import { eq } from "drizzle-orm";

import type { SessionEnv } from "./env.js";
import { SessionError } from "./errors.js";
import { getAuthenticatedUserSummary } from "./user-me.js";

/** Public keyring bytes for E2EE (invitations, etc.); any authenticated user may read. */
export async function performGetUserPublicKeyring(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  userId: string;
}): Promise<{ publicKeyring: Buffer }> {
  await getAuthenticatedUserSummary(input);

  const [row] = await input.db
    .select({ publicKeyring: users.publicKeyring })
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);

  if (row == null) {
    throw new SessionError(404, "NOT_FOUND", "User not found.");
  }

  return { publicKeyring: row.publicKeyring };
}
