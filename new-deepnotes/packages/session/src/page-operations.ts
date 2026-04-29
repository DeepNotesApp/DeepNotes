import type { DeepnotesDb } from "@deepnotes/db/client";
import {
  groupMembers,
  groups,
  pageLinks,
  pageSnapshots,
  pages,
  users,
  usersPages,
} from "@deepnotes/db/schema";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import type { SessionEnv } from "./env.js";
import { SessionError } from "./errors.js";
import { userHasGroupPermission } from "./group-permissions.js";
import { assertUserProPlan } from "./user-plan.js";
import { getAuthenticatedUserSummary } from "./user-me.js";

function tsString(d: Date): string {
  return d.toISOString();
}

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

function toBuf(u: Uint8Array): Buffer {
  return Buffer.from(u);
}

function bumpStringIdList(ids: string[], itemId: string, max: number): string[] {
  const rest = ids.filter((id) => id !== itemId);
  return [itemId, ...rest].slice(0, max);
}

/**
 * `pages.bump` — recents, optional breadcrumb parent under personal main, activity dates.
 * Replaces legacy KeyDB + partial best-effort SQL updates.
 */
export async function performPageBump(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  pageId: string;
  parentPageId?: string | undefined;
}): Promise<void> {
  const { userId, personalGroupId } = await getAuthenticatedUserSummary({
    db: input.db,
    env: input.env,
    accessCookie: input.accessCookie,
  });

  const [pageRow] = await input.db
    .select({
      id: pages.id,
      groupId: pages.groupId,
    })
    .from(pages)
    .where(
      and(eq(pages.id, input.pageId), isNull(pages.permanentDeletionDate)),
    )
    .limit(1);

  if (pageRow == null) {
    throw new SessionError(404, "NOT_FOUND", "Page not found.");
  }

  const canView = await userHasGroupPermission({
    db: input.db,
    userId,
    groupId: pageRow.groupId,
    permission: "viewGroupPages",
  });
  if (!canView) {
    throw new SessionError(403, "FORBIDDEN", "Insufficient permissions.");
  }

  const now = tsString(new Date());

  if (input.parentPageId != null) {
    const [personal] = await input.db
      .select({ mainPageId: groups.mainPageId })
      .from(groups)
      .where(eq(groups.id, personalGroupId))
      .limit(1);
    if (personal == null) {
      throw new SessionError(404, "NOT_FOUND", "Personal group not found.");
    }

    const visited = new Set<string>([input.pageId]);
    let walkId: string | undefined = input.parentPageId;
    let rootPageId: string | undefined;
    while (walkId != null) {
      if (visited.has(walkId)) {
        return;
      }
      visited.add(walkId);
      rootPageId = walkId;
      const [up] = await input.db
        .select({ lastParentId: usersPages.lastParentId })
        .from(usersPages)
        .where(
          and(
            eq(usersPages.userId, userId),
            eq(usersPages.pageId, walkId),
          ),
        )
        .limit(1);
      walkId = up?.lastParentId ?? undefined;
    }

    if (rootPageId !== personal.mainPageId) {
      throw new SessionError(400, "BAD_REQUEST", "Invalid parent page.");
    }

    await input.db
      .insert(usersPages)
      .values({
        userId,
        pageId: input.pageId,
        lastParentId: input.parentPageId,
      })
      .onConflictDoUpdate({
        target: [usersPages.userId, usersPages.pageId],
        set: { lastParentId: input.parentPageId },
      });

    try {
      await input.db
        .insert(pageLinks)
        .values({
          targetPageId: input.pageId,
          sourcePageId: input.parentPageId,
          lastActivityDate: now,
        })
        .onConflictDoUpdate({
          target: [pageLinks.sourcePageId, pageLinks.targetPageId],
          set: { lastActivityDate: now },
        });
    } catch {
      // ignore: legacy ignored backlink errors
    }
  }

  const [urow] = await input.db
    .select({
      recentPageIds: users.recentPageIds,
      recentGroupIds: users.recentGroupIds,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (urow == null) {
    throw new SessionError(404, "NOT_FOUND", "User not found.");
  }

  const nextRecentPages = bumpStringIdList(urow.recentPageIds, input.pageId, 50);
  const nextRecentGroups = bumpStringIdList(
    urow.recentGroupIds,
    pageRow.groupId,
    50,
  );

  await input.db
    .update(users)
    .set({
      startingPageId: input.pageId,
      recentPageIds: nextRecentPages,
      recentGroupIds: nextRecentGroups,
    })
    .where(eq(users.id, userId));

  await input.db
    .update(pages)
    .set({ lastActivityDate: now })
    .where(eq(pages.id, input.pageId));

  await input.db
    .update(groupMembers)
    .set({ lastActivityDate: now })
    .where(
      and(
        eq(groupMembers.groupId, pageRow.groupId),
        eq(groupMembers.userId, userId),
      ),
    );
}

export async function performPageBacklinkCreate(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  targetPageId: string;
  sourcePageId: string;
}): Promise<void> {
  const { userId } = await getAuthenticatedUserSummary({
    db: input.db,
    env: input.env,
    accessCookie: input.accessCookie,
  });

  if (input.sourcePageId === input.targetPageId) {
    throw new SessionError(400, "BAD_REQUEST", "Source and target must differ.");
  }

  const [src, tgt] = await Promise.all([
    input.db
      .select({ groupId: pages.groupId })
      .from(pages)
      .where(
        and(
          eq(pages.id, input.sourcePageId),
          isNull(pages.permanentDeletionDate),
        ),
      )
      .limit(1),
    input.db
      .select({ groupId: pages.groupId })
      .from(pages)
      .where(
        and(
          eq(pages.id, input.targetPageId),
          isNull(pages.permanentDeletionDate),
        ),
      )
      .limit(1),
  ]);

  if (src[0] == null || tgt[0] == null) {
    throw new SessionError(404, "NOT_FOUND", "Page not found.");
  }

  const canSource = await userHasGroupPermission({
    db: input.db,
    userId,
    groupId: src[0].groupId,
    permission: "editGroupPages",
  });
  const canTarget = await userHasGroupPermission({
    db: input.db,
    userId,
    groupId: tgt[0].groupId,
    permission: "editGroupPages",
  });
  if (!canSource || !canTarget) {
    throw new SessionError(403, "FORBIDDEN", "Insufficient permissions.");
  }

  const now = tsString(new Date());
  await input.db
    .insert(pageLinks)
    .values({
      targetPageId: input.targetPageId,
      sourcePageId: input.sourcePageId,
      lastActivityDate: now,
    })
    .onConflictDoUpdate({
      target: [pageLinks.sourcePageId, pageLinks.targetPageId],
      set: { lastActivityDate: now },
    });
}

export async function performPageBacklinkDelete(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  targetPageId: string;
  sourcePageId: string;
}): Promise<void> {
  const { userId } = await getAuthenticatedUserSummary({
    db: input.db,
    env: input.env,
    accessCookie: input.accessCookie,
  });

  const [tgt] = await input.db
    .select({ groupId: pages.groupId })
    .from(pages)
    .where(
      and(
        eq(pages.id, input.targetPageId),
        isNull(pages.permanentDeletionDate),
      ),
    )
    .limit(1);
  if (tgt == null) {
    throw new SessionError(404, "NOT_FOUND", "Page not found.");
  }

  const can = await userHasGroupPermission({
    db: input.db,
    userId,
    groupId: tgt.groupId,
    permission: "editGroupPages",
  });
  if (!can) {
    throw new SessionError(403, "FORBIDDEN", "Insufficient permissions.");
  }

  const del = await input.db
    .delete(pageLinks)
    .where(
      and(
        eq(pageLinks.sourcePageId, input.sourcePageId),
        eq(pageLinks.targetPageId, input.targetPageId),
      ),
    )
    .returning({ s: pageLinks.sourcePageId });
  if (del.length === 0) {
    throw new SessionError(404, "NOT_FOUND", "Backlink not found.");
  }
}

export async function performPageSnapshotSave(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  pageId: string;
  encryptedSymmetricKey: Uint8Array;
  encryptedData: Uint8Array;
  preRestore?: boolean | undefined;
}): Promise<{ snapshotId: string }> {
  const { userId } = await getAuthenticatedUserSummary({
    db: input.db,
    env: input.env,
    accessCookie: input.accessCookie,
  });
  await assertUserProPlan({ db: input.db, userId });

  const [pageRow] = await input.db
    .select({ groupId: pages.groupId })
    .from(pages)
    .where(
      and(eq(pages.id, input.pageId), isNull(pages.permanentDeletionDate)),
    )
    .limit(1);
  if (pageRow == null) {
    throw new SessionError(404, "NOT_FOUND", "Page not found.");
  }
  const can = await userHasGroupPermission({
    db: input.db,
    userId,
    groupId: pageRow.groupId,
    permission: "editGroupPages",
  });
  if (!can) {
    throw new SessionError(403, "FORBIDDEN", "Insufficient permissions.");
  }

  const type = input.preRestore === true ? "pre-restore" : "manual";

  return input.db.transaction(async (tx) => {
    const [row] = await tx
      .insert(pageSnapshots)
      .values({
        pageId: input.pageId,
        authorId: userId,
        encryptedSymmetricKey: toBuf(input.encryptedSymmetricKey),
        encryptedData: toBuf(input.encryptedData),
        type,
      })
      .returning({ id: pageSnapshots.id });

    if (row == null) {
      throw new SessionError(500, "SERVER_MISCONFIG", "Snapshot insert failed.");
    }

    const ordered = await tx
      .select({ id: pageSnapshots.id, creationDate: pageSnapshots.creationDate })
      .from(pageSnapshots)
      .where(eq(pageSnapshots.pageId, input.pageId))
      .orderBy(desc(pageSnapshots.creationDate));

    const list = [...ordered];
    const toDelete: string[] = [];
    while (
      list.length > 10 &&
      new Date() >
        addDays(new Date(list[list.length - 1]!.creationDate), 14)
    ) {
      toDelete.push(list.pop()!.id);
    }
    if (toDelete.length > 0) {
      await tx
        .delete(pageSnapshots)
        .where(inArray(pageSnapshots.id, toDelete));
    }

    return { snapshotId: row.id };
  });
}

/**
 * Lists snapshot metadata for a page (new read; legacy listed via tRPC shapes).
 */
export async function performPageSnapshotList(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  pageId: string;
}): Promise<{
  snapshots: { snapshotId: string; creationDate: string; type: string }[];
}> {
  const { userId } = await getAuthenticatedUserSummary({
    db: input.db,
    env: input.env,
    accessCookie: input.accessCookie,
  });
  await assertUserProPlan({ db: input.db, userId });

  const [pageRow] = await input.db
    .select({ groupId: pages.groupId })
    .from(pages)
    .where(
      and(eq(pages.id, input.pageId), isNull(pages.permanentDeletionDate)),
    )
    .limit(1);
  if (pageRow == null) {
    throw new SessionError(404, "NOT_FOUND", "Page not found.");
  }
  const can = await userHasGroupPermission({
    db: input.db,
    userId,
    groupId: pageRow.groupId,
    permission: "editGroupPages",
  });
  if (!can) {
    throw new SessionError(403, "FORBIDDEN", "Insufficient permissions.");
  }

  const rows = await input.db
    .select({
      id: pageSnapshots.id,
      creationDate: pageSnapshots.creationDate,
      type: pageSnapshots.type,
    })
    .from(pageSnapshots)
    .where(eq(pageSnapshots.pageId, input.pageId))
    .orderBy(desc(pageSnapshots.creationDate));

  return {
    snapshots: rows.map((r) => ({
      snapshotId: r.id,
      creationDate: r.creationDate,
      type: r.type,
    })),
  };
}

export async function performPageSnapshotLoad(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  pageId: string;
  snapshotId: string;
}): Promise<{
  encryptedSymmetricKey: Buffer | null;
  encryptedData: Buffer;
}> {
  const { userId } = await getAuthenticatedUserSummary({
    db: input.db,
    env: input.env,
    accessCookie: input.accessCookie,
  });
  await assertUserProPlan({ db: input.db, userId });

  const [pageRow] = await input.db
    .select({ groupId: pages.groupId })
    .from(pages)
    .where(
      and(eq(pages.id, input.pageId), isNull(pages.permanentDeletionDate)),
    )
    .limit(1);
  if (pageRow == null) {
    throw new SessionError(404, "NOT_FOUND", "Page not found.");
  }
  const can = await userHasGroupPermission({
    db: input.db,
    userId,
    groupId: pageRow.groupId,
    permission: "editGroupPages",
  });
  if (!can) {
    throw new SessionError(403, "FORBIDDEN", "Insufficient permissions.");
  }

  const [snap] = await input.db
    .select({
      encryptedSymmetricKey: pageSnapshots.encryptedSymmetricKey,
      encryptedData: pageSnapshots.encryptedData,
    })
    .from(pageSnapshots)
    .where(
      and(
        eq(pageSnapshots.id, input.snapshotId),
        eq(pageSnapshots.pageId, input.pageId),
      ),
    )
    .limit(1);
  if (snap == null) {
    throw new SessionError(404, "NOT_FOUND", "Snapshot not found.");
  }

  return {
    encryptedSymmetricKey: snap.encryptedSymmetricKey,
    encryptedData: snap.encryptedData,
  };
}

export async function performPageSnapshotDelete(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  pageId: string;
  snapshotId: string;
}): Promise<void> {
  const { userId } = await getAuthenticatedUserSummary({
    db: input.db,
    env: input.env,
    accessCookie: input.accessCookie,
  });

  const [pageRow] = await input.db
    .select({ groupId: pages.groupId })
    .from(pages)
    .where(
      and(eq(pages.id, input.pageId), isNull(pages.permanentDeletionDate)),
    )
    .limit(1);
  if (pageRow == null) {
    throw new SessionError(404, "NOT_FOUND", "Page not found.");
  }
  const can = await userHasGroupPermission({
    db: input.db,
    userId,
    groupId: pageRow.groupId,
    permission: "editGroupPages",
  });
  if (!can) {
    throw new SessionError(403, "FORBIDDEN", "Insufficient permissions.");
  }

  const removed = await input.db
    .delete(pageSnapshots)
    .where(
      and(
        eq(pageSnapshots.id, input.snapshotId),
        eq(pageSnapshots.pageId, input.pageId),
      ),
    )
    .returning({ id: pageSnapshots.id });
  if (removed.length === 0) {
    throw new SessionError(404, "NOT_FOUND", "Snapshot not found.");
  }
}

export async function performPageSoftDelete(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  pageId: string;
}): Promise<void> {
  const { userId } = await getAuthenticatedUserSummary({
    db: input.db,
    env: input.env,
    accessCookie: input.accessCookie,
  });

  const [pre] = await input.db
    .select({
      groupId: pages.groupId,
      permanentDeletionDate: pages.permanentDeletionDate,
    })
    .from(pages)
    .where(eq(pages.id, input.pageId))
    .limit(1);
  if (pre == null) {
    throw new SessionError(404, "NOT_FOUND", "Page not found.");
  }
  if (pre.permanentDeletionDate != null) {
    throw new SessionError(400, "BAD_REQUEST", "Page is already deleted.");
  }

  const can = await userHasGroupPermission({
    db: input.db,
    userId,
    groupId: pre.groupId,
    permission: "editGroupPages",
  });
  if (!can) {
    throw new SessionError(403, "FORBIDDEN", "Insufficient permissions.");
  }

  const [g] = await input.db
    .select({ mainPageId: groups.mainPageId })
    .from(groups)
    .where(eq(groups.id, pre.groupId))
    .limit(1);
  if (g == null) {
    throw new SessionError(404, "NOT_FOUND", "Group not found.");
  }
  if (g.mainPageId === input.pageId) {
    throw new SessionError(
      400,
      "BAD_REQUEST",
      "Cannot delete a group's main page, either replace the main page first or delete the whole group.",
    );
  }

  await input.db
    .update(pages)
    .set({ permanentDeletionDate: tsString(addMonths(new Date(), 1)) })
    .where(eq(pages.id, input.pageId));
}

export async function performPageRestore(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  pageId: string;
}): Promise<void> {
  const { userId } = await getAuthenticatedUserSummary({
    db: input.db,
    env: input.env,
    accessCookie: input.accessCookie,
  });

  const [pre] = await input.db
    .select({
      groupId: pages.groupId,
      permanentDeletionDate: pages.permanentDeletionDate,
      free: pages.free,
    })
    .from(pages)
    .where(eq(pages.id, input.pageId))
    .limit(1);
  if (pre == null) {
    throw new SessionError(404, "NOT_FOUND", "Page not found.");
  }
  if (pre.permanentDeletionDate == null) {
    throw new SessionError(400, "BAD_REQUEST", "Page is not deleted.");
  }

  const can = await userHasGroupPermission({
    db: input.db,
    userId,
    groupId: pre.groupId,
    permission: "editGroupPages",
  });
  if (!can) {
    throw new SessionError(403, "FORBIDDEN", "Insufficient permissions.");
  }

  if (
    new Date() > new Date(pre.permanentDeletionDate) &&
    pre.free === true
  ) {
    throw new SessionError(
      400,
      "BAD_REQUEST",
      "Cannot restore a permanently deleted free page.",
    );
  }

  await input.db
    .update(pages)
    .set({ permanentDeletionDate: null })
    .where(eq(pages.id, input.pageId));
}

export async function performPagePurge(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  pageId: string;
}): Promise<void> {
  const { userId } = await getAuthenticatedUserSummary({
    db: input.db,
    env: input.env,
    accessCookie: input.accessCookie,
  });

  const [pre] = await input.db
    .select({
      groupId: pages.groupId,
      permanentDeletionDate: pages.permanentDeletionDate,
      free: pages.free,
    })
    .from(pages)
    .where(eq(pages.id, input.pageId))
    .limit(1);
  if (pre == null) {
    throw new SessionError(404, "NOT_FOUND", "Page not found.");
  }

  if (
    pre.permanentDeletionDate != null &&
    new Date() > new Date(pre.permanentDeletionDate)
  ) {
    throw new SessionError(
      400,
      "BAD_REQUEST",
      "Page is already permanently deleted.",
    );
  }

  const can = await userHasGroupPermission({
    db: input.db,
    userId,
    groupId: pre.groupId,
    permission: "editGroupPages",
  });
  if (!can) {
    throw new SessionError(403, "FORBIDDEN", "Insufficient permissions.");
  }

  const [g] = await input.db
    .select({ mainPageId: groups.mainPageId })
    .from(groups)
    .where(eq(groups.id, pre.groupId))
    .limit(1);
  if (g == null) {
    throw new SessionError(404, "NOT_FOUND", "Group not found.");
  }
  if (g.mainPageId === input.pageId) {
    throw new SessionError(
      400,
      "BAD_REQUEST",
      "Cannot delete a group's main page, either replace the main page first or delete the whole group.",
    );
  }

  let numForUser: number | undefined;
  if (pre.free === true) {
    const [u] = await input.db
      .select({ numFreePages: users.numFreePages })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (u != null) {
      numForUser = u.numFreePages + 1;
    }
  }

  await input.db.transaction(async (tx) => {
    if (numForUser != null) {
      await tx
        .update(users)
        .set({ numFreePages: numForUser })
        .where(eq(users.id, userId));
    }
    await tx
      .update(pages)
      .set({ permanentDeletionDate: tsString(addDays(new Date(), -1)) })
      .where(eq(pages.id, input.pageId));
  });
}
