import type { DeepnotesDb } from "@deepnotes/db/client";
import {
  groupJoinInvitations,
  groupJoinRequests,
  groupMembers,
  groups,
  pages,
  users,
} from "@deepnotes/db/schema";
import { and, asc, eq, isNull } from "drizzle-orm";

import type { SessionEnv } from "@deepnotes/session-core";
import { SessionError } from "@deepnotes/session-core";
import { userHasGroupPermission } from "@deepnotes/session-core";
import { getAuthenticatedUserSummary } from "@deepnotes/session-core";
import { assertUserProPlan } from "@deepnotes/session-core";

function toB64(buf: Buffer | Uint8Array | null | undefined): string | null {
  if (buf == null) {
    return null;
  }
  return Buffer.from(buf).toString("base64");
}

/**
 * Read-only payload matching legacy WS `groups.privacy.makePrivate` step 1 + `getGroupKeyRotationValues`,
 * for building `POST …/privacy/private` bodies in the browser.
 */
export async function performGetGroupPrivacyMakePrivateBootstrap(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  groupId: string;
}): Promise<{
  groupAccessKeyring: string | null;
  groupEncryptedName: string;
  groupEncryptedContentKeyring: string;
  groupPublicKeyring: string;
  groupEncryptedPrivateKeyring: string;
  groupEncryptedAccessKeyring: string | null;
  groupEncryptedInternalKeyring: string;
  groupMembers: Record<
    string,
    { publicKeyring: string; encryptedName: string | null }
  >;
  groupJoinInvitations: Record<
    string,
    { publicKeyring: string; encryptedName: string }
  >;
  groupJoinRequests: Record<string, { encryptedName: string }>;
  groupPages: Record<string, { encryptedSymmetricKeyring: string }>;
}> {
  const { userId } = await getAuthenticatedUserSummary(input);
  await assertUserProPlan({ db: input.db, userId });
  const allowed = await userHasGroupPermission({
    db: input.db,
    userId,
    groupId: input.groupId,
    permission: "editGroupSettings",
  });
  if (!allowed) {
    throw new SessionError(403, "FORBIDDEN", "Insufficient permissions.");
  }

  const [g] = await input.db
    .select({
      accessKeyring: groups.accessKeyring,
      encryptedName: groups.encryptedName,
      encryptedContentKeyring: groups.encryptedContentKeyring,
      publicKeyring: groups.publicKeyring,
      encryptedPrivateKeyring: groups.encryptedPrivateKeyring,
    })
    .from(groups)
    .where(eq(groups.id, input.groupId))
    .limit(1);

  if (g == null) {
    throw new SessionError(404, "NOT_FOUND", "Group not found.");
  }
  if (g.accessKeyring == null) {
    throw new SessionError(
      400,
      "BAD_REQUEST",
      "Group is already private.",
    );
  }

  const [viewerMem] = await input.db
    .select({
      encryptedAccessKeyring: groupMembers.encryptedAccessKeyring,
      encryptedInternalKeyring: groupMembers.encryptedInternalKeyring,
    })
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, input.groupId),
        eq(groupMembers.userId, userId),
      ),
    )
    .limit(1);

  if (viewerMem == null) {
    throw new SessionError(403, "FORBIDDEN", "Not a member of this group.");
  }

  const memberJoined = await input.db
    .select({
      userId: groupMembers.userId,
      encryptedName: groupMembers.encryptedName,
      publicKeyring: users.publicKeyring,
    })
    .from(groupMembers)
    .innerJoin(users, eq(groupMembers.userId, users.id))
    .where(eq(groupMembers.groupId, input.groupId));

  const invitationJoined = await input.db
    .select({
      userId: groupJoinInvitations.userId,
      encryptedName: groupJoinInvitations.encryptedName,
      publicKeyring: users.publicKeyring,
    })
    .from(groupJoinInvitations)
    .innerJoin(users, eq(groupJoinInvitations.userId, users.id))
    .where(eq(groupJoinInvitations.groupId, input.groupId));

  const requestRows = await input.db
    .select({
      userId: groupJoinRequests.userId,
      encryptedName: groupJoinRequests.encryptedName,
    })
    .from(groupJoinRequests)
    .where(eq(groupJoinRequests.groupId, input.groupId));

  const pageRows = await input.db
    .select({
      id: pages.id,
      encryptedSymmetricKeyring: pages.encryptedSymmetricKeyring,
    })
    .from(pages)
    .where(
      and(eq(pages.groupId, input.groupId), isNull(pages.permanentDeletionDate)),
    )
    .orderBy(asc(pages.id));

  const groupMembersOut: Record<
    string,
    { publicKeyring: string; encryptedName: string | null }
  > = {};
  for (const r of memberJoined) {
    groupMembersOut[r.userId] = {
      publicKeyring: Buffer.from(r.publicKeyring).toString("base64"),
      encryptedName: toB64(r.encryptedName),
    };
  }

  const groupJoinInvitationsOut: Record<
    string,
    { publicKeyring: string; encryptedName: string }
  > = {};
  for (const r of invitationJoined) {
    groupJoinInvitationsOut[r.userId] = {
      publicKeyring: Buffer.from(r.publicKeyring).toString("base64"),
      encryptedName: Buffer.from(r.encryptedName).toString("base64"),
    };
  }

  const groupJoinRequestsOut: Record<
    string,
    { encryptedName: string }
  > = {};
  for (const r of requestRows) {
    groupJoinRequestsOut[r.userId] = {
      encryptedName: Buffer.from(r.encryptedName).toString("base64"),
    };
  }

  const groupPagesOut: Record<
    string,
    { encryptedSymmetricKeyring: string }
  > = {};
  for (const r of pageRows) {
    groupPagesOut[r.id] = {
      encryptedSymmetricKeyring: Buffer.from(
        r.encryptedSymmetricKeyring,
      ).toString("base64"),
    };
  }

  return {
    groupAccessKeyring: toB64(g.accessKeyring),
    groupEncryptedName: Buffer.from(g.encryptedName).toString("base64"),
    groupEncryptedContentKeyring: Buffer.from(
      g.encryptedContentKeyring,
    ).toString("base64"),
    groupPublicKeyring: Buffer.from(g.publicKeyring).toString("base64"),
    groupEncryptedPrivateKeyring: Buffer.from(
      g.encryptedPrivateKeyring,
    ).toString("base64"),
    groupEncryptedAccessKeyring: toB64(viewerMem.encryptedAccessKeyring),
    groupEncryptedInternalKeyring: Buffer.from(
      viewerMem.encryptedInternalKeyring,
    ).toString("base64"),
    groupMembers: groupMembersOut,
    groupJoinInvitations: groupJoinInvitationsOut,
    groupJoinRequests: groupJoinRequestsOut,
    groupPages: groupPagesOut,
  };
}
