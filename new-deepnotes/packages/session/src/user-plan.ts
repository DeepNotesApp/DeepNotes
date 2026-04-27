import type { DeepnotesDb } from "@deepnotes/db/client";
import { users } from "@deepnotes/db/schema";
import { eq } from "drizzle-orm";

import { SessionError } from "./errors.js";

/**
 * Replaces legacy `assertUserSubscribed` for Pro-only tRPC (group password, privacy, …).
 */
export async function assertUserProPlan(input: {
  db: DeepnotesDb;
  userId: string;
}): Promise<void> {
  const [row] = await input.db
    .select({ plan: users.plan })
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);
  if (row?.plan !== "pro") {
    throw new SessionError(
      403,
      "FORBIDDEN",
      "This action requires a Pro plan subscription.",
    );
  }
}
