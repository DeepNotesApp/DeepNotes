import type { DeepnotesDb } from "@deepnotes/db/client";
import {
  groupJoinInvitations,
  groupJoinRequests,
  groupMembers,
  groups,
} from "@deepnotes/db/schema";
import { and, eq } from "drizzle-orm";

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

/**
 * Structured membership for group admin UIs: roles, pending invites/requests,
 * and viewer context. Requires `viewGroupMembers` and an active `group_members`
 * row (same as {@link performGetGroupMemberUserIds}).
 */
export async function performGetGroupMembersDetail(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  groupId: string;
}): Promise<{
  viewerUserId: string;
  viewerRole: string;
  groupIsPublic: boolean;
  joinRequestsAllowed: boolean;
  members: { userId: string; role: string }[];
  pendingInvitations: { userId: string; role: string }[];
  pendingJoinRequests: { userId: string }[];
}> {
  const { userId: viewerUserId } = await getAuthenticatedUserSummary(input);

  const [groupRow] = await input.db
    .select({
      accessKeyring: groups.accessKeyring,
      areJoinRequestsAllowed: groups.areJoinRequestsAllowed,
    })
    .from(groups)
    .where(eq(groups.id, input.groupId))
    .limit(1);

  if (groupRow == null) {
    throw new SessionError(404, "NOT_FOUND", "Group not found.");
  }

  const allowed = await userHasGroupPermission({
    db: input.db,
    userId: viewerUserId,
    groupId: input.groupId,
    permission: "viewGroupMembers",
  });
  if (!allowed) {
    throw new SessionError(403, "FORBIDDEN", "Insufficient permissions.");
  }

  const [viewerMember] = await input.db
    .select({ role: groupMembers.role })
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, input.groupId),
        eq(groupMembers.userId, viewerUserId),
      ),
    )
    .limit(1);

  if (viewerMember == null) {
    throw new SessionError(403, "FORBIDDEN", "Insufficient permissions.");
  }

  const [memberRows, invitationRows, requestRows] = await Promise.all([
    input.db
      .select({ userId: groupMembers.userId, role: groupMembers.role })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, input.groupId)),
    input.db
      .select({
        userId: groupJoinInvitations.userId,
        role: groupJoinInvitations.role,
      })
      .from(groupJoinInvitations)
      .where(eq(groupJoinInvitations.groupId, input.groupId)),
    input.db
      .select({ userId: groupJoinRequests.userId })
      .from(groupJoinRequests)
      .where(
        and(
          eq(groupJoinRequests.groupId, input.groupId),
          eq(groupJoinRequests.rejected, false),
        ),
      ),
  ]);

  return {
    viewerUserId,
    viewerRole: viewerMember.role,
    groupIsPublic: groupRow.accessKeyring != null,
    joinRequestsAllowed: groupRow.areJoinRequestsAllowed,
    members: memberRows.map((r) => ({ userId: r.userId, role: r.role })),
    pendingInvitations: invitationRows.map((r) => ({
      userId: r.userId,
      role: r.role,
    })),
    pendingJoinRequests: requestRows.map((r) => ({ userId: r.userId })),
  };
}
