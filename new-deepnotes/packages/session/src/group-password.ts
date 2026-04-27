import type { DeepnotesDb } from "@deepnotes/db/client";
import { groups } from "@deepnotes/db/schema";
import { eq } from "drizzle-orm";
import { Buffer } from "node:buffer";
import sodium from "libsodium-wrappers-sumo";

import {
  computeGroupPasswordPhc,
  decryptGroupRehashedPasswordHash,
  encryptGroupRehashedPasswordHash,
  ensureSodiumReady,
} from "./crypto/session-crypto.js";
import type { SessionEnv } from "./env.js";
import { SessionError } from "./errors.js";
import { userHasGroupPermission } from "./group-permissions.js";
import { getAuthenticatedUserSummary } from "./user-me.js";
import { assertUserProPlan } from "./user-plan.js";

async function assertGroupPasswordCorrect(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  groupId: string;
  groupPasswordHash: Uint8Array;
}): Promise<void> {
  const [g] = await input.db
    .select({ hash: groups.encryptedRehashedPasswordHash })
    .from(groups)
    .where(eq(groups.id, input.groupId))
    .limit(1);
  if (g == null) {
    throw new SessionError(404, "NOT_FOUND", "Group not found.");
  }
  if (g.hash == null) {
    throw new SessionError(
      400,
      "BAD_REQUEST",
      "This group is not password protected.",
    );
  }
  const phc = decryptGroupRehashedPasswordHash(
    new Uint8Array(g.hash),
    input.env.GROUP_REHASHED_PASSWORD_HASH_ENCRYPTION_KEY,
  );
  const ok = sodium.crypto_pwhash_str_verify(
    phc,
    input.groupPasswordHash,
  );
  if (!ok) {
    throw new SessionError(400, "BAD_REQUEST", "Group password is incorrect.");
  }
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

export async function performGroupPasswordEnable(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  groupId: string;
  groupPasswordHash: Uint8Array;
  groupEncryptedContentKeyring: Uint8Array;
}): Promise<void> {
  await ensureSodiumReady();
  const { userId } = await getAuthenticatedUserSummary({
    db: input.db,
    env: input.env,
    accessCookie: input.accessCookie,
  });
  await assertUserProPlan({ db: input.db, userId });
  await requireEditGroupSettings({ db: input.db, userId, groupId: input.groupId });

  const [g] = await input.db
    .select({ hash: groups.encryptedRehashedPasswordHash })
    .from(groups)
    .where(eq(groups.id, input.groupId))
    .limit(1);
  if (g == null) {
    throw new SessionError(404, "NOT_FOUND", "Group not found.");
  }
  if (g.hash != null) {
    throw new SessionError(
      400,
      "BAD_REQUEST",
      "This group is already password protected.",
    );
  }

  const phc = computeGroupPasswordPhc(input.groupPasswordHash);
  const enc = encryptGroupRehashedPasswordHash(
    phc,
    input.env.GROUP_REHASHED_PASSWORD_HASH_ENCRYPTION_KEY,
  );

  await input.db
    .update(groups)
    .set({
      encryptedRehashedPasswordHash: Buffer.from(enc),
      encryptedContentKeyring: Buffer.from(input.groupEncryptedContentKeyring),
    })
    .where(eq(groups.id, input.groupId));
}

export async function performGroupPasswordChange(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  groupId: string;
  groupCurrentPasswordHash: Uint8Array;
  groupNewPasswordHash: Uint8Array;
  groupEncryptedContentKeyring: Uint8Array;
}): Promise<void> {
  await ensureSodiumReady();
  const { userId } = await getAuthenticatedUserSummary({
    db: input.db,
    env: input.env,
    accessCookie: input.accessCookie,
  });
  await assertGroupPasswordCorrect({
    db: input.db,
    env: input.env,
    groupId: input.groupId,
    groupPasswordHash: input.groupCurrentPasswordHash,
  });
  await assertUserProPlan({ db: input.db, userId });
  await requireEditGroupSettings({ db: input.db, userId, groupId: input.groupId });

  const [g] = await input.db
    .select({ hash: groups.encryptedRehashedPasswordHash })
    .from(groups)
    .where(eq(groups.id, input.groupId))
    .limit(1);
  if (g == null) {
    throw new SessionError(404, "NOT_FOUND", "Group not found.");
  }
  if (g.hash == null) {
    throw new SessionError(
      400,
      "BAD_REQUEST",
      "This group is not password protected.",
    );
  }

  const newPhc = computeGroupPasswordPhc(input.groupNewPasswordHash);
  const enc = encryptGroupRehashedPasswordHash(
    newPhc,
    input.env.GROUP_REHASHED_PASSWORD_HASH_ENCRYPTION_KEY,
  );

  await input.db
    .update(groups)
    .set({
      encryptedRehashedPasswordHash: Buffer.from(enc),
      encryptedContentKeyring: Buffer.from(input.groupEncryptedContentKeyring),
    })
    .where(eq(groups.id, input.groupId));
}

export async function performGroupPasswordDisable(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  accessCookie: string | undefined;
  groupId: string;
  groupPasswordHash: Uint8Array;
  groupEncryptedContentKeyring: Uint8Array;
}): Promise<void> {
  await ensureSodiumReady();
  const { userId } = await getAuthenticatedUserSummary({
    db: input.db,
    env: input.env,
    accessCookie: input.accessCookie,
  });
  await assertGroupPasswordCorrect({
    db: input.db,
    env: input.env,
    groupId: input.groupId,
    groupPasswordHash: input.groupPasswordHash,
  });
  await requireEditGroupSettings({ db: input.db, userId, groupId: input.groupId });

  const [g] = await input.db
    .select({ hash: groups.encryptedRehashedPasswordHash })
    .from(groups)
    .where(eq(groups.id, input.groupId))
    .limit(1);
  if (g == null) {
    throw new SessionError(404, "NOT_FOUND", "Group not found.");
  }
  if (g.hash == null) {
    throw new SessionError(
      400,
      "BAD_REQUEST",
      "This group is not password protected.",
    );
  }

  await input.db
    .update(groups)
    .set({
      encryptedRehashedPasswordHash: null,
      encryptedContentKeyring: Buffer.from(input.groupEncryptedContentKeyring),
    })
    .where(eq(groups.id, input.groupId));
}
