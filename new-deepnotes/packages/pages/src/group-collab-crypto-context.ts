import type { DeepnotesDb } from "@deepnotes/db/client";
import { groupMembers, groups } from "@deepnotes/db/schema";
import { and, eq } from "drizzle-orm";

import type { SessionEnv } from "@deepnotes/session-core";
import { SessionError } from "@deepnotes/session-core";
import { userHasGroupPermission } from "@deepnotes/session-core";
import { getAuthenticatedUserSummary } from "@deepnotes/session-core";

/**
 * Group ciphertext for unwrapping `GroupContentKeyring` in the browser (e.g. cross-group page move).
 * Caller must have `editGroupPages` on the group.
 */
export async function performGetGroupCollabCryptoContext(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  groupId: string;
}): Promise<{
  groupEncryptedContentKeyring: Buffer;
  groupAccessKeyring: Buffer | null;
  memberEncryptedAccessKeyring: Buffer | null;
}> {
  const { userId } = await getAuthenticatedUserSummary(input);

  const [g] = await input.db
    .select({
      id: groups.id,
      encryptedContentKeyring: groups.encryptedContentKeyring,
      accessKeyring: groups.accessKeyring,
    })
    .from(groups)
    .where(eq(groups.id, input.groupId))
    .limit(1);

  if (g == null) {
    throw new SessionError(404, "NOT_FOUND", "Group not found.");
  }

  const canEdit = await userHasGroupPermission({
    db: input.db,
    userId,
    groupId: input.groupId,
    permission: "editGroupPages",
  });
  if (!canEdit) {
    throw new SessionError(403, "FORBIDDEN", "Insufficient permissions.");
  }

  const [memberRow] = await input.db
    .select({
      encryptedAccessKeyring: groupMembers.encryptedAccessKeyring,
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

  return {
    groupEncryptedContentKeyring: Buffer.from(g.encryptedContentKeyring),
    groupAccessKeyring:
      g.accessKeyring != null ? Buffer.from(g.accessKeyring) : null,
    memberEncryptedAccessKeyring:
      memberRow.encryptedAccessKeyring != null
        ? Buffer.from(memberRow.encryptedAccessKeyring)
        : null,
  };
}
