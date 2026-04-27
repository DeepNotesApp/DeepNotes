import type { DeepnotesDb } from "@deepnotes/db/client";
import {
  groupJoinInvitations,
  groupJoinRequests,
  groupMembers,
  groups,
} from "@deepnotes/db/schema";
import { eq } from "drizzle-orm";

import type { SessionEnv } from "./env.js";
import { SessionError } from "./errors.js";
import { userHasGroupPermission } from "./group-permissions.js";
import { getAuthenticatedUserSummary } from "./user-me.js";

/**
 * Replaces legacy `groups.getMainPageId` with an explicit `viewGroupPages`
 * check (legacy tRPC had auth only; REST aligns with `groups.getPages`).
 */
export async function performGetGroupMainPageId(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  groupId: string;
}): Promise<{ mainPageId: string }> {
  const { userId } = await getAuthenticatedUserSummary(input);

  const [row] = await input.db
    .select({ mainPageId: groups.mainPageId })
    .from(groups)
    .where(eq(groups.id, input.groupId))
    .limit(1);

  if (row == null) {
    throw new SessionError(404, "NOT_FOUND", "Group not found.");
  }

  const allowed = await userHasGroupPermission({
    db: input.db,
    userId,
    groupId: input.groupId,
    permission: "viewGroupPages",
  });
  if (!allowed) {
    throw new SessionError(403, "FORBIDDEN", "Insufficient permissions.");
  }

  return { mainPageId: row.mainPageId };
}

/**
 * Replaces legacy `groups.getUserIds`: members, pending join requests, and
 * invitations (SQL UNION). Requires `viewGroupMembers` — not granted for
 * public read without membership (legacy `@deeplib/data` `userHasPermission`).
 */
export async function performGetGroupMemberUserIds(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  groupId: string;
}): Promise<{ userIds: string[] }> {
  const { userId } = await getAuthenticatedUserSummary(input);

  const [groupRow] = await input.db
    .select({ id: groups.id })
    .from(groups)
    .where(eq(groups.id, input.groupId))
    .limit(1);

  if (groupRow == null) {
    throw new SessionError(404, "NOT_FOUND", "Group not found.");
  }

  const allowed = await userHasGroupPermission({
    db: input.db,
    userId,
    groupId: input.groupId,
    permission: "viewGroupMembers",
  });
  if (!allowed) {
    throw new SessionError(403, "FORBIDDEN", "Insufficient permissions.");
  }

  const [memberRows, requestRows, invitationRows] = await Promise.all([
    input.db
      .select({ userId: groupMembers.userId })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, input.groupId)),
    input.db
      .select({ userId: groupJoinRequests.userId })
      .from(groupJoinRequests)
      .where(eq(groupJoinRequests.groupId, input.groupId)),
    input.db
      .select({ userId: groupJoinInvitations.userId })
      .from(groupJoinInvitations)
      .where(eq(groupJoinInvitations.groupId, input.groupId)),
  ]);

  const ids = new Set<string>();
  for (const r of memberRows) ids.add(r.userId);
  for (const r of requestRows) ids.add(r.userId);
  for (const r of invitationRows) ids.add(r.userId);

  return { userIds: [...ids] };
}
