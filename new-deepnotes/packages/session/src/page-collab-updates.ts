import type { DeepnotesDb } from "@deepnotes/db/client";
import { pageUpdates, pages } from "@deepnotes/db/schema";
import { and, asc, eq, isNull, max } from "drizzle-orm";

import type { SessionEnv } from "./env.js";
import { SessionError } from "./errors.js";
import { userHasGroupPermission } from "./group-permissions.js";
import { getAuthenticatedUserSummary } from "./user-me.js";

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
}): Promise<{
  lastIndex: number | null;
  updates: { index: number; encryptedData: Buffer }[];
}> {
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

  const canView = await userHasGroupPermission({
    db: input.db,
    userId,
    groupId: pageRow.groupId,
    permission: "viewGroupPages",
  });
  if (!canView) {
    throw new SessionError(403, "FORBIDDEN", "Insufficient permissions.");
  }

  const rows = await input.db
    .select({
      index: pageUpdates.index,
      encryptedData: pageUpdates.encryptedData,
    })
    .from(pageUpdates)
    .where(eq(pageUpdates.pageId, input.pageId))
    .orderBy(asc(pageUpdates.index));

  if (rows.length === 0) {
    return { lastIndex: null, updates: [] };
  }

  const lastIndex = rows[rows.length - 1]!.index;
  return {
    lastIndex,
    updates: rows.map((r) => ({
      index: r.index,
      encryptedData: Buffer.from(r.encryptedData),
    })),
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
