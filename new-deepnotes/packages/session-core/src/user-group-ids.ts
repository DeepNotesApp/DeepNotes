import type { DeepnotesDb } from "@deepnotes/db/client";
import { groupMembers } from "@deepnotes/db/schema";
import { desc, eq } from "drizzle-orm";

import type { SessionEnv } from "./env.js";
import { getAuthenticatedUserSummary } from "./user-me.js";

/**
 * Replaces legacy `users.pages.getGroupIds`: group IDs the user belongs to,
 * ordered by `group_members.last_activity_date` descending.
 */
export async function performGetUserGroupIds(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
}): Promise<{ groupIds: string[] }> {
  const { userId } = await getAuthenticatedUserSummary(input);

  const rows = await input.db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .where(eq(groupMembers.userId, userId))
    .orderBy(desc(groupMembers.lastActivityDate));

  return { groupIds: rows.map((r) => r.groupId) };
}
