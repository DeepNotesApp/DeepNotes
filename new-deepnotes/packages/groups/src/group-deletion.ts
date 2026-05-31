import type { DeepnotesDb } from "@deepnotes/db/client";
import { groups } from "@deepnotes/db/schema";
import { eq } from "drizzle-orm";

import type { SessionEnv } from "@deepnotes/session-core";
import { SessionError } from "@deepnotes/session-core";
import { userHasGroupPermission } from "@deepnotes/session-core";
import { getAuthenticatedUserSummary } from "@deepnotes/session-core";

function addMonths(d: Date, m: number): Date {
  const x = new Date(d.getTime());
  x.setMonth(x.getMonth() + m);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d.getTime());
  x.setDate(x.getDate() + n);
  return x;
}

function tsString(d: Date): string {
  return d.toISOString();
}

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

/** `groups.deletion.delete` — soft: schedule in ~1 month. */
export async function performGroupSoftDelete(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  groupId: string;
}): Promise<void> {
  const { userId } = await getAuthenticatedUserSummary({
    db: input.db,
    env: input.env,
    accessCookie: input.accessCookie,
  });
  await requireEditGroupSettings({ db: input.db, userId, groupId: input.groupId });

  const [g] = await input.db
    .select({ d: groups.permanentDeletionDate })
    .from(groups)
    .where(eq(groups.id, input.groupId))
    .limit(1);
  if (g == null) {
    throw new SessionError(404, "NOT_FOUND", "Group not found.");
  }
  if (g.d != null) {
    throw new SessionError(400, "BAD_REQUEST", "Group is already deleted.");
  }

  await input.db
    .update(groups)
    .set({ permanentDeletionDate: tsString(addMonths(new Date(), 1)) })
    .where(eq(groups.id, input.groupId));
}

/** `groups.deletion.restore` — only during soft-delete grace (future `permanent_deletion_date`). */
export async function performGroupRestore(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  groupId: string;
}): Promise<void> {
  const { userId } = await getAuthenticatedUserSummary({
    db: input.db,
    env: input.env,
    accessCookie: input.accessCookie,
  });
  await requireEditGroupSettings({ db: input.db, userId, groupId: input.groupId });

  const [g] = await input.db
    .select({ d: groups.permanentDeletionDate })
    .from(groups)
    .where(eq(groups.id, input.groupId))
    .limit(1);
  if (g == null) {
    throw new SessionError(404, "NOT_FOUND", "Group not found.");
  }
  if (g.d == null) {
    throw new SessionError(400, "BAD_REQUEST", "Group is not deleted.");
  }
  const end = new Date(g.d);
  if (end.getTime() <= Date.now()) {
    throw new SessionError(
      400,
      "BAD_REQUEST",
      "This group can no longer be restored.",
    );
  }

  await input.db
    .update(groups)
    .set({ permanentDeletionDate: null })
    .where(eq(groups.id, input.groupId));
}

/**
 * `groups.deletion.deletePermanently` — mark purged; allowed from active or grace state.
 * Legacy sets `permanent_deletion_date` in the past.
 */
export async function performGroupPurge(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  groupId: string;
}): Promise<void> {
  const { userId } = await getAuthenticatedUserSummary({
    db: input.db,
    env: input.env,
    accessCookie: input.accessCookie,
  });
  await requireEditGroupSettings({ db: input.db, userId, groupId: input.groupId });

  const [g] = await input.db
    .select({ d: groups.permanentDeletionDate })
    .from(groups)
    .where(eq(groups.id, input.groupId))
    .limit(1);
  if (g == null) {
    throw new SessionError(404, "NOT_FOUND", "Group not found.");
  }
  if (g.d != null && new Date(g.d).getTime() < Date.now()) {
    throw new SessionError(400, "BAD_REQUEST", "Group is already permanently deleted.");
  }

  await input.db
    .update(groups)
    .set({ permanentDeletionDate: tsString(addDays(new Date(), -1)) })
    .where(eq(groups.id, input.groupId));
}
