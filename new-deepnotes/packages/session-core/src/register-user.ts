import type { DeepnotesDb } from "@deepnotes/db/client";
import { and, eq, gt, or } from "drizzle-orm";
import { nanoid } from "nanoid";

import {
  groupMembers,
  groups,
  pages,
  users,
  usersPages,
} from "@deepnotes/db/schema";

import {
  createPrivateKeyring,
  createSymmetricKeyring,
} from "./crypto/index.js";
import { encodePasswordHash } from "./crypto/password-hashing.js";
import {
  derivePasswordValues,
  encryptUserRehashedLoginHash,
  ensureSodiumReady,
} from "./crypto/session-crypto.js";
import type { SessionStartDemoInput } from "./start-demo.js";
import { addHours } from "./datetime.js";
import type { SessionEnv } from "./env.js";
import { encryptUserEmail } from "./encrypt-user-email.js";
import { hashUserEmail } from "./email-hash.js";
import { SessionError } from "./errors.js";
import {
  assertOutboundEmailConfiguredForRegistration,
  sendRegistrationEmail,
} from "./send-registration-email.js";

export type UserRegisterInput = SessionStartDemoInput & {
  email: string;
  loginHash: Uint8Array;
};

function toBuf(u: Uint8Array): Buffer {
  return Buffer.from(u);
}

function sendEmailsEnabled(env: SessionEnv): boolean {
  return env.SEND_EMAILS !== "false";
}

async function markUserEmailVerifiedByCode(
  tx: DeepnotesDb,
  emailVerificationCode: string,
): Promise<void> {
  const rows = await tx
    .select({
      id: users.id,
      encryptedNewEmail: users.encryptedNewEmail,
    })
    .from(users)
    .where(
      and(
        eq(users.emailVerified, false),
        eq(users.emailVerificationCode, emailVerificationCode),
        gt(users.emailVerificationExpirationDate, new Date().toISOString()),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (row == null) {
    throw new SessionError(
      500,
      "SERVER_MISCONFIG",
      "Auto email verification failed after registration.",
    );
  }

  if (row.encryptedNewEmail == null) {
    throw new SessionError(
      500,
      "SERVER_MISCONFIG",
      "Missing encrypted_new_email for verification.",
    );
  }

  const updated = await tx
    .update(users)
    .set({
      encryptedEmail: row.encryptedNewEmail,
      encryptedNewEmail: null,
      emailVerified: true,
      emailVerificationCode: null,
      emailVerificationExpirationDate: null,
    })
    .where(eq(users.id, row.id))
    .returning({ id: users.id });

  if (updated.length !== 1) {
    throw new SessionError(
      500,
      "SERVER_MISCONFIG",
      "Email verification update did not apply.",
    );
  }
}

/**
 * Replaces legacy `users.account.register`: creates user (password-backed keyrings),
 * personal group + page, email verification state; optionally auto-verifies when
 * `SEND_EMAILS=false` (local/CI parity with legacy).
 */
export async function performUserRegister(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  body: UserRegisterInput;
}): Promise<{ userId: string; emailVerified: boolean }> {
  await ensureSodiumReady();

  if (sendEmailsEnabled(input.env)) {
    assertOutboundEmailConfiguredForRegistration(input.env);
  }

  const gc = input.body.groupCreation;
  if (
    gc.groupPasswordHash != null &&
    gc.groupPasswordHash.byteLength > 0
  ) {
    throw new SessionError(
      400,
      "VALIDATION_ERROR",
      "Registration with a group password is not supported yet.",
    );
  }

  const email = input.body.email.trim().toLowerCase();
  const exceptions = input.env.EMAIL_CASE_SENSITIVITY_EXCEPTIONS ?? "";
  const emailHash = Buffer.from(
    await hashUserEmail(email, input.env.USER_EMAIL_SECRET, exceptions),
  );
  const encryptedEmailBuf = Buffer.from(
    encryptUserEmail(email, input.env.USER_EMAIL_ENCRYPTION_KEY, exceptions),
  );

  const passwordValues = derivePasswordValues({
    password: input.body.loginHash,
  });
  const encodedRehash = encodePasswordHash(
    passwordValues.hash,
    passwordValues.salt,
    2,
    32,
  );
  const encryptedRehashedLoginHash = toBuf(
    encryptUserRehashedLoginHash(
      encodedRehash,
      input.env.USER_REHASHED_LOGIN_HASH_ENCRYPTION_KEY,
    ),
  );

  const encryptedPrivateStored = toBuf(
    createPrivateKeyring(input.body.userEncryptedPrivateKeyring)
      .wrapSymmetric(passwordValues.key, {
        associatedData: {
          context: "UserEncryptedPrivateKeyring",
          userId: input.body.userId,
        },
      }).wrappedValue,
  );

  const encryptedSymmetricStored = toBuf(
    createSymmetricKeyring(input.body.userEncryptedSymmetricKeyring)
      .wrapSymmetric(passwordValues.key, {
        associatedData: {
          context: "UserEncryptedSymmetricKeyring",
          userId: input.body.userId,
        },
      }).wrappedValue,
  );

  const pc = input.body.pageCreation;
  const emailVerificationCode = nanoid();
  const emailVerificationExpirationDate = addHours(
    new Date(),
    1,
  ).toISOString();

  const existing = await input.db
    .select({
      emailVerified: users.emailVerified,
      emailVerificationCode: users.emailVerificationCode,
    })
    .from(users)
    .where(
      and(
        eq(users.emailHash, emailHash),
        or(
          eq(users.emailVerified, true),
          gt(users.emailVerificationExpirationDate, new Date().toISOString()),
        ),
      ),
    )
    .limit(1);

  const hit = existing[0];
  if (hit != null) {
    if (hit.emailVerified) {
      throw new SessionError(
        409,
        "CONFLICT",
        "Email already registered.",
      );
    }
    if (
      hit.emailVerificationCode != null &&
      hit.emailVerificationCode.length > 0
    ) {
      await sendRegistrationEmail({
        env: input.env,
        toEmail: email,
        emailVerificationCode: hit.emailVerificationCode,
      });
    }
    throw new SessionError(
      401,
      "UNAUTHORIZED",
      "Email awaiting verification. New email sent.",
    );
  }

  const result = await input.db.transaction(async (tx) => {
    await tx.delete(users).where(eq(users.emailHash, emailHash));

    await tx.insert(users).values({
      id: input.body.userId,
      encryptedEmail: encryptedEmailBuf,
      emailHash,
      encryptedNewEmail: encryptedEmailBuf,
      emailVerificationCode,
      emailVerificationExpirationDate,
      encryptedRehashedLoginHash,
      demo: false,
      emailVerified: false,
      personalGroupId: input.body.groupId,
      startingPageId: input.body.pageId,
      recentPageIds: [input.body.pageId],
      recentGroupIds: [input.body.groupId],
      publicKeyring: toBuf(input.body.userPublicKeyring),
      encryptedPrivateKeyring: encryptedPrivateStored,
      encryptedSymmetricKeyring: encryptedSymmetricStored,
      encryptedName: toBuf(input.body.userEncryptedName),
      encryptedDefaultNote: toBuf(input.body.userEncryptedDefaultNote),
      encryptedDefaultArrow: toBuf(input.body.userEncryptedDefaultArrow),
    });

    await tx.insert(groups).values({
      id: input.body.groupId,
      mainPageId: input.body.pageId,
      encryptedName: toBuf(gc.groupEncryptedName),
      userId: input.body.userId,
      publicKeyring: toBuf(gc.groupPublicKeyring),
      encryptedPrivateKeyring: toBuf(gc.groupEncryptedPrivateKeyring),
      encryptedContentKeyring: toBuf(gc.groupEncryptedContentKeyring),
      accessKeyring: gc.groupIsPublic ? toBuf(gc.groupAccessKeyring) : null,
    });

    await tx.insert(groupMembers).values({
      groupId: input.body.groupId,
      userId: input.body.userId,
      role: "owner",
      encryptedAccessKeyring: gc.groupIsPublic
        ? null
        : toBuf(gc.groupAccessKeyring),
      encryptedInternalKeyring: toBuf(gc.groupEncryptedInternalKeyring),
      encryptedName: toBuf(gc.groupOwnerEncryptedName),
    });

    await tx.insert(pages).values({
      id: input.body.pageId,
      groupId: input.body.groupId,
      encryptedRelativeTitle: toBuf(pc.pageEncryptedRelativeTitle),
      encryptedSymmetricKeyring: toBuf(pc.pageEncryptedSymmetricKeyring),
      encryptedAbsoluteTitle: toBuf(pc.pageEncryptedAbsoluteTitle),
      free: true,
    });

    await tx.insert(usersPages).values({
      userId: input.body.userId,
      pageId: input.body.pageId,
      lastParentId: null,
    });

    let emailVerified = false;
    if (!sendEmailsEnabled(input.env)) {
      await markUserEmailVerifiedByCode(
        tx as unknown as DeepnotesDb,
        emailVerificationCode,
      );
      emailVerified = true;
    }

    return { userId: input.body.userId, emailVerified };
  });

  if (sendEmailsEnabled(input.env) && !result.emailVerified) {
    await sendRegistrationEmail({
      env: input.env,
      toEmail: email,
      emailVerificationCode,
    });
  }

  return result;
}
