import type { DeepnotesDb } from "@deepnotes/db/client";
import {
  groups,
  pageSnapshots,
  pages,
  pageUpdates,
  users,
  usersPages,
} from "@deepnotes/db/schema";
import { and, eq, isNull } from "drizzle-orm";

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

function bumpStringIdList(ids: string[], itemId: string, max: number): string[] {
  const rest = ids.filter((id) => id !== itemId);
  return [itemId, ...rest].slice(0, max);
}

export type PageMoveGroupCreation = GroupCreationCiphertext;

export type PageMoveReencrypt = {
  pageEncryptedSymmetricKeyring: Uint8Array;
  pageEncryptedRelativeTitle: Uint8Array;
  pageEncryptedAbsoluteTitle: Uint8Array;
  pageEncryptedUpdate: Uint8Array;
  pageEncryptedSnapshots: Record<
    string,
    { encryptedSymmetricKey: Uint8Array; encryptedData: Uint8Array }
  >;
};

export type PageMoveBody = {
  destGroupId: string;
  setAsMainPage: boolean;
  groupCreation?: PageMoveGroupCreation;
  reencrypt?: PageMoveReencrypt;
};

/**
 * Replaces legacy WebSocket `pages.move` (two tRPC steps) with one transaction:
 * optional new group, optional set-as-main (personal `users_pages` swap), and
 * cross-group ciphertext + `page_updates` + snapshot rows when the page changes group.
 * Collab/KeyDB cache bust is not performed (RESTART_PLAN: new collab path).
 */
export async function performPageMove(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  pageId: string;
  body: PageMoveBody;
}): Promise<void> {
  const { userId } = await getAuthenticatedUserSummary({
    db: input.db,
    env: input.env,
    accessCookie: input.accessCookie,
  });
  await assertUserProPlan({ db: input.db, userId });
  await ensureSodiumReady();

  const destGroupId = input.body.destGroupId;
  const setAsMainPage = input.body.setAsMainPage;
  const groupCreation = input.body.groupCreation;
  const reencrypt = input.body.reencrypt;

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

  const sourceGroupId = pageRow.groupId;

  if (sourceGroupId === destGroupId && !setAsMainPage) {
    throw new SessionError(
      400,
      "BAD_REQUEST",
      "No changes were requested on page move.",
    );
  }

  const [srcG] = await input.db
    .select({ mainPageId: groups.mainPageId })
    .from(groups)
    .where(eq(groups.id, sourceGroupId))
    .limit(1);
  if (srcG == null) {
    throw new SessionError(404, "NOT_FOUND", "Source group not found.");
  }
  if (input.pageId === srcG.mainPageId) {
    throw new SessionError(
      400,
      "BAD_REQUEST",
      "Cannot move main page of a group. Please set another page as main page first.",
    );
  }

  await requireEditGroupSettings({ db: input.db, userId, groupId: sourceGroupId });

  if (groupCreation == null) {
    const [destExists] = await input.db
      .select({ id: groups.id })
      .from(groups)
      .where(eq(groups.id, destGroupId))
      .limit(1);
    if (destExists == null) {
      throw new SessionError(404, "NOT_FOUND", "Destination group not found.");
    }
    const canEditDest = await userHasGroupPermission({
      db: input.db,
      userId,
      groupId: destGroupId,
      permission: "editGroupPages",
    });
    if (!canEditDest) {
      throw new SessionError(403, "FORBIDDEN", "Insufficient permissions.");
    }
  } else {
    const [destExists] = await input.db
      .select({ id: groups.id })
      .from(groups)
      .where(eq(groups.id, destGroupId))
      .limit(1);
    if (destExists != null) {
      throw new SessionError(
        400,
        "BAD_REQUEST",
        "A group with this id already exists.",
      );
    }
  }

  if (sourceGroupId !== destGroupId && reencrypt == null) {
    throw new SessionError(
      400,
      "BAD_REQUEST",
      "reencrypt payload is required when moving to another group.",
    );
  }

  return await input.db.transaction(async (tx) => {
    if (groupCreation != null) {
      await insertSharedGroupForOwnerInTx(tx, {
        env: input.env,
        userId,
        groupId: destGroupId,
        mainPageId: input.pageId,
        groupCreation,
      });
    }

    if (setAsMainPage) {
      const [destG] = await tx
        .select({
          mainPageId: groups.mainPageId,
          userId: groups.userId,
        })
        .from(groups)
        .where(eq(groups.id, destGroupId))
        .limit(1);
      if (destG == null) {
        throw new SessionError(404, "NOT_FOUND", "Destination group not found.");
      }
      const destGroupOldMainPageId = destG.mainPageId;
      const destGroupMemberId = destG.userId ?? null;

      const [upOld] = await tx
        .select({ lastParentId: usersPages.lastParentId })
        .from(usersPages)
        .where(
          and(
            eq(usersPages.userId, userId),
            eq(usersPages.pageId, destGroupOldMainPageId),
          ),
        )
        .limit(1);
      const oldLastParentId = upOld?.lastParentId ?? null;

      if (
        destGroupMemberId != null &&
        userId === destGroupMemberId &&
        input.pageId !== destGroupOldMainPageId
      ) {
        await tx
          .insert(usersPages)
          .values({
            userId,
            pageId: input.pageId,
            lastParentId: oldLastParentId,
          })
          .onConflictDoUpdate({
            target: [usersPages.userId, usersPages.pageId],
            set: { lastParentId: oldLastParentId },
          });
        await tx
          .insert(usersPages)
          .values({
            userId,
            pageId: destGroupOldMainPageId,
            lastParentId: input.pageId,
          })
          .onConflictDoUpdate({
            target: [usersPages.userId, usersPages.pageId],
            set: { lastParentId: input.pageId },
          });
      }

      await tx
        .update(groups)
        .set({ mainPageId: input.pageId })
        .where(eq(groups.id, destGroupId));
    }

    if (sourceGroupId !== destGroupId) {
      if (reencrypt == null) {
        throw new SessionError(
          500,
          "SERVER_ERROR",
          "Missing reencrypt payload for cross-group move.",
        );
      }
      await tx
        .update(pages)
        .set({
          groupId: destGroupId,
          encryptedSymmetricKeyring: toBuf(
            reencrypt.pageEncryptedSymmetricKeyring,
          ),
          encryptedRelativeTitle: toBuf(reencrypt.pageEncryptedRelativeTitle),
          encryptedAbsoluteTitle: toBuf(reencrypt.pageEncryptedAbsoluteTitle),
        })
        .where(eq(pages.id, input.pageId));

      for (const [snapshotId, snap] of Object.entries(
        reencrypt.pageEncryptedSnapshots,
      )) {
        await tx
          .update(pageSnapshots)
          .set({
            encryptedSymmetricKey: toBuf(snap.encryptedSymmetricKey),
            encryptedData: toBuf(snap.encryptedData),
          })
          .where(
            and(
              eq(pageSnapshots.id, snapshotId),
              eq(pageSnapshots.pageId, input.pageId),
            ),
          );
      }

      await tx.delete(pageUpdates).where(eq(pageUpdates.pageId, input.pageId));
      await tx.insert(pageUpdates).values({
        pageId: input.pageId,
        index: 0,
        encryptedData: toBuf(reencrypt.pageEncryptedUpdate),
      });

      const [urow] = await tx
        .select({
          recentGroupIds: users.recentGroupIds,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      if (urow == null) {
        throw new SessionError(404, "NOT_FOUND", "User not found.");
      }
      const next = bumpStringIdList(
        urow.recentGroupIds,
        destGroupId,
        50,
      );
      await tx
        .update(users)
        .set({ recentGroupIds: next })
        .where(eq(users.id, userId));
    }
  });
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
