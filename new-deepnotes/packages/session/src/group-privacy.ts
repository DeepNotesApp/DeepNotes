import type { DeepnotesDb } from "@deepnotes/db/client";
import { groupJoinInvitations, groupMembers, groups } from "@deepnotes/db/schema";
import { eq } from "drizzle-orm";
import { Buffer } from "node:buffer";

import type { SessionEnv } from "./env.js";
import { SessionError } from "./errors.js";
import { userHasGroupPermission } from "./group-permissions.js";
import { getAuthenticatedUserSummary } from "./user-me.js";
import { assertUserProPlan } from "./user-plan.js";

async function requireEditGroupSettings(input: {
  db: DeepnotesDb;
  userId: string;
  groupId: string;
}): Promise<void> {
  const allowed = await userHasGroupPermission({
    db: input.db,
    userId: input.userId,
    groupId: input.groupId,
    permission: "editGroupSettings",
  });
  if (!allowed) {
    throw new SessionError(403, "FORBIDDEN", "Insufficient permissions.");
  }
}

/**
 * `groups.privacy.makePublic` — shared read keyring; clears member/invite
 * `encrypted_access_keyring` (legacy KeyDB parity).
 */
export async function performGroupPrivacyMakePublic(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  groupId: string;
  accessKeyring: Uint8Array;
}): Promise<void> {
  const { userId } = await getAuthenticatedUserSummary({
    db: input.db,
    env: input.env,
    accessCookie: input.accessCookie,
  });
  await assertUserProPlan({ db: input.db, userId });
  await requireEditGroupSettings({ db: input.db, userId, groupId: input.groupId });

  const [g] = await input.db
    .select({ accessKeyring: groups.accessKeyring })
    .from(groups)
    .where(eq(groups.id, input.groupId))
    .limit(1);
  if (g == null) {
    throw new SessionError(404, "NOT_FOUND", "Group not found.");
  }
  if (g.accessKeyring != null) {
    throw new SessionError(400, "BAD_REQUEST", "Group is already public.");
  }

  await input.db.transaction(async (tx) => {
    await tx
      .update(groups)
      .set({ accessKeyring: Buffer.from(input.accessKeyring) })
      .where(eq(groups.id, input.groupId));
    await tx
      .update(groupMembers)
      .set({ encryptedAccessKeyring: null })
      .where(eq(groupMembers.groupId, input.groupId));
    await tx
      .update(groupJoinInvitations)
      .set({ encryptedAccessKeyring: null })
      .where(eq(groupJoinInvitations.groupId, input.groupId));
  });
}

export async function performGroupPrivacySetJoinRequestsAllowed(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  groupId: string;
  areJoinRequestsAllowed: boolean;
}): Promise<void> {
  const { userId } = await getAuthenticatedUserSummary({
    db: input.db,
    env: input.env,
    accessCookie: input.accessCookie,
  });
  await assertUserProPlan({ db: input.db, userId });
  await requireEditGroupSettings({ db: input.db, userId, groupId: input.groupId });

  const [g] = await input.db
    .select({ id: groups.id })
    .from(groups)
    .where(eq(groups.id, input.groupId))
    .limit(1);
  if (g == null) {
    throw new SessionError(404, "NOT_FOUND", "Group not found.");
  }

  await input.db
    .update(groups)
    .set({ areJoinRequestsAllowed: input.areJoinRequestsAllowed })
    .where(eq(groups.id, input.groupId));
}
