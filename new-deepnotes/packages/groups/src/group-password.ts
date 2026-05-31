import type { DeepnotesDb } from "@deepnotes/db/client";
import { groups } from "@deepnotes/db/schema";
import { eq } from "drizzle-orm";
import { Buffer } from "node:buffer";
import { argon2id } from "@noble/hashes/argon2.js";

import {
  computeGroupPasswordPhc,
  decryptGroupRehashedPasswordHash,
  encryptGroupRehashedPasswordHash,
  ensureSodiumReady,
} from "./crypto/session-crypto.js";
import type { SessionEnv } from "@deepnotes/session-core";
import { SessionError } from "@deepnotes/session-core";
import { userHasGroupPermission } from "@deepnotes/session-core";
import { getAuthenticatedUserSummary } from "@deepnotes/session-core";
import { assertUserProPlan } from "@deepnotes/session-core";

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
  
  // Parse PHC string: $argon2id$v=19$m=32768,t=2,p=1$<salt>$<hash>
  const parts = phc.split('$');
  if (parts.length < 6 || parts[1] !== 'argon2id') {
    throw new SessionError(500, "INTERNAL_ERROR", "Invalid PHC format");
  }
  
  const salt = Buffer.from(parts[4]!, 'base64');
  const expectedHash = Buffer.from(parts[5]!, 'base64');
  
  // Compute hash of provided password
  const computedHash = argon2id(input.groupPasswordHash, salt, {
    t: 2,
    m: 32 * 1024,
    p: 1,
    dkLen: 32,
  });
  
  // Constant-time comparison
  const { timingSafeEqual } = require('node:crypto');
  const ok = timingSafeEqual(Buffer.from(computedHash), expectedHash);
  
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
