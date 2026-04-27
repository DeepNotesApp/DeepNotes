import type { DeepnotesDb } from "@deepnotes/db/client";
import {
  groupJoinInvitations,
  groupMembers,
  groups,
} from "@deepnotes/db/schema";
import { and, eq } from "drizzle-orm";

import type { SessionEnv } from "./env.js";
import { SessionError } from "./errors.js";
import { roleHasManageLowerRanks } from "./group-role-ranks.js";
import { getAuthenticatedUserSummary } from "./user-me.js";

/**
 * Encrypted group + member key material for building join-invitation / join-request-accept
 * payloads in the browser (managers only).
 */
export async function performGetGroupInviteCryptoBootstrap(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  groupId: string;
}): Promise<{
  groupPublicKeyring: Buffer;
  groupAccessKeyring: Buffer | null;
  memberEncryptedAccessKeyring: Buffer | null;
  memberEncryptedInternalKeyring: Buffer;
}> {
  const { userId } = await getAuthenticatedUserSummary(input);

  const [memberRow] = await input.db
    .select({
      role: groupMembers.role,
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

  if (memberRow == null) {
    throw new SessionError(403, "FORBIDDEN", "Not a member of this group.");
  }
  if (!roleHasManageLowerRanks(memberRow.role)) {
    throw new SessionError(
      403,
      "FORBIDDEN",
      "Insufficient permissions to manage invitations.",
    );
  }

  const [groupRow] = await input.db
    .select({
      publicKeyring: groups.publicKeyring,
      accessKeyring: groups.accessKeyring,
    })
    .from(groups)
    .where(eq(groups.id, input.groupId))
    .limit(1);

  if (groupRow == null) {
    throw new SessionError(404, "NOT_FOUND", "Group not found.");
  }

  return {
    groupPublicKeyring: groupRow.publicKeyring,
    groupAccessKeyring: groupRow.accessKeyring,
    memberEncryptedAccessKeyring: memberRow.encryptedAccessKeyring,
    memberEncryptedInternalKeyring: memberRow.encryptedInternalKeyring,
  };
}

/**
 * Group `public_keyring` for encrypting member/invitee display names when the caller may
 * not be a full member (pending invite, join request, or public group with requests on).
 */
export async function performGetGroupPublicKeyringForMessaging(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  groupId: string;
}): Promise<{ groupPublicKeyring: Buffer }> {
  const { userId } = await getAuthenticatedUserSummary(input);

  const [groupRow] = await input.db
    .select({
      publicKeyring: groups.publicKeyring,
      areJoinRequestsAllowed: groups.areJoinRequestsAllowed,
    })
    .from(groups)
    .where(eq(groups.id, input.groupId))
    .limit(1);

  if (groupRow == null) {
    throw new SessionError(404, "NOT_FOUND", "Group not found.");
  }

  const [memberRow] = await input.db
    .select({ userId: groupMembers.userId })
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, input.groupId),
        eq(groupMembers.userId, userId),
      ),
    )
    .limit(1);

  const [invRow] = await input.db
    .select({ userId: groupJoinInvitations.userId })
    .from(groupJoinInvitations)
    .where(
      and(
        eq(groupJoinInvitations.groupId, input.groupId),
        eq(groupJoinInvitations.userId, userId),
      ),
    )
    .limit(1);

  const isMember = memberRow != null;
  const hasPendingInvite = invRow != null;
  const mayRequestJoin =
    groupRow.areJoinRequestsAllowed && !isMember;

  if (isMember || hasPendingInvite || mayRequestJoin) {
    return { groupPublicKeyring: groupRow.publicKeyring };
  }

  throw new SessionError(
    403,
    "FORBIDDEN",
    "Cannot load group public key for this user.",
  );
}
