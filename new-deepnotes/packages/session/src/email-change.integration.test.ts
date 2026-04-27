import { randomBytes } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import sodium from "libsodium-wrappers-sumo";
import { nanoid } from "nanoid";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { withDatabaseName } from "@deepnotes/db/testing/db-url";
import {
  createDatabaseFromTemplate,
  dropDatabaseIfExists,
  ensureTemplateDatabase,
  resolveTemplateContext,
  type TemplateDbContext,
} from "@deepnotes/db/testing/template-db";
import * as schema from "@deepnotes/db/schema";
import { users } from "@deepnotes/db/schema";

import {
  performUserEmailChangeConfirm,
  performUserEmailChangeRequest,
} from "./change-user-email.js";
import type { UserRegisterInput } from "./register-user.js";
import { performUserRegister } from "./register-user.js";
import { ensureSodiumReady } from "./crypto/session-crypto.js";
import { decryptUserEmail } from "./encrypt-user-email.js";
import { hashUserEmail } from "./email-hash.js";
import type { SessionEnv } from "./env.js";
import { signAccessToken } from "./jwt.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(__dirname, "../../../.env") });

/** Dedicated template name so `turbo test` can run `@deepnotes/db` and `@deepnotes/session` in parallel. */
const SESSION_TEMPLATE_NAME = "dn_test_tpl_session_email";

function testSessionEnv(): SessionEnv {
  const b32 = (n: number) => Buffer.alloc(32, n).toString("base64");
  return {
    ACCESS_SECRET: "test-access-secret-min-32-chars-long!!",
    REFRESH_SECRET: "test-refresh-secret-min-32-chars-long!!",
    USER_EMAIL_SECRET: "test-user-email-secret-hmac-key!!",
    USER_EMAIL_ENCRYPTION_KEY: b32(1),
    USER_REHASHED_LOGIN_HASH_ENCRYPTION_KEY: b32(2),
    USER_AUTHENTICATOR_SECRET_ENCRYPTION_KEY: b32(3),
    USER_RECOVERY_CODES_ENCRYPTION_KEY: b32(4),
    SEND_EMAILS: "false",
    DEV: "true",
  };
}

function rand32(): Uint8Array {
  return sodium.randombytes_buf(32);
}

async function buildRegisterBody(
  email: string,
  loginHash: Uint8Array,
): Promise<UserRegisterInput> {
  await ensureSodiumReady();
  const userId = nanoid();
  const groupId = nanoid();
  const pageId = nanoid();
  return {
    userId,
    groupId,
    pageId,
    email,
    loginHash,
    userPublicKeyring: rand32(),
    userEncryptedPrivateKeyring: rand32(),
    userEncryptedSymmetricKeyring: rand32(),
    userEncryptedName: rand32(),
    userEncryptedDefaultNote: rand32(),
    userEncryptedDefaultArrow: rand32(),
    groupCreation: {
      groupEncryptedName: rand32(),
      groupIsPublic: true,
      groupAccessKeyring: rand32(),
      groupEncryptedInternalKeyring: rand32(),
      groupEncryptedContentKeyring: rand32(),
      groupPublicKeyring: rand32(),
      groupEncryptedPrivateKeyring: rand32(),
      groupOwnerEncryptedName: rand32(),
    },
    pageCreation: {
      pageEncryptedSymmetricKeyring: rand32(),
      pageEncryptedRelativeTitle: rand32(),
      pageEncryptedAbsoluteTitle: rand32(),
    },
  };
}

describe.skipIf(resolveTemplateContext() == null)(
  "email change (Postgres template DB)",
  () => {
    const baseCtx = resolveTemplateContext()!;
    const ctx: TemplateDbContext = {
      ...baseCtx,
      templateName: SESSION_TEMPLATE_NAME,
    };

    beforeAll(async () => {
      await ensureSodiumReady();
      await ensureTemplateDatabase(ctx);
    });

    afterAll(async () => {
      const admin = postgres(ctx.adminUrl, { max: 1 });
      try {
        await dropDatabaseIfExists(admin, ctx.templateName);
      } finally {
        await admin.end({ timeout: 5 });
      }
    });

    it("register → request → confirm updates email and clears pending state", async () => {
      const env = testSessionEnv();
      const exceptions = "";
      const cloneName = `dn_test_${randomBytes(8).toString("hex")}`;
      const admin = postgres(ctx.adminUrl, { max: 1 });
      try {
        await createDatabaseFromTemplate(admin, cloneName, ctx.templateName);
      } finally {
        await admin.end({ timeout: 5 });
      }

      const cloneUrl = withDatabaseName(baseCtx.appBaseUrl, cloneName);
      const client = postgres(cloneUrl, { max: 1 });
      const db = drizzle(client, { schema });
      try {
        const initialEmail = `u-${nanoid()}@example.com`;
        const newEmail = `v-${nanoid()}@example.com`;
        const loginHash = rand32();
        const newLoginHash = rand32();

        const reg = await buildRegisterBody(initialEmail, loginHash);
        const { userId } = await performUserRegister({
          db,
          env,
          body: reg,
        });
        expect(userId).toBe(reg.userId);

        const access = await signAccessToken({
          secret: env.ACCESS_SECRET,
          userId,
          sessionId: nanoid(),
        });

        const reqOut = await performUserEmailChangeRequest({
          db,
          env,
          accessCookie: access,
          oldLoginHash: loginHash,
          newEmail,
        });
        expect(reqOut.devEmailVerificationCode).toMatch(/^\d{6}$/);

        const pending = await db
          .select({
            code: users.emailVerificationCode,
            encNew: users.encryptedNewEmail,
          })
          .from(users)
          .where(eq(users.id, userId));
        expect(pending[0]?.code).toBe(reqOut.devEmailVerificationCode);
        expect(pending[0]?.encNew).not.toBeNull();

        const confirm = await performUserEmailChangeConfirm({
          db,
          env,
          accessCookie: access,
          oldLoginHash: loginHash,
          emailVerificationCode: reqOut.devEmailVerificationCode!,
          newLoginHash,
          newEncryptedPrivateKeyring: rand32(),
          newEncryptedSymmetricKeyring: rand32(),
        });
        expect(confirm.cookieLines.length).toBeGreaterThan(0);

        const row = await db
          .select({
            encryptedEmail: users.encryptedEmail,
            emailHash: users.emailHash,
            encNew: users.encryptedNewEmail,
            code: users.emailVerificationCode,
          })
          .from(users)
          .where(eq(users.id, userId));
        const u = row[0]!;
        expect(u.encNew).toBeNull();
        expect(u.code).toBeNull();

        const storedPlain = decryptUserEmail(
          new Uint8Array(u.encryptedEmail),
          env.USER_EMAIL_ENCRYPTION_KEY,
          exceptions,
        );
        expect(storedPlain).toBe(newEmail.trim().toLowerCase());

        const expectedHash = Buffer.from(
          await hashUserEmail(storedPlain, env.USER_EMAIL_SECRET, exceptions),
        );
        expect(Buffer.from(u.emailHash).equals(expectedHash)).toBe(true);
      } finally {
        await client.end({ timeout: 5 });
        const admin2 = postgres(ctx.adminUrl, { max: 1 });
        try {
          await dropDatabaseIfExists(admin2, cloneName);
        } finally {
          await admin2.end({ timeout: 5 });
        }
      }
    });

    it("email change request rejects wrong password", async () => {
      const env = testSessionEnv();
      const cloneName = `dn_test_${randomBytes(8).toString("hex")}`;
      const admin = postgres(ctx.adminUrl, { max: 1 });
      try {
        await createDatabaseFromTemplate(admin, cloneName, ctx.templateName);
      } finally {
        await admin.end({ timeout: 5 });
      }

      const cloneUrl = withDatabaseName(baseCtx.appBaseUrl, cloneName);
      const client = postgres(cloneUrl, { max: 1 });
      const db = drizzle(client, { schema });
      try {
        const email = `w-${nanoid()}@example.com`;
        const loginHash = rand32();
        const reg = await buildRegisterBody(email, loginHash);
        await performUserRegister({ db, env, body: reg });

        const access = await signAccessToken({
          secret: env.ACCESS_SECRET,
          userId: reg.userId,
          sessionId: nanoid(),
        });

        const wrongHash = rand32();
        await expect(
          performUserEmailChangeRequest({
            db,
            env,
            accessCookie: access,
            oldLoginHash: wrongHash,
            newEmail: `x-${nanoid()}@example.com`,
          }),
        ).rejects.toMatchObject({ status: 400, code: "BAD_REQUEST" });
      } finally {
        await client.end({ timeout: 5 });
        const admin2 = postgres(ctx.adminUrl, { max: 1 });
        try {
          await dropDatabaseIfExists(admin2, cloneName);
        } finally {
          await admin2.end({ timeout: 5 });
        }
      }
    });
  },
);
