import type { DeepnotesDb } from "@deepnotes/db/client";
import { count, eq, inArray } from "drizzle-orm";
import sodium from "libsodium-wrappers-sumo";

import {
  groupJoinInvitations,
  groupJoinRequests,
  groupMembers,
  groups,
  users,
} from "@deepnotes/db/schema";

import { getPasswordHashValues } from "./crypto/index.js";
import {
  decryptUserRehashedLoginHash,
  derivePasswordValues,
  ensureSodiumReady,
} from "./crypto/session-crypto.js";
import { buildClearSessionCookies, cookieOptionsFromEnv } from "./cookies.js";
import type { SessionEnv } from "./env.js";
import { SessionError } from "./errors.js";
import { verifyAccessToken } from "./jwt.js";

/**
 * Replaces legacy `users.account.delete`: password check, sole-owner guard,
 * removes join rows, deletes solo-member groups (and cascaded pages), drops
 * remaining memberships, deletes the user row (sessions/devices cascade).
 */
export async function performUserAccountDelete(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  loginHash: Uint8Array;
  /** Optional Stripe `customers.del` (legacy runs after DB commit; errors are logged only). */
  deleteStripeCustomer?: (customerId: string) => Promise<void>;
}): Promise<{ cookieLines: string[] }> {
  await ensureSodiumReady();
  const cookieOpts = cookieOptionsFromEnv(input.env);

  if (input.accessCookie == null || input.accessCookie === "") {
    throw new SessionError(401, "UNAUTHORIZED", "No access token.");
  }

  const payload = await verifyAccessToken(
    input.accessCookie,
    input.env.ACCESS_SECRET,
  );
  if (payload == null) {
    throw new SessionError(401, "UNAUTHORIZED", "Invalid access token.");
  }
  const userId = payload.uid;

  const userRows = await input.db
    .select({
      id: users.id,
      encryptedRehashedLoginHash: users.encryptedRehashedLoginHash,
      customerId: users.customerId,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const userRow = userRows[0];
  if (userRow == null) {
    throw new SessionError(404, "NOT_FOUND", "User not found.");
  }

  const passwordHashValues = getPasswordHashValues(
    decryptUserRehashedLoginHash(
      new Uint8Array(userRow.encryptedRehashedLoginHash),
      input.env.USER_REHASHED_LOGIN_HASH_ENCRYPTION_KEY,
    ),
  );
  const passwordValues = derivePasswordValues({
    password: input.loginHash,
    salt: passwordHashValues.saltBytes,
  });
  if (!sodium.memcmp(passwordValues.hash, passwordHashValues.hashBytes)) {
    throw new SessionError(400, "BAD_REQUEST", "Password is incorrect.");
  }

  const memberCounts = await input.db
    .select({
      groupId: groupMembers.groupId,
      n: count(),
    })
    .from(groupMembers)
    .groupBy(groupMembers.groupId);

  const ownerCounts = await input.db
    .select({
      groupId: groupMembers.groupId,
      n: count(),
    })
    .from(groupMembers)
    .where(eq(groupMembers.role, "owner"))
    .groupBy(groupMembers.groupId);

  const memMap = new Map(
    memberCounts.map((r) => [r.groupId, Number(r.n)]),
  );
  const ownerMap = new Map(
    ownerCounts.map((r) => [r.groupId, Number(r.n)]),
  );

  const myGroupRows = await input.db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .where(eq(groupMembers.userId, userId));

  const memberships = myGroupRows.map((row) => ({
    groupId: row.groupId,
    memberCount: memMap.get(row.groupId) ?? 0,
    ownerCount: ownerMap.get(row.groupId) ?? 0,
  }));

  if (
    memberships.some((m) => m.memberCount > 1 && m.ownerCount <= 1)
  ) {
    throw new SessionError(
      400,
      "BAD_REQUEST",
      "Some groups would be left without an owner. Transfer ownership before deleting your account.",
    );
  }

  const idsOfGroupsToDelete = memberships
    .filter((m) => m.memberCount <= 1)
    .map((m) => m.groupId);

  const customerId = userRow.customerId;

  await input.db.transaction(async (tx) => {
    await tx
      .delete(groupJoinInvitations)
      .where(eq(groupJoinInvitations.userId, userId));
    await tx
      .delete(groupJoinRequests)
      .where(eq(groupJoinRequests.userId, userId));

    if (idsOfGroupsToDelete.length > 0) {
      await tx.delete(groups).where(inArray(groups.id, idsOfGroupsToDelete));
    }

    await tx.delete(groupMembers).where(eq(groupMembers.userId, userId));

    const removed = await tx
      .delete(users)
      .where(eq(users.id, userId))
      .returning({ id: users.id });
    if (removed.length !== 1) {
      throw new SessionError(
        500,
        "SERVER_MISCONFIG",
        "User delete did not apply.",
      );
    }
  });

  if (
    customerId != null &&
    customerId !== "" &&
    input.deleteStripeCustomer != null
  ) {
    try {
      await input.deleteStripeCustomer(customerId);
    } catch {
      // Legacy logs and continues after DB delete.
    }
  }

  return { cookieLines: buildClearSessionCookies(cookieOpts) };
}
