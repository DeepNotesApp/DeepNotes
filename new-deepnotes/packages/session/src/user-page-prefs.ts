import type { DeepnotesDb } from "@deepnotes/db/client";
import {
  groups,
  notifications,
  pages,
  users,
  usersNotifications,
  usersPages,
} from "@deepnotes/db/schema";
import { and, desc, eq, isNull, lt } from "drizzle-orm";

import type { SessionEnv } from "./env.js";
import { SessionError } from "./errors.js";
import { getAuthenticatedUserSummary } from "./user-me.js";

function toBuf(u: Uint8Array): Buffer {
  return Buffer.from(u);
}

function b64(buf: Buffer): string {
  return buf.toString("base64");
}

function unionPageIds(preferred: string[], existing: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of preferred) {
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  for (const id of existing) {
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

async function getPathPageIds(input: {
  db: DeepnotesDb;
  userId: string;
  initialPageId: string;
  mainPageId: string;
}): Promise<string[] | undefined> {
  const pathPageIds: string[] = [];
  const visited = new Set<string>();
  let pathPageId: string | null = input.initialPageId;

  while (pathPageId != null) {
    if (visited.has(pathPageId)) {
      return undefined;
    }
    visited.add(pathPageId);
    pathPageIds.unshift(pathPageId);
    if (pathPageId === input.mainPageId) {
      return pathPageIds;
    }

    const [up] = await input.db
      .select({ lastParentId: usersPages.lastParentId })
      .from(usersPages)
      .where(
        and(
          eq(usersPages.userId, input.userId),
          eq(usersPages.pageId, pathPageId),
        ),
      )
      .limit(1);

    pathPageId = up?.lastParentId ?? null;
  }
  return undefined;
}

export async function performGetStartingPageId(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
}): Promise<{ startingPageId: string }> {
  const { userId } = await getAuthenticatedUserSummary(input);

  const [row] = await input.db
    .select({ startingPageId: users.startingPageId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (row == null) {
    throw new SessionError(404, "NOT_FOUND", "User not found.");
  }

  return { startingPageId: row.startingPageId };
}

/**
 * Replaces legacy `users.pages.getCurrentPath` (KeyDB `user-page` chain + repair).
 */
export async function performGetCurrentPath(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  initialPageId: string;
}): Promise<{ pathPageIds: string[] }> {
  const { userId } = await getAuthenticatedUserSummary(input);

  const [pageRow] = await input.db
    .select({ id: pages.id })
    .from(pages)
    .where(
      and(eq(pages.id, input.initialPageId), isNull(pages.permanentDeletionDate)),
    )
    .limit(1);

  if (pageRow == null) {
    throw new SessionError(404, "NOT_FOUND", "This page does not exist.");
  }

  const [userRow] = await input.db
    .select({
      personalGroupId: users.personalGroupId,
      startingPageId: users.startingPageId,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (userRow == null) {
    throw new SessionError(404, "NOT_FOUND", "User not found.");
  }

  const [groupRow] = await input.db
    .select({ mainPageId: groups.mainPageId })
    .from(groups)
    .where(eq(groups.id, userRow.personalGroupId))
    .limit(1);

  if (groupRow == null) {
    throw new SessionError(404, "NOT_FOUND", "Personal group not found.");
  }

  let path = await getPathPageIds({
    db: input.db,
    userId,
    initialPageId: input.initialPageId,
    mainPageId: groupRow.mainPageId,
  });

  if (path != null) {
    return { pathPageIds: path };
  }

  const newParent =
    input.initialPageId === userRow.startingPageId
      ? groupRow.mainPageId
      : userRow.startingPageId;

  await input.db
    .insert(usersPages)
    .values({
      userId,
      pageId: input.initialPageId,
      lastParentId: newParent,
    })
    .onConflictDoUpdate({
      target: [usersPages.userId, usersPages.pageId],
      set: { lastParentId: newParent },
    });

  path = await getPathPageIds({
    db: input.db,
    userId,
    initialPageId: input.initialPageId,
    mainPageId: groupRow.mainPageId,
  });

  if (path == null) {
    throw new SessionError(
      500,
      "SERVER_MISCONFIG",
      "Could not resolve page path after repair.",
    );
  }

  return { pathPageIds: path };
}

export async function performRemoveRecentPages(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  pageIds: string[];
}): Promise<void> {
  const { userId } = await getAuthenticatedUserSummary(input);

  const [row] = await input.db
    .select({ recentPageIds: users.recentPageIds })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (row == null) {
    throw new SessionError(404, "NOT_FOUND", "User not found.");
  }

  const remove = new Set(input.pageIds);
  const next = row.recentPageIds.filter((id) => !remove.has(id));
  if (next.length === row.recentPageIds.length) {
    throw new SessionError(404, "NOT_FOUND", "Recent page not found.");
  }

  await input.db
    .update(users)
    .set({ recentPageIds: next })
    .where(eq(users.id, userId));
}

export async function performClearRecentPages(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
}): Promise<void> {
  const { userId } = await getAuthenticatedUserSummary(input);
  await input.db
    .update(users)
    .set({ recentPageIds: [] })
    .where(eq(users.id, userId));
}

export async function performAddFavoritePages(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  pageIds: string[];
}): Promise<void> {
  const { userId } = await getAuthenticatedUserSummary(input);

  const [row] = await input.db
    .select({ favoritePageIds: users.favoritePageIds })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (row == null) {
    throw new SessionError(404, "NOT_FOUND", "User not found.");
  }

  const next = unionPageIds(input.pageIds, row.favoritePageIds);
  await input.db
    .update(users)
    .set({ favoritePageIds: next })
    .where(eq(users.id, userId));
}

export async function performRemoveFavoritePages(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  pageIds: string[];
}): Promise<void> {
  const { userId } = await getAuthenticatedUserSummary(input);

  const [row] = await input.db
    .select({ favoritePageIds: users.favoritePageIds })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (row == null) {
    throw new SessionError(404, "NOT_FOUND", "User not found.");
  }

  const remove = new Set(input.pageIds);
  const next = row.favoritePageIds.filter((id) => !remove.has(id));
  if (next.length === row.favoritePageIds.length) {
    throw new SessionError(404, "NOT_FOUND", "Favorite page not found.");
  }

  await input.db
    .update(users)
    .set({ favoritePageIds: next })
    .where(eq(users.id, userId));
}

export async function performClearFavoritePages(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
}): Promise<void> {
  const { userId } = await getAuthenticatedUserSummary(input);
  await input.db
    .update(users)
    .set({ favoritePageIds: [] })
    .where(eq(users.id, userId));
}

export async function performPatchDefaultNote(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  userEncryptedDefaultNote: Uint8Array;
}): Promise<void> {
  const { userId } = await getAuthenticatedUserSummary(input);
  await input.db
    .update(users)
    .set({ encryptedDefaultNote: toBuf(input.userEncryptedDefaultNote) })
    .where(eq(users.id, userId));
}

export async function performPatchDefaultArrow(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  userEncryptedDefaultArrow: Uint8Array;
}): Promise<void> {
  const { userId } = await getAuthenticatedUserSummary(input);
  await input.db
    .update(users)
    .set({ encryptedDefaultArrow: toBuf(input.userEncryptedDefaultArrow) })
    .where(eq(users.id, userId));
}

export type UserNotificationItemDto = {
  id: number;
  type: string;
  encryptedSymmetricKey: string;
  encryptedContent: string;
  dateTime: string;
};

export async function performLoadNotifications(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  lastNotificationId?: number | undefined;
}): Promise<{
  items: UserNotificationItemDto[];
  hasMore: boolean;
  lastNotificationRead?: number | null;
}> {
  const { userId } = await getAuthenticatedUserSummary(input);

  const whereClause =
    input.lastNotificationId != null
      ? and(
          eq(usersNotifications.userId, userId),
          lt(usersNotifications.notificationId, input.lastNotificationId),
        )
      : eq(usersNotifications.userId, userId);

  const rows = await input.db
    .select({
      id: notifications.id,
      type: notifications.type,
      encSym: usersNotifications.encryptedSymmetricKey,
      encContent: notifications.encryptedContent,
      datetime: notifications.datetime,
    })
    .from(usersNotifications)
    .innerJoin(
      notifications,
      eq(usersNotifications.notificationId, notifications.id),
    )
    .where(whereClause)
    .orderBy(desc(usersNotifications.notificationId))
    .limit(21);

  const hasMore = rows.length > 20;
  const slice = hasMore ? rows.slice(0, 20) : rows;

  let lastNotificationRead: number | null | undefined;
  if (input.lastNotificationId == null) {
    const [u] = await input.db
      .select({ lastNotificationRead: users.lastNotificationRead })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    lastNotificationRead = u?.lastNotificationRead ?? null;
  }

  return {
    items: slice.map((r) => ({
      id: r.id,
      type: r.type,
      encryptedSymmetricKey: b64(r.encSym),
      encryptedContent: b64(r.encContent),
      dateTime: r.datetime,
    })),
    hasMore,
    ...(input.lastNotificationId == null
      ? { lastNotificationRead }
      : {}),
  };
}

export async function performMarkNotificationsRead(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
}): Promise<void> {
  const { userId } = await getAuthenticatedUserSummary(input);

  const [last] = await input.db
    .select({ notificationId: usersNotifications.notificationId })
    .from(usersNotifications)
    .where(eq(usersNotifications.userId, userId))
    .orderBy(desc(usersNotifications.notificationId))
    .limit(1);

  if (last == null) {
    return;
  }

  await input.db
    .update(users)
    .set({ lastNotificationRead: last.notificationId })
    .where(eq(users.id, userId));
}
