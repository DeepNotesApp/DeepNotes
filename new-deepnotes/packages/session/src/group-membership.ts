import type { DeepnotesDb } from "@deepnotes/db/client";
import {
  groupJoinInvitations,
  groupJoinRequests,
  groupMembers,
  groups,
} from "@deepnotes/db/schema";
import { and, count, eq } from "drizzle-orm";
import { Buffer } from "node:buffer";

import type { SessionEnv } from "./env.js";
import { SessionError } from "./errors.js";
import {
  canChangeRole,
  canManageRole,
  roleHasManageLowerRanks,
} from "./group-role-ranks.js";
import { getAuthenticatedUserSummary } from "./user-me.js";
import { assertUserProPlan } from "./user-plan.js";

async function requireGroup(input: {
  db: DeepnotesDb;
  groupId: string;
}): Promise<{ accessKeyring: Buffer | null }> {
  const [g] = await input.db
    .select({ accessKeyring: groups.accessKeyring })
    .from(groups)
    .where(eq(groups.id, input.groupId))
    .limit(1);
  if (g == null) {
    throw new SessionError(404, "NOT_FOUND", "Group not found.");
  }
  return { accessKeyring: g.accessKeyring };
}

async function getMemberRole(input: {
  db: DeepnotesDb;
  groupId: string;
  userId: string;
}): Promise<string | null> {
  const [row] = await input.db
    .select({ role: groupMembers.role })
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, input.groupId),
        eq(groupMembers.userId, input.userId),
      ),
    )
    .limit(1);
  return row?.role ?? null;
}

async function countOwners(input: {
  db: DeepnotesDb;
  groupId: string;
}): Promise<number> {
  const [row] = await input.db
    .select({ n: count() })
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, input.groupId),
        eq(groupMembers.role, "owner"),
      ),
    );
  return Number(row?.n ?? 0);
}

/** Legacy `groups.joinInvitations.send` step 1 (DB only). */
export async function performGroupJoinInvitationSend(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  groupId: string;
  inviteeUserId: string;
  invitationRole: string;
  /** Omitted for public groups (`access_keyring` set). */
  encryptedAccessKeyring?: Uint8Array;
  encryptedInternalKeyring: Uint8Array;
  userEncryptedName: Uint8Array;
  userEncryptedNameForUser: Uint8Array;
}): Promise<void> {
  const { userId: agentId } = await getAuthenticatedUserSummary(input);
  await assertUserProPlan({ db: input.db, userId: agentId });

  const { accessKeyring } = await requireGroup({ db: input.db, groupId: input.groupId });
  const isPublic = accessKeyring != null;

  const agentRole = await getMemberRole({
    db: input.db,
    groupId: input.groupId,
    userId: agentId,
  });
  if (agentRole == null || !canManageRole(agentRole, input.invitationRole)) {
    throw new SessionError(403, "FORBIDDEN", "Insufficient permissions");
  }

  const [existingInv] = await input.db
    .select({ userId: groupJoinInvitations.userId })
    .from(groupJoinInvitations)
    .where(
      and(
        eq(groupJoinInvitations.groupId, input.groupId),
        eq(groupJoinInvitations.userId, input.inviteeUserId),
      ),
    )
    .limit(1);
  if (existingInv != null) {
    throw new SessionError(400, "BAD_REQUEST", "Invitation already exists");
  }

  const targetMemberRole = await getMemberRole({
    db: input.db,
    groupId: input.groupId,
    userId: input.inviteeUserId,
  });
  if (targetMemberRole != null) {
    throw new SessionError(
      400,
      "BAD_REQUEST",
      "User is already a member of the group.",
    );
  }

  if (!isPublic && input.encryptedAccessKeyring === undefined) {
    throw new SessionError(
      400,
      "BAD_REQUEST",
      "encryptedAccessKeyring is required for private groups.",
    );
  }

  await input.db.transaction(async (tx) => {
    await tx
      .delete(groupJoinRequests)
      .where(
        and(
          eq(groupJoinRequests.groupId, input.groupId),
          eq(groupJoinRequests.userId, input.inviteeUserId),
        ),
      );
    await tx.insert(groupJoinInvitations).values({
      groupId: input.groupId,
      userId: input.inviteeUserId,
      inviterId: agentId,
      role: input.invitationRole,
      encryptedAccessKeyring: isPublic
        ? null
        : Buffer.from(input.encryptedAccessKeyring!),
      encryptedInternalKeyring: Buffer.from(input.encryptedInternalKeyring),
      encryptedName: Buffer.from(input.userEncryptedName),
      encryptedNameForUser: Buffer.from(input.userEncryptedNameForUser),
    });
  });
}

/** Legacy `groups.joinInvitations.accept` step 1. */
export async function performGroupJoinInvitationAccept(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  groupId: string;
  userEncryptedName: Uint8Array;
}): Promise<void> {
  const { userId } = await getAuthenticatedUserSummary(input);
  await assertUserProPlan({ db: input.db, userId });

  await requireGroup({ db: input.db, groupId: input.groupId });

  const [inv] = await input.db
    .select()
    .from(groupJoinInvitations)
    .where(
      and(
        eq(groupJoinInvitations.groupId, input.groupId),
        eq(groupJoinInvitations.userId, userId),
      ),
    )
    .limit(1);

  if (inv == null) {
    throw new SessionError(403, "FORBIDDEN", "No pending invitation.");
  }

  await input.db.transaction(async (tx) => {
    await tx
      .delete(groupJoinInvitations)
      .where(
        and(
          eq(groupJoinInvitations.groupId, input.groupId),
          eq(groupJoinInvitations.userId, userId),
        ),
      );
    await tx.insert(groupMembers).values({
      groupId: input.groupId,
      userId,
      role: inv.role,
      encryptedAccessKeyring: inv.encryptedAccessKeyring,
      encryptedInternalKeyring: inv.encryptedInternalKeyring,
      encryptedName: Buffer.from(input.userEncryptedName),
      encryptedNameForUser: inv.encryptedNameForUser,
    });
  });
}

/** Legacy `groups.joinInvitations.reject` step 1. */
export async function performGroupJoinInvitationReject(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  groupId: string;
}): Promise<void> {
  const { userId } = await getAuthenticatedUserSummary(input);

  await requireGroup({ db: input.db, groupId: input.groupId });

  const [inv] = await input.db
    .select({ userId: groupJoinInvitations.userId })
    .from(groupJoinInvitations)
    .where(
      and(
        eq(groupJoinInvitations.groupId, input.groupId),
        eq(groupJoinInvitations.userId, userId),
      ),
    )
    .limit(1);

  if (inv == null) {
    throw new SessionError(400, "BAD_REQUEST", "No pending join invitation.");
  }

  await input.db
    .delete(groupJoinInvitations)
    .where(
      and(
        eq(groupJoinInvitations.groupId, input.groupId),
        eq(groupJoinInvitations.userId, userId),
      ),
    );
}

/** Legacy `groups.joinInvitations.cancel` step 1. */
export async function performGroupJoinInvitationCancel(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  groupId: string;
  inviteeUserId: string;
}): Promise<void> {
  const { userId: agentId } = await getAuthenticatedUserSummary(input);
  await assertUserProPlan({ db: input.db, userId: agentId });

  await requireGroup({ db: input.db, groupId: input.groupId });

  const agentRole = await getMemberRole({
    db: input.db,
    groupId: input.groupId,
    userId: agentId,
  });
  if (agentRole == null) {
    throw new SessionError(403, "FORBIDDEN", "Insufficient permissions.");
  }

  const [inv] = await input.db
    .select({ role: groupJoinInvitations.role })
    .from(groupJoinInvitations)
    .where(
      and(
        eq(groupJoinInvitations.groupId, input.groupId),
        eq(groupJoinInvitations.userId, input.inviteeUserId),
      ),
    )
    .limit(1);

  if (inv == null) {
    throw new SessionError(403, "FORBIDDEN", "No pending invitation.");
  }

  if (!canManageRole(agentRole, inv.role)) {
    throw new SessionError(403, "FORBIDDEN", "Insufficient permissions.");
  }

  await input.db
    .delete(groupJoinInvitations)
    .where(
      and(
        eq(groupJoinInvitations.groupId, input.groupId),
        eq(groupJoinInvitations.userId, input.inviteeUserId),
      ),
    );
}

/** Legacy `groups.joinRequests.send` step 1. */
export async function performGroupJoinRequestSend(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  groupId: string;
  encryptedUserName: Uint8Array;
  encryptedUserNameForUser: Uint8Array;
}): Promise<void> {
  const { userId } = await getAuthenticatedUserSummary(input);
  await assertUserProPlan({ db: input.db, userId });

  const [g] = await input.db
    .select({
      allow: groups.areJoinRequestsAllowed,
    })
    .from(groups)
    .where(eq(groups.id, input.groupId))
    .limit(1);
  if (g == null) {
    throw new SessionError(404, "NOT_FOUND", "Group not found.");
  }
  if (!g.allow) {
    throw new SessionError(
      403,
      "FORBIDDEN",
      "This group does not allow join requests.",
    );
  }

  const [reqRow] = await input.db
    .select({ rejected: groupJoinRequests.rejected })
    .from(groupJoinRequests)
    .where(
      and(
        eq(groupJoinRequests.groupId, input.groupId),
        eq(groupJoinRequests.userId, userId),
      ),
    )
    .limit(1);

  if (reqRow != null) {
    if (reqRow.rejected) {
      throw new SessionError(
        403,
        "FORBIDDEN",
        "Your join request has been rejected.",
      );
    }
    throw new SessionError(400, "BAD_REQUEST", "Join request already pending.");
  }

  const memberRole = await getMemberRole({
    db: input.db,
    groupId: input.groupId,
    userId,
  });
  if (memberRole != null) {
    throw new SessionError(
      403,
      "FORBIDDEN",
      "You are already a member of this group.",
    );
  }

  await input.db.insert(groupJoinRequests).values({
    groupId: input.groupId,
    userId,
    encryptedName: Buffer.from(input.encryptedUserName),
    encryptedNameForUser: Buffer.from(input.encryptedUserNameForUser),
    rejected: false,
  });
}

/** Legacy `groups.joinRequests.accept` step 1. */
export async function performGroupJoinRequestAccept(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  groupId: string;
  requesterUserId: string;
  targetRole: string;
  /** Omitted for public groups. */
  encryptedAccessKeyring?: Uint8Array;
  encryptedInternalKeyring: Uint8Array;
}): Promise<void> {
  const { userId: agentId } = await getAuthenticatedUserSummary(input);
  await assertUserProPlan({ db: input.db, userId: agentId });

  const { accessKeyring } = await requireGroup({ db: input.db, groupId: input.groupId });
  const isPublic = accessKeyring != null;

  const agentRole = await getMemberRole({
    db: input.db,
    groupId: input.groupId,
    userId: agentId,
  });
  if (agentRole == null || !canManageRole(agentRole, input.targetRole)) {
    throw new SessionError(403, "FORBIDDEN", "Insufficient permissions");
  }

  const [reqRow] = await input.db
    .select()
    .from(groupJoinRequests)
    .where(
      and(
        eq(groupJoinRequests.groupId, input.groupId),
        eq(groupJoinRequests.userId, input.requesterUserId),
      ),
    )
    .limit(1);

  if (reqRow == null || reqRow.rejected) {
    throw new SessionError(400, "BAD_REQUEST", "No pending request");
  }

  if (!isPublic && input.encryptedAccessKeyring === undefined) {
    throw new SessionError(
      400,
      "BAD_REQUEST",
      "encryptedAccessKeyring is required for private groups.",
    );
  }

  await input.db.transaction(async (tx) => {
    await tx
      .delete(groupJoinRequests)
      .where(
        and(
          eq(groupJoinRequests.groupId, input.groupId),
          eq(groupJoinRequests.userId, input.requesterUserId),
        ),
      );
    await tx.insert(groupMembers).values({
      groupId: input.groupId,
      userId: input.requesterUserId,
      role: input.targetRole,
      encryptedAccessKeyring: isPublic
        ? null
        : Buffer.from(input.encryptedAccessKeyring!),
      encryptedInternalKeyring: Buffer.from(input.encryptedInternalKeyring),
      encryptedName: reqRow.encryptedName,
      encryptedNameForUser: reqRow.encryptedNameForUser,
    });
  });
}

/** Legacy `groups.joinRequests.reject` step 1. */
export async function performGroupJoinRequestReject(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  groupId: string;
  requesterUserId: string;
}): Promise<void> {
  const { userId: agentId } = await getAuthenticatedUserSummary(input);
  await assertUserProPlan({ db: input.db, userId: agentId });

  await requireGroup({ db: input.db, groupId: input.groupId });

  const agentRole = await getMemberRole({
    db: input.db,
    groupId: input.groupId,
    userId: agentId,
  });
  if (agentRole == null || !roleHasManageLowerRanks(agentRole)) {
    throw new SessionError(403, "FORBIDDEN", "Insufficient permissions.");
  }

  const [reqRow] = await input.db
    .select({ rejected: groupJoinRequests.rejected })
    .from(groupJoinRequests)
    .where(
      and(
        eq(groupJoinRequests.groupId, input.groupId),
        eq(groupJoinRequests.userId, input.requesterUserId),
      ),
    )
    .limit(1);

  if (reqRow == null || reqRow.rejected) {
    throw new SessionError(400, "BAD_REQUEST", "No pending join request");
  }

  await input.db
    .update(groupJoinRequests)
    .set({ rejected: true })
    .where(
      and(
        eq(groupJoinRequests.groupId, input.groupId),
        eq(groupJoinRequests.userId, input.requesterUserId),
      ),
    );
}

/** Legacy `groups.joinRequests.cancel` step 1. */
export async function performGroupJoinRequestCancel(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  groupId: string;
}): Promise<void> {
  const { userId } = await getAuthenticatedUserSummary(input);
  await assertUserProPlan({ db: input.db, userId });

  await requireGroup({ db: input.db, groupId: input.groupId });

  const [reqRow] = await input.db
    .select({ rejected: groupJoinRequests.rejected })
    .from(groupJoinRequests)
    .where(
      and(
        eq(groupJoinRequests.groupId, input.groupId),
        eq(groupJoinRequests.userId, userId),
      ),
    )
    .limit(1);

  if (reqRow == null || reqRow.rejected) {
    throw new SessionError(400, "BAD_REQUEST", "No pending join request.");
  }

  await input.db
    .delete(groupJoinRequests)
    .where(
      and(
        eq(groupJoinRequests.groupId, input.groupId),
        eq(groupJoinRequests.userId, userId),
      ),
    );
}

/** Legacy `groups.changeUserRole` step 1. */
export async function performGroupMemberRoleChange(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  groupId: string;
  targetUserId: string;
  requestedRole: string;
}): Promise<void> {
  const { userId: agentId } = await getAuthenticatedUserSummary(input);
  await assertUserProPlan({ db: input.db, userId: agentId });

  await requireGroup({ db: input.db, groupId: input.groupId });

  const agentRole = await getMemberRole({
    db: input.db,
    groupId: input.groupId,
    userId: agentId,
  });
  const patientRole = await getMemberRole({
    db: input.db,
    groupId: input.groupId,
    userId: input.targetUserId,
  });

  if (
    agentRole == null ||
    patientRole == null ||
    !canChangeRole(agentRole, patientRole, input.requestedRole)
  ) {
    throw new SessionError(403, "FORBIDDEN", "Insufficient permissions.");
  }

  if (
    patientRole === "owner" &&
    input.requestedRole !== "owner" &&
    (await countOwners({ db: input.db, groupId: input.groupId })) <= 1
  ) {
    throw new SessionError(
      403,
      "FORBIDDEN",
      "You cannot remove all group owners.",
    );
  }

  await input.db
    .update(groupMembers)
    .set({ role: input.requestedRole })
    .where(
      and(
        eq(groupMembers.groupId, input.groupId),
        eq(groupMembers.userId, input.targetUserId),
      ),
    );
}

/** Legacy `groups.removeUser` step 1. */
export async function performGroupMemberRemove(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  groupId: string;
  targetUserId: string;
}): Promise<void> {
  const { userId: agentId } = await getAuthenticatedUserSummary(input);
  await assertUserProPlan({ db: input.db, userId: agentId });

  await requireGroup({ db: input.db, groupId: input.groupId });

  const agentRole = await getMemberRole({
    db: input.db,
    groupId: input.groupId,
    userId: agentId,
  });
  const targetRole = await getMemberRole({
    db: input.db,
    groupId: input.groupId,
    userId: input.targetUserId,
  });

  if (targetRole == null) {
    throw new SessionError(404, "NOT_FOUND", "Member not found.");
  }

  if (
    agentId !== input.targetUserId &&
    !canManageRole(agentRole ?? "", targetRole)
  ) {
    throw new SessionError(403, "FORBIDDEN", "Insufficient permissions.");
  }

  if (
    targetRole === "owner" &&
    (await countOwners({ db: input.db, groupId: input.groupId })) <= 1
  ) {
    throw new SessionError(
      400,
      "BAD_REQUEST",
      "Cannot remove the all group owners.",
    );
  }

  await input.db
    .delete(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, input.groupId),
        eq(groupMembers.userId, input.targetUserId),
      ),
    );
}
