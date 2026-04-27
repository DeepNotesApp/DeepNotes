import type { DeepnotesDb } from "@deepnotes/db/client";
import { eq } from "drizzle-orm";
import sodium from "libsodium-wrappers-sumo";
import { nanoid } from "nanoid";

import {
  devices,
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
import { ensureSodiumReady } from "./crypto/session-crypto.js";
import { wrapSymmetricKey } from "./crypto/symmetric-key.js";
import { cookieOptionsFromEnv } from "./cookies.js";
import type { SessionEnv } from "./env.js";
import { encryptUserEmail } from "./encrypt-user-email.js";
import { hashUserEmail } from "./email-hash.js";
import { getDeviceHash } from "./device-hash.js";
import { SessionError } from "./errors.js";
import { createSessionRowAndCookies } from "./session-lifecycle.js";

export type SessionStartDemoGroupCreation = {
  groupEncryptedName: Uint8Array;
  groupPasswordHash?: Uint8Array;
  groupIsPublic: boolean;
  groupAccessKeyring: Uint8Array;
  groupEncryptedInternalKeyring: Uint8Array;
  groupEncryptedContentKeyring: Uint8Array;
  groupPublicKeyring: Uint8Array;
  groupEncryptedPrivateKeyring: Uint8Array;
  groupOwnerEncryptedName: Uint8Array;
};

export type SessionStartDemoPageCreation = {
  pageEncryptedSymmetricKeyring: Uint8Array;
  pageEncryptedRelativeTitle: Uint8Array;
  pageEncryptedAbsoluteTitle: Uint8Array;
};

export type SessionStartDemoInput = {
  userId: string;
  groupId: string;
  pageId: string;
  userPublicKeyring: Uint8Array;
  userEncryptedPrivateKeyring: Uint8Array;
  userEncryptedSymmetricKeyring: Uint8Array;
  userEncryptedName: Uint8Array;
  userEncryptedDefaultNote: Uint8Array;
  userEncryptedDefaultArrow: Uint8Array;
  groupCreation: SessionStartDemoGroupCreation;
  pageCreation: SessionStartDemoPageCreation;
};

function toBuf(u: Uint8Array): Buffer {
  return Buffer.from(u);
}

function toB64(u: Uint8Array): string {
  return Buffer.from(u).toString("base64");
}

/**
 * Replaces legacy `sessions.startDemo`: creates a **demo** user (random server-side
 * wrapping key, empty password hash), personal group + page, device, session, and cookies.
 */
export async function performSessionStartDemo(input: {
  db: DeepnotesDb;
  env: SessionEnv;
  body: SessionStartDemoInput;
  clientIp: string;
  userAgent: string;
}): Promise<{ json: Record<string, unknown>; cookieLines: string[] }> {
  await ensureSodiumReady();

  const gc = input.body.groupCreation;
  if (
    gc.groupPasswordHash != null &&
    gc.groupPasswordHash.byteLength > 0
  ) {
    throw new SessionError(
      400,
      "VALIDATION_ERROR",
      "Demo registration with a group password is not supported yet.",
    );
  }

  const email = `demo-${nanoid()}`;
  const exceptions = input.env.EMAIL_CASE_SENSITIVITY_EXCEPTIONS ?? "";
  const emailHash = Buffer.from(
    await hashUserEmail(email, input.env.USER_EMAIL_SECRET, exceptions),
  );
  const encryptedEmail = Buffer.from(
    encryptUserEmail(email, input.env.USER_EMAIL_ENCRYPTION_KEY, exceptions),
  );

  const passwordKey = wrapSymmetricKey(sodium.randombytes_buf(32));

  const encryptedPrivateStored = toBuf(
    createPrivateKeyring(input.body.userEncryptedPrivateKeyring)
      .wrapSymmetric(passwordKey, {
        associatedData: {
          context: "UserEncryptedPrivateKeyring",
          userId: input.body.userId,
        },
      }).wrappedValue,
  );

  const encryptedSymmetricStored = toBuf(
    createSymmetricKeyring(input.body.userEncryptedSymmetricKeyring)
      .wrapSymmetric(passwordKey, {
        associatedData: {
          context: "UserEncryptedSymmetricKeyring",
          userId: input.body.userId,
        },
      }).wrappedValue,
  );

  const pc = input.body.pageCreation;

  return await input.db.transaction(async (tx) => {
    await tx.delete(users).where(eq(users.emailHash, emailHash));

    await tx.insert(users).values({
      id: input.body.userId,
      encryptedEmail,
      emailHash,
      encryptedRehashedLoginHash: Buffer.alloc(0),
      demo: true,
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

    const deviceHash = getDeviceHash({
      ip: input.clientIp,
      userAgent: input.userAgent,
      userId: input.body.userId,
    });

    const deviceId = nanoid();
    await tx.insert(devices).values({
      id: deviceId,
      userId: input.body.userId,
      hash: deviceHash,
      trusted: false,
    });

    const sessionId = nanoid();
    const cookieOpts = cookieOptionsFromEnv(input.env);
    const { sessionKey, cookieLines } = await createSessionRowAndCookies({
      db: tx as unknown as DeepnotesDb,
      sessionId,
      userId: input.body.userId,
      deviceId,
      rememberSession: false,
      env: input.env,
      cookieOpts,
    });

    const encPriv = createPrivateKeyring(new Uint8Array(encryptedPrivateStored))
      .unwrapSymmetric(passwordKey, {
        associatedData: {
          context: "UserEncryptedPrivateKeyring",
          userId: input.body.userId,
        },
      }).wrappedValue;

    const encSym = createSymmetricKeyring(new Uint8Array(encryptedSymmetricStored))
      .unwrapSymmetric(passwordKey, {
        associatedData: {
          context: "UserEncryptedSymmetricKeyring",
          userId: input.body.userId,
        },
      }).wrappedValue;

    return {
      json: {
        userId: input.body.userId,
        sessionId,
        sessionKey: toB64(sessionKey),
        personalGroupId: input.body.groupId,
        publicKeyring: toB64(input.body.userPublicKeyring),
        encryptedPrivateKeyring: toB64(encPriv),
        encryptedSymmetricKeyring: toB64(encSym),
      },
      cookieLines,
    };
  });
}
