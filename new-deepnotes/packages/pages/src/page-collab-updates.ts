import type { DeepnotesDb } from "@deepnotes/db/client";
import {
  groupMembers,
  groups,
  pageUpdates,
  pages,
  users,
} from "@deepnotes/db/schema";
import { and, asc, eq, gt, isNull, max } from "drizzle-orm";

import type { SessionEnv } from "@deepnotes/session-core";
import { SessionError } from "@deepnotes/session-core";
import { userHasGroupPermission } from "@deepnotes/session-core";
import { getAuthenticatedUserSummary } from "@deepnotes/session-core";

function toBuf(u: Uint8Array): Buffer {
  return Buffer.from(u);
}

/**
 * Load encrypted Yjs page updates from Postgres (legacy `page_updates`), ordered by `index`.
 * Complements future collab WebSocket: REST bootstrap without Redis cache.
 */
export async function performGetPageCollabUpdates(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  pageId: string;
  sinceIndex?: number | null;
  limit?: number;
}): Promise<{
  lastIndex: number | null;
  updates: { index: number; encryptedData: Buffer }[];
  groupId: string;
  pageEncryptedSymmetricKeyring: Buffer;
  pageEncryptedRelativeTitle: Buffer;
  pageEncryptedAbsoluteTitle: Buffer;
  groupEncryptedContentKeyring: Buffer;
  groupAccessKeyring: Buffer | null;
  memberEncryptedAccessKeyring: Buffer | null;
}> {
  const { userId } = await getAuthenticatedUserSummary({
    db: input.db,
    env: input.env,
    accessCookie: input.accessCookie,
  });

  const [pageRow] = await input.db
    .select({
      id: pages.id,
      groupId: pages.groupId,
      encryptedSymmetricKeyring: pages.encryptedSymmetricKeyring,
      encryptedRelativeTitle: pages.encryptedRelativeTitle,
      encryptedAbsoluteTitle: pages.encryptedAbsoluteTitle,
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

  const [groupRow] = await input.db
    .select({
      encryptedContentKeyring: groups.encryptedContentKeyring,
      accessKeyring: groups.accessKeyring,
    })
    .from(groups)
    .where(eq(groups.id, pageRow.groupId))
    .limit(1);

  if (groupRow == null) {
    throw new SessionError(404, "NOT_FOUND", "Group not found.");
  }

  const [memberRow] = await input.db
    .select({
      encryptedAccessKeyring: groupMembers.encryptedAccessKeyring,
    })
    .from(groupMembers)
    .where(
      and(
        eq(groupMembers.groupId, pageRow.groupId),
        eq(groupMembers.userId, userId),
      ),
    )
    .limit(1);

  const effectiveLimit = Math.min(input.limit ?? 100, 100);

  const rows = await input.db
    .select({
      index: pageUpdates.index,
      encryptedData: pageUpdates.encryptedData,
    })
    .from(pageUpdates)
    .where(
      and(
        eq(pageUpdates.pageId, input.pageId),
        input.sinceIndex != null
          ? gt(pageUpdates.index, input.sinceIndex)
          : undefined,
      ),
    )
    .orderBy(asc(pageUpdates.index))
    .limit(effectiveLimit);

  const cryptoOut = {
    groupId: pageRow.groupId,
    pageEncryptedSymmetricKeyring: Buffer.from(pageRow.encryptedSymmetricKeyring),
    pageEncryptedRelativeTitle: Buffer.from(pageRow.encryptedRelativeTitle),
    pageEncryptedAbsoluteTitle: Buffer.from(pageRow.encryptedAbsoluteTitle),
    groupEncryptedContentKeyring: Buffer.from(groupRow.encryptedContentKeyring),
    groupAccessKeyring:
      groupRow.accessKeyring != null ? Buffer.from(groupRow.accessKeyring) : null,
    memberEncryptedAccessKeyring:
      memberRow?.encryptedAccessKeyring != null
        ? Buffer.from(memberRow.encryptedAccessKeyring)
        : null,
  };

  if (rows.length === 0) {
    return { lastIndex: null, updates: [], ...cryptoOut };
  }

  const lastIndex = rows[rows.length - 1]!.index;
  return {
    lastIndex,
    updates: rows.map((r) => ({
      index: r.index,
      encryptedData: Buffer.from(r.encryptedData),
    })),
    ...cryptoOut,
  };
}

/**
 * Append new `page_updates` rows with optimistic concurrency on the last index.
 */
export async function performAppendPageCollabUpdates(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  pageId: string;
  expectedLastIndex: number | null;
  updates: { index: number; encryptedData: Uint8Array }[];
}): Promise<void> {
  const { userId } = await getAuthenticatedUserSummary({
    db: input.db,
    env: input.env,
    accessCookie: input.accessCookie,
  });

  const [pageRow] = await input.db
    .select({ id: pages.id, groupId: pages.groupId })
    .from(pages)
    .where(
      and(eq(pages.id, input.pageId), isNull(pages.permanentDeletionDate)),
    )
    .limit(1);

  if (pageRow == null) {
    throw new SessionError(404, "NOT_FOUND", "Page not found.");
  }

  const canEdit = await userHasGroupPermission({
    db: input.db,
    userId,
    groupId: pageRow.groupId,
    permission: "editGroupPages",
  });
  if (!canEdit) {
    throw new SessionError(403, "FORBIDDEN", "Insufficient permissions.");
  }

  const sorted = [...input.updates].sort((a, b) => a.index - b.index);
  if (sorted.length === 0) {
    throw new SessionError(400, "BAD_REQUEST", "No updates to append.");
  }
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i]!.index === sorted[i - 1]!.index) {
      throw new SessionError(400, "BAD_REQUEST", "Duplicate update index.");
    }
  }

  await input.db.transaction(async (tx) => {
    const [agg] = await tx
      .select({ m: max(pageUpdates.index) })
      .from(pageUpdates)
      .where(eq(pageUpdates.pageId, input.pageId));

    const actualLast: number | null = agg?.m ?? null;

    if (actualLast === null) {
      if (input.expectedLastIndex !== null) {
        throw new SessionError(
          400,
          "BAD_REQUEST",
          "expectedLastIndex must be null when there are no updates.",
        );
      }
    } else if (input.expectedLastIndex !== actualLast) {
      throw new SessionError(
        409,
        "CONFLICT",
        "Page updates were modified by another client.",
      );
    }

    const start = actualLast === null ? -1 : actualLast;
    for (let i = 0; i < sorted.length; i++) {
      const expectedIdx = start + 1 + i;
      if (sorted[i]!.index !== expectedIdx) {
        throw new SessionError(
          400,
          "BAD_REQUEST",
          "Update indices must be contiguous after the current last index.",
        );
      }
    }

    await tx.insert(pageUpdates).values(
      sorted.map((u) => ({
        pageId: input.pageId,
        index: u.index,
        encryptedData: toBuf(u.encryptedData),
      })),
    );
  });
}

/**
 * Append one `page_updates` row using the next contiguous index.
 * For **internal** calls only (collab WebSocket worker route) after shared-secret auth;
 * `userId` must match an editor allowed on the page (and Pro vs free-page like legacy collab).
 */
export async function performTrustedAppendNextPageCollabUpdate(input: {
  db: DeepnotesDb;
  pageId: string;
  userId: string;
  encryptedData: Uint8Array;
}): Promise<{ newIndex: number }> {
  const [pageRow] = await input.db
    .select({
      id: pages.id,
      groupId: pages.groupId,
      free: pages.free,
    })
    .from(pages)
    .where(
      and(eq(pages.id, input.pageId), isNull(pages.permanentDeletionDate)),
    )
    .limit(1);

  if (pageRow == null) {
    throw new SessionError(404, "NOT_FOUND", "Page not found.");
  }

  const canEdit = await userHasGroupPermission({
    db: input.db,
    userId: input.userId,
    groupId: pageRow.groupId,
    permission: "editGroupPages",
  });
  if (!canEdit) {
    throw new SessionError(403, "FORBIDDEN", "Insufficient permissions.");
  }

  const [userRow] = await input.db
    .select({ plan: users.plan })
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);

  const isPro = userRow?.plan === "pro";
  const pageFree = pageRow.free === true;
  if (!isPro && !pageFree) {
    throw new SessionError(
      403,
      "FORBIDDEN",
      "Editing this page requires a Pro plan.",
    );
  }

  return await input.db.transaction(async (tx) => {
    const [agg] = await tx
      .select({ m: max(pageUpdates.index) })
      .from(pageUpdates)
      .where(eq(pageUpdates.pageId, input.pageId));

    const actualLast: number | null = agg?.m ?? null;
    const nextIndex = actualLast === null ? 0 : actualLast + 1;

    await tx.insert(pageUpdates).values({
      pageId: input.pageId,
      index: nextIndex,
      encryptedData: toBuf(input.encryptedData),
    });

    return { newIndex: nextIndex };
  });
}

/**
 * Lightweight trusted check for whether a user may still edit a page.
 * For DO alarm-based auth revocation checks (no session cookie required).
 */
export async function performTrustedVerifyPageCollabAccess(input: {
  db: DeepnotesDb;
  userId: string;
  pageId: string;
}): Promise<{ allowed: boolean }> {
  const [pageRow] = await input.db
    .select({
      id: pages.id,
      groupId: pages.groupId,
      free: pages.free,
    })
    .from(pages)
    .where(
      and(eq(pages.id, input.pageId), isNull(pages.permanentDeletionDate)),
    )
    .limit(1);

  if (pageRow == null) {
    return { allowed: false };
  }

  const canEdit = await userHasGroupPermission({
    db: input.db,
    userId: input.userId,
    groupId: pageRow.groupId,
    permission: "editGroupPages",
  });
  if (!canEdit) {
    return { allowed: false };
  }

  const [userRow] = await input.db
    .select({ plan: users.plan })
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);

  const isPro = userRow?.plan === "pro";
  const pageFree = pageRow.free === true;
  if (!isPro && !pageFree) {
    return { allowed: false };
  }

  return { allowed: true };
}

/** HTTP + WS gate: authenticated editor, Pro-or-free-page (matches legacy collab publish rules). */
export async function assertPageCollabWsConnectionAllowed(input: {
  db: DeepnotesDb;
  userId: string;
  pageId: string;
}): Promise<void> {
  const [pageRow] = await input.db
    .select({
      id: pages.id,
      groupId: pages.groupId,
      free: pages.free,
    })
    .from(pages)
    .where(
      and(eq(pages.id, input.pageId), isNull(pages.permanentDeletionDate)),
    )
    .limit(1);

  if (pageRow == null) {
    throw new SessionError(404, "NOT_FOUND", "Page not found.");
  }

  const canEdit = await userHasGroupPermission({
    db: input.db,
    userId: input.userId,
    groupId: pageRow.groupId,
    permission: "editGroupPages",
  });
  if (!canEdit) {
    throw new SessionError(403, "FORBIDDEN", "Insufficient permissions.");
  }

  const [userRow] = await input.db
    .select({ plan: users.plan })
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);

  const isPro = userRow?.plan === "pro";
  const pageFree = pageRow.free === true;
  if (!isPro && !pageFree) {
    throw new SessionError(
      403,
      "FORBIDDEN",
      "Editing this page requires a Pro plan.",
    );
  }
}
