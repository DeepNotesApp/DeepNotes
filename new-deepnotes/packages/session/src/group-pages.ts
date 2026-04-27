import type { DeepnotesDb } from "@deepnotes/db/client";
import { groupMembers, groups, pages, users, usersPages } from "@deepnotes/db/schema";
import { and, desc, eq, isNull, lt } from "drizzle-orm";

import { ensureSodiumReady } from "./crypto/session-crypto.js";
import type { SessionEnv } from "./env.js";
import { SessionError } from "./errors.js";
import {
  insertSharedGroupForOwnerInTx,
  type GroupCreationCiphertext,
} from "./group-creation-shared.js";
import { userHasGroupPermission } from "./group-permissions.js";
import { getAuthenticatedUserSummary } from "./user-me.js";
import { assertUserProPlan } from "./user-plan.js";

function toBuf(u: Uint8Array): Buffer {
  return Buffer.from(u);
}

/**
 * Replaces legacy `groups.getPages` (authenticated): page IDs in the group,
 * newest activity first, optional cursor `lastPageId`.
 */
export async function performListGroupPages(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  groupId: string;
  lastPageId?: string | undefined;
}): Promise<{ pageIds: string[]; hasMore: boolean }> {
  const { userId } = await getAuthenticatedUserSummary(input);

  const [groupRow] = await input.db
    .select({ id: groups.id })
    .from(groups)
    .where(eq(groups.id, input.groupId))
    .limit(1);

  if (groupRow == null) {
    throw new SessionError(404, "NOT_FOUND", "Group not found.");
  }

  const allowed = await userHasGroupPermission({
    db: input.db,
    userId,
    groupId: input.groupId,
    permission: "viewGroupPages",
  });
  if (!allowed) {
    throw new SessionError(403, "FORBIDDEN", "Insufficient permissions.");
  }

  let cursorActivity: string | undefined;
  if (input.lastPageId != null && input.lastPageId.length > 0) {
    const [p] = await input.db
      .select({ lastActivityDate: pages.lastActivityDate })
      .from(pages)
      .where(
        and(eq(pages.id, input.lastPageId), eq(pages.groupId, input.groupId)),
      )
      .limit(1);
    if (p == null) {
      throw new SessionError(400, "BAD_REQUEST", "lastPageId not in group.");
    }
    cursorActivity = p.lastActivityDate;
  }

  const whereClause =
    cursorActivity != null
      ? and(
          eq(pages.groupId, input.groupId),
          isNull(pages.permanentDeletionDate),
          lt(pages.lastActivityDate, cursorActivity),
        )
      : and(
          eq(pages.groupId, input.groupId),
          isNull(pages.permanentDeletionDate),
        );

  const rows = await input.db
    .select({ id: pages.id })
    .from(pages)
    .where(whereClause)
    .orderBy(desc(pages.lastActivityDate))
    .limit(21);

  const hasMore = rows.length > 20;
  const pageIds = hasMore ? rows.slice(0, 20).map((r) => r.id) : rows.map((r) => r.id);

  return { pageIds, hasMore };
}

export type CreatePageBody = {
  parentPageId: string;
  pageId: string;
  pageEncryptedSymmetricKeyring: Uint8Array;
  pageEncryptedRelativeTitle: Uint8Array;
  pageEncryptedAbsoluteTitle: Uint8Array;
  groupCreation?: GroupCreationCiphertext;
};

/**
 * Replaces legacy `pages.create` (optional `groupCreation`: new non-personal
 * group + first page, same as tRPC’s `groupId` + `groupCreation` payload). Pro
 * + free-page limits match legacy.
 */
export async function performCreatePage(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  groupId: string;
  body: CreatePageBody;
}): Promise<{ pageId: string; numFreePages?: number }> {
  const { userId, personalGroupId } = await getAuthenticatedUserSummary(input);
  const groupCreation = input.body.groupCreation;

  const [parent] = await input.db
    .select({ id: pages.id, groupId: pages.groupId })
    .from(pages)
    .where(eq(pages.id, input.body.parentPageId))
    .limit(1);

  if (parent == null) {
    throw new SessionError(404, "NOT_FOUND", "Parent page not found.");
  }

  if (groupCreation == null) {
    if (parent.groupId !== input.groupId) {
      throw new SessionError(
        400,
        "BAD_REQUEST",
        "parentPageId must refer to a page in this group.",
      );
    }
  } else {
    if (parent.groupId !== personalGroupId) {
      throw new SessionError(
        400,
        "BAD_REQUEST",
        "When creating a new shared group, parentPageId must be a page in your personal group.",
      );
    }
  }

  const [groupRow] = await input.db
    .select({ id: groups.id })
    .from(groups)
    .where(eq(groups.id, input.groupId))
    .limit(1);

  if (groupCreation == null) {
    if (groupRow == null) {
      throw new SessionError(404, "NOT_FOUND", "Group not found.");
    }
  } else {
    if (groupRow != null) {
      throw new SessionError(
        400,
        "BAD_REQUEST",
        "A group with this id already exists.",
      );
    }
    await assertUserProPlan({ db: input.db, userId });
    await ensureSodiumReady();
  }

  if (groupCreation == null) {
    const canEdit = await userHasGroupPermission({
      db: input.db,
      userId,
      groupId: input.groupId,
      permission: "editGroupPages",
    });
    if (!canEdit) {
      throw new SessionError(403, "FORBIDDEN", "Insufficient permissions.");
    }
  }

  const mustSubscribe = input.groupId !== personalGroupId || groupCreation != null;
  if (mustSubscribe) {
    const [u] = await input.db
      .select({ plan: users.plan })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (u?.plan !== "pro") {
      throw new SessionError(
        403,
        "FORBIDDEN",
        "This action requires a Pro plan subscription.",
      );
    }
  }

  return await input.db.transaction(async (tx) => {
    const [urow] = await tx
      .select({
        plan: users.plan,
        numFreePages: users.numFreePages,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (urow == null) {
      throw new SessionError(401, "UNAUTHORIZED", "User not found.");
    }

    let numFreePagesOut: number | undefined;

    if (urow.plan !== "pro") {
      const next = urow.numFreePages + 1;
      if (next > 50) {
        throw new SessionError(
          403,
          "FORBIDDEN",
          "You have reached your limit of 50 free pages.",
        );
      }
      await tx
        .update(users)
        .set({ numFreePages: next })
        .where(eq(users.id, userId));
      numFreePagesOut = next;
    }

    if (groupCreation != null) {
      await insertSharedGroupForOwnerInTx(tx, {
        env: input.env,
        userId,
        groupId: input.groupId,
        mainPageId: input.body.pageId,
        groupCreation,
      });
    }

    await tx.insert(pages).values({
      id: input.body.pageId,
      groupId: input.groupId,
      encryptedSymmetricKeyring: toBuf(input.body.pageEncryptedSymmetricKeyring),
      encryptedRelativeTitle: toBuf(input.body.pageEncryptedRelativeTitle),
      encryptedAbsoluteTitle: toBuf(input.body.pageEncryptedAbsoluteTitle),
      free: urow.plan !== "pro",
    });

    await tx.insert(usersPages).values({
      userId,
      pageId: input.body.pageId,
      lastParentId: input.body.parentPageId,
    });

    await tx
      .update(groupMembers)
      .set({ lastActivityDate: new Date().toISOString() })
      .where(
        and(
          eq(groupMembers.groupId, input.groupId),
          eq(groupMembers.userId, userId),
        ),
      );

    return {
      pageId: input.body.pageId,
      ...(numFreePagesOut != null ? { numFreePages: numFreePagesOut } : {}),
    };
  });
}
