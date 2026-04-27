import { randomBytes } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import sodium from "libsodium-wrappers-sumo";
import { nanoid } from "nanoid";
import { authenticator } from "otplib";
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
import {
  devices,
  groupMembers,
  groups,
  notifications,
  pageLinks,
  pageUpdates,
  pages,
  sessions,
  users,
  usersNotifications,
} from "@deepnotes/db/schema";

import { performUserPasswordChange } from "./change-user-password.js";
import {
  performUserEmailChangeConfirm,
  performUserEmailChangeRequest,
} from "./change-user-email.js";
import { performSessionLogin } from "./login.js";
import { performSessionRefresh } from "./refresh.js";
import {
  performUserTwoFactorEnableFinish,
  performUserTwoFactorEnableRequest,
} from "./user-two-factor-settings.js";
import {
  createPrivateKeyring,
  createSymmetricKeyring,
  getPasswordHashValues,
} from "./crypto/index.js";
import {
  decryptRecoveryCodes,
  derivePasswordValues,
  decryptUserRehashedLoginHash,
  ensureSodiumReady,
} from "./crypto/session-crypto.js";
import type { UserRegisterInput } from "./register-user.js";
import {
  performGetGroupMainPageId,
  performGetGroupMemberUserIds,
} from "./group-main-and-members.js";
import {
  performGroupPasswordChange,
  performGroupPasswordDisable,
  performGroupPasswordEnable,
  performGroupPrivacyMakePrivate,
  performGroupPrivacyMakePublic,
  performGroupPrivacySetJoinRequestsAllowed,
  performGroupPurge,
  performGroupRestore,
  performGroupSoftDelete,
  performPageBacklinkCreate,
  performPageBacklinkDelete,
  performPageBump,
  performPageMove,
  performPagePurge,
  performPageRestore,
  performPageSnapshotDelete,
  performPageSnapshotLoad,
  performPageSnapshotSave,
  performPageSoftDelete,
} from "./index.js";
import {
  performCreatePage,
  performListGroupPages,
} from "./group-pages.js";
import { performGetUserGroupIds } from "./user-group-ids.js";
import {
  performAddFavoritePages,
  performClearRecentPages,
  performGetCurrentPath,
  performGetStartingPageId,
  performLoadNotifications,
  performMarkNotificationsRead,
  performPatchDefaultNote,
  performRemoveFavoritePages,
  performRemoveRecentPages,
} from "./user-page-prefs.js";
import { performUserRegister } from "./register-user.js";
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
    GROUP_REHASHED_PASSWORD_HASH_ENCRYPTION_KEY: b32(5),
    SEND_EMAILS: "false",
    DEV: "true",
  };
}

function rand32(): Uint8Array {
  return sodium.randombytes_buf(32);
}

/** First `name=value` segment from `Set-Cookie` lines (values are URI-encoded). */
function cookieValueFromSetCookieLines(
  lines: string[],
  name: string,
): string | undefined {
  const prefix = `${name}=`;
  for (const line of lines) {
    if (!line.startsWith(prefix)) continue;
    const rest = line.slice(prefix.length);
    const semi = rest.indexOf(";");
    const raw = (semi === -1 ? rest : rest.slice(0, semi)).trim();
    return decodeURIComponent(raw);
  }
  return undefined;
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
  "account flows + sessions: Postgres template DB",
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

    it("email change confirm rejects wrong verification code", async () => {
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
        const initialEmail = `e-${nanoid()}@example.com`;
        const newEmail = `f-${nanoid()}@example.com`;
        const loginHash = rand32();
        const reg = await buildRegisterBody(initialEmail, loginHash);
        const { userId } = await performUserRegister({ db, env, body: reg });
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
        const wrongCode =
          reqOut.devEmailVerificationCode === "000000" ? "000001" : "000000";
        await expect(
          performUserEmailChangeConfirm({
            db,
            env,
            accessCookie: access,
            oldLoginHash: loginHash,
            emailVerificationCode: wrongCode,
            newLoginHash: rand32(),
            newEncryptedPrivateKeyring: rand32(),
            newEncryptedSymmetricKeyring: rand32(),
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

    it("password change updates PHC and keyrings; new password unwraps storage", async () => {
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
        const email = `p-${nanoid()}@example.com`;
        const oldLogin = rand32();
        const newLogin = rand32();
        const newPriv = rand32();
        const newSym = rand32();
        const reg = await buildRegisterBody(email, oldLogin);
        const { userId } = await performUserRegister({ db, env, body: reg });
        const access = await signAccessToken({
          secret: env.ACCESS_SECRET,
          userId,
          sessionId: nanoid(),
        });
        const out = await performUserPasswordChange({
          db,
          env,
          accessCookie: access,
          oldLoginHash: oldLogin,
          newLoginHash: newLogin,
          newEncryptedPrivateKeyring: newPriv,
          newEncryptedSymmetricKeyring: newSym,
        });
        expect(out.cookieLines.length).toBeGreaterThan(0);

        const [u] = await db
          .select({
            encPhc: users.encryptedRehashedLoginHash,
            encPriv: users.encryptedPrivateKeyring,
            encSym: users.encryptedSymmetricKeyring,
          })
          .from(users)
          .where(eq(users.id, userId));
        const phcPlain = decryptUserRehashedLoginHash(
          new Uint8Array(u!.encPhc),
          env.USER_REHASHED_LOGIN_HASH_ENCRYPTION_KEY,
        );
        const phcVals = getPasswordHashValues(phcPlain);
        const derived = derivePasswordValues({
          password: newLogin,
          salt: phcVals.saltBytes,
        });
        expect(sodium.memcmp(derived.hash, phcVals.hashBytes)).toBe(true);

        const unwrapKey = derived.key;
        const privUnwrapped = createPrivateKeyring(new Uint8Array(u!.encPriv)).unwrapSymmetric(
          unwrapKey,
          {
            associatedData: {
              context: "UserEncryptedPrivateKeyring",
              userId,
            },
          },
        );
        const symUnwrapped = createSymmetricKeyring(
          new Uint8Array(u!.encSym),
        ).unwrapSymmetric(unwrapKey, {
          associatedData: {
            context: "UserEncryptedSymmetricKeyring",
            userId,
          },
        });
        expect(new Uint8Array(privUnwrapped.value)).toEqual(newPriv);
        expect(new Uint8Array(symUnwrapped.value)).toEqual(newSym);
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

    it("password change sets invalidated on all sessions", async () => {
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
        const email = `q-${nanoid()}@example.com`;
        const oldLogin = rand32();
        const newLogin = rand32();
        const reg = await buildRegisterBody(email, oldLogin);
        await performUserRegister({ db, env, body: reg });
        const { userId } = reg;
        const deviceId = nanoid();
        const sessionId = nanoid();
        const exp = new Date(Date.now() + 86_400_000).toISOString();
        await db.insert(devices).values({
          id: deviceId,
          userId,
          hash: randomBytes(32),
          trusted: false,
        });
        await db.insert(sessions).values({
          id: sessionId,
          userId,
          deviceId,
          invalidated: false,
          encryptionKey: randomBytes(32),
          refreshCode: nanoid(),
          expirationDate: exp,
        });

        const access = await signAccessToken({
          secret: env.ACCESS_SECRET,
          userId,
          sessionId: nanoid(),
        });
        await performUserPasswordChange({
          db,
          env,
          accessCookie: access,
          oldLoginHash: oldLogin,
          newLoginHash: newLogin,
          newEncryptedPrivateKeyring: rand32(),
          newEncryptedSymmetricKeyring: rand32(),
        });
        const sessRows = await db
          .select({ invalidated: sessions.invalidated })
          .from(sessions)
          .where(eq(sessions.userId, userId));
        expect(sessRows).toEqual([{ invalidated: true }]);
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

    it("password change rejects wrong old password", async () => {
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
        const email = `r-${nanoid()}@example.com`;
        const loginHash = rand32();
        const reg = await buildRegisterBody(email, loginHash);
        await performUserRegister({ db, env, body: reg });
        const access = await signAccessToken({
          secret: env.ACCESS_SECRET,
          userId: reg.userId,
          sessionId: nanoid(),
        });
        await expect(
          performUserPasswordChange({
            db,
            env,
            accessCookie: access,
            oldLoginHash: rand32(),
            newLoginHash: rand32(),
            newEncryptedPrivateKeyring: rand32(),
            newEncryptedSymmetricKeyring: rand32(),
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

    it("login creates session row; refresh rotates encryption key and refresh code", async () => {
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
      const clientIp = "203.0.113.50";
      const userAgent = "integration-test/1";
      try {
        const email = `l-${nanoid()}@example.com`;
        const loginHash = rand32();
        const reg = await buildRegisterBody(email, loginHash);
        await performUserRegister({ db, env, body: reg });

        const loginOut = await performSessionLogin({
          db,
          env,
          body: {
            email,
            loginHash,
            rememberSession: false,
          },
          clientIp,
          userAgent,
        });
        const sessionId = loginOut.json.sessionId;
        expect(typeof sessionId).toBe("string");

        const [before] = await db
          .select({
            refreshCode: sessions.refreshCode,
            encryptionKey: sessions.encryptionKey,
          })
          .from(sessions)
          .where(eq(sessions.id, sessionId as string));
        expect(before).toBeDefined();

        const refresh1 = cookieValueFromSetCookieLines(
          loginOut.cookieLines,
          "refreshToken",
        );
        const loggedIn1 = cookieValueFromSetCookieLines(
          loginOut.cookieLines,
          "loggedIn",
        );
        expect(refresh1).toBeDefined();
        expect(loggedIn1).toBe("true");

        const refreshOut = await performSessionRefresh({
          db,
          env,
          refreshCookie: refresh1,
          loggedInCookie: loggedIn1,
        });

        const oldKeyB64 = refreshOut.json.oldSessionKey;
        const newKeyB64 = refreshOut.json.newSessionKey;
        expect(typeof oldKeyB64).toBe("string");
        expect(typeof newKeyB64).toBe("string");
        expect(
          Buffer.from(oldKeyB64 as string, "base64").equals(
            new Uint8Array(before!.encryptionKey),
          ),
        ).toBe(true);

        const [after] = await db
          .select({
            refreshCode: sessions.refreshCode,
            encryptionKey: sessions.encryptionKey,
          })
          .from(sessions)
          .where(eq(sessions.id, sessionId as string));
        expect(after!.refreshCode).not.toBe(before!.refreshCode);
        expect(
          Buffer.from(newKeyB64 as string, "base64").equals(
            new Uint8Array(after!.encryptionKey),
          ),
        ).toBe(true);

        const refresh2 = cookieValueFromSetCookieLines(
          refreshOut.cookieLines,
          "refreshToken",
        );
        const loggedIn2 = cookieValueFromSetCookieLines(
          refreshOut.cookieLines,
          "loggedIn",
        );
        const refreshOut2 = await performSessionRefresh({
          db,
          env,
          refreshCookie: refresh2,
          loggedInCookie: loggedIn2,
        });
        expect(typeof refreshOut2.json.newSessionKey).toBe("string");
        const [after2] = await db
          .select({ encryptionKey: sessions.encryptionKey })
          .from(sessions)
          .where(eq(sessions.id, sessionId as string));
        expect(
          Buffer.from(refreshOut2.json.newSessionKey as string, "base64").equals(
            new Uint8Array(after2!.encryptionKey),
          ),
        ).toBe(true);

        await expect(
          performSessionRefresh({
            db,
            env,
            refreshCookie: refresh1,
            loggedInCookie: loggedIn1,
          }),
        ).rejects.toMatchObject({
          status: 401,
          code: "UNAUTHORIZED",
          message: "Session was invalidated.",
        });
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

    it("refresh rejects when loggedIn cookie is not true", async () => {
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
        const email = `rf-${nanoid()}@example.com`;
        const loginHash = rand32();
        const reg = await buildRegisterBody(email, loginHash);
        await performUserRegister({ db, env, body: reg });
        const loginOut = await performSessionLogin({
          db,
          env,
          body: { email, loginHash, rememberSession: false },
          clientIp: "203.0.113.60",
          userAgent: "integration-test/refresh-cookie",
        });
        const refresh = cookieValueFromSetCookieLines(
          loginOut.cookieLines,
          "refreshToken",
        );
        await expect(
          performSessionRefresh({
            db,
            env,
            refreshCookie: refresh,
            loggedInCookie: "false",
          }),
        ).rejects.toMatchObject({
          status: 401,
          message: "User not logged in.",
        });
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

    it("refresh rejects missing refresh token", async () => {
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
        await expect(
          performSessionRefresh({
            db,
            env,
            refreshCookie: undefined,
            loggedInCookie: "true",
          }),
        ).rejects.toMatchObject({
          status: 401,
          message: "No refresh token received.",
        });
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

    it("login rejects wrong password", async () => {
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
        const email = `m-${nanoid()}@example.com`;
        const loginHash = rand32();
        const reg = await buildRegisterBody(email, loginHash);
        await performUserRegister({ db, env, body: reg });
        await expect(
          performSessionLogin({
            db,
            env,
            body: {
              email,
              loginHash: rand32(),
              rememberSession: false,
            },
            clientIp: "198.51.100.1",
            userAgent: "integration-test/2",
          }),
        ).rejects.toMatchObject({ status: 401, code: "UNAUTHORIZED" });
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

    it("password change rejects demo-flagged user", async () => {
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
        const email = `d-${nanoid()}@example.com`;
        const loginHash = rand32();
        const reg = await buildRegisterBody(email, loginHash);
        await performUserRegister({ db, env, body: reg });
        await db.update(users).set({ demo: true }).where(eq(users.id, reg.userId));
        const access = await signAccessToken({
          secret: env.ACCESS_SECRET,
          userId: reg.userId,
          sessionId: nanoid(),
        });
        await expect(
          performUserPasswordChange({
            db,
            env,
            accessCookie: access,
            oldLoginHash: loginHash,
            newLoginHash: rand32(),
            newEncryptedPrivateKeyring: rand32(),
            newEncryptedSymmetricKeyring: rand32(),
          }),
        ).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
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

    it("2FA enable/finish persists flags; login succeeds with TOTP", async () => {
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
      const clientIp = "203.0.113.51";
      const userAgent = "integration-test/2fa";
      try {
        const email = `2fa-${nanoid()}@example.com`;
        const loginHash = rand32();
        const reg = await buildRegisterBody(email, loginHash);
        await performUserRegister({ db, env, body: reg });
        const access = await signAccessToken({
          secret: env.ACCESS_SECRET,
          userId: reg.userId,
          sessionId: nanoid(),
        });

        const { secret } = await performUserTwoFactorEnableRequest({
          db,
          env,
          accessCookie: access,
          loginHash,
        });
        const finishToken = authenticator.generate(secret);
        const { recoveryCodes } = await performUserTwoFactorEnableFinish({
          db,
          env,
          accessCookie: access,
          loginHash,
          authenticatorToken: finishToken,
        });
        expect(recoveryCodes).toHaveLength(6);
        expect(recoveryCodes.every((c) => /^[0-9a-f]{32}$/.test(c))).toBe(true);

        const [u2fa] = await db
          .select({
            enabled: users.twoFactorAuthEnabled,
            encAuth: users.encryptedAuthenticatorSecret,
            encRec: users.encryptedRecoveryCodes,
          })
          .from(users)
          .where(eq(users.id, reg.userId));
        expect(u2fa?.enabled).toBe(true);
        expect(u2fa?.encAuth).not.toBeNull();
        expect(u2fa?.encRec).not.toBeNull();

        const totp = authenticator.generate(secret);
        const loginOut = await performSessionLogin({
          db,
          env,
          body: {
            email,
            loginHash,
            rememberSession: false,
            authenticatorToken: totp,
          },
          clientIp,
          userAgent,
        });
        expect(typeof loginOut.json.sessionId).toBe("string");
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

    it("2FA enable/finish rejects wrong authenticator token", async () => {
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
        const email = `2fb-${nanoid()}@example.com`;
        const loginHash = rand32();
        const reg = await buildRegisterBody(email, loginHash);
        await performUserRegister({ db, env, body: reg });
        const access = await signAccessToken({
          secret: env.ACCESS_SECRET,
          userId: reg.userId,
          sessionId: nanoid(),
        });
        await performUserTwoFactorEnableRequest({
          db,
          env,
          accessCookie: access,
          loginHash,
        });
        await expect(
          performUserTwoFactorEnableFinish({
            db,
            env,
            accessCookie: access,
            loginHash,
            authenticatorToken: "000000",
          }),
        ).rejects.toMatchObject({
          status: 400,
          code: "BAD_REQUEST",
          message: "Authenticator token is incorrect.",
        });
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

    it("login with 2FA enabled requires TOTP when device is not trusted", async () => {
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
        const email = `2fc-${nanoid()}@example.com`;
        const loginHash = rand32();
        const reg = await buildRegisterBody(email, loginHash);
        await performUserRegister({ db, env, body: reg });
        const access = await signAccessToken({
          secret: env.ACCESS_SECRET,
          userId: reg.userId,
          sessionId: nanoid(),
        });
        const { secret } = await performUserTwoFactorEnableRequest({
          db,
          env,
          accessCookie: access,
          loginHash,
        });
        await performUserTwoFactorEnableFinish({
          db,
          env,
          accessCookie: access,
          loginHash,
          authenticatorToken: authenticator.generate(secret),
        });

        await expect(
          performSessionLogin({
            db,
            env,
            body: { email, loginHash, rememberSession: false },
            clientIp: "198.51.100.20",
            userAgent: "integration-test/2fa-missing",
          }),
        ).rejects.toMatchObject({
          status: 401,
          code: "UNAUTHORIZED",
          message: "Requires two-factor authentication.",
        });
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

    it("login with 2FA rejects invalid TOTP", async () => {
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
        const email = `2fd-${nanoid()}@example.com`;
        const loginHash = rand32();
        const reg = await buildRegisterBody(email, loginHash);
        await performUserRegister({ db, env, body: reg });
        const access = await signAccessToken({
          secret: env.ACCESS_SECRET,
          userId: reg.userId,
          sessionId: nanoid(),
        });
        const { secret } = await performUserTwoFactorEnableRequest({
          db,
          env,
          accessCookie: access,
          loginHash,
        });
        await performUserTwoFactorEnableFinish({
          db,
          env,
          accessCookie: access,
          loginHash,
          authenticatorToken: authenticator.generate(secret),
        });

        await expect(
          performSessionLogin({
            db,
            env,
            body: {
              email,
              loginHash,
              rememberSession: false,
              authenticatorToken: "111111",
            },
            clientIp: "198.51.100.21",
            userAgent: "integration-test/2fa-bad",
          }),
        ).rejects.toMatchObject({
          status: 401,
          code: "UNAUTHORIZED",
          message: "Invalid authenticator token.",
        });
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

    it("2FA login succeeds with recovery code; same code cannot be reused", async () => {
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
      const clientIp = "203.0.113.70";
      const userAgent = "integration-test/2fa-recovery";
      try {
        const email = `2fr-${nanoid()}@example.com`;
        const loginHash = rand32();
        const reg = await buildRegisterBody(email, loginHash);
        await performUserRegister({ db, env, body: reg });
        const access = await signAccessToken({
          secret: env.ACCESS_SECRET,
          userId: reg.userId,
          sessionId: nanoid(),
        });
        const { secret } = await performUserTwoFactorEnableRequest({
          db,
          env,
          accessCookie: access,
          loginHash,
        });
        const { recoveryCodes } = await performUserTwoFactorEnableFinish({
          db,
          env,
          accessCookie: access,
          loginHash,
          authenticatorToken: authenticator.generate(secret),
        });
        const firstCode = recoveryCodes[0]!;
        expect(firstCode).toMatch(/^[0-9a-f]{32}$/);

        const loginOut = await performSessionLogin({
          db,
          env,
          body: {
            email,
            loginHash,
            rememberSession: false,
            recoveryCode: firstCode,
          },
          clientIp,
          userAgent,
        });
        expect(typeof loginOut.json.sessionId).toBe("string");

        const [uAfter] = await db
          .select({ encRec: users.encryptedRecoveryCodes })
          .from(users)
          .where(eq(users.id, reg.userId));
        const remaining = decryptRecoveryCodes(
          new Uint8Array(uAfter!.encRec!),
          env.USER_RECOVERY_CODES_ENCRYPTION_KEY,
        );
        expect(remaining).toHaveLength(5);

        await expect(
          performSessionLogin({
            db,
            env,
            body: {
              email,
              loginHash,
              rememberSession: false,
              recoveryCode: firstCode,
            },
            clientIp: "198.51.100.71",
            userAgent: `${userAgent}-replay`,
          }),
        ).rejects.toMatchObject({
          status: 401,
          message: "Invalid recovery code.",
        });
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

    it("groups: get ids, list pages, create second page in personal group", async () => {
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
        const email = `grp-${nanoid()}@example.com`;
        const loginHash = rand32();
        const reg = await buildRegisterBody(email, loginHash);
        await performUserRegister({ db, env, body: reg });
        const access = await signAccessToken({
          secret: env.ACCESS_SECRET,
          userId: reg.userId,
          sessionId: nanoid(),
        });

        const { groupIds } = await performGetUserGroupIds({
          db,
          env,
          accessCookie: access,
        });
        expect(groupIds).toEqual([reg.groupId]);

        const listed = await performListGroupPages({
          db,
          env,
          accessCookie: access,
          groupId: reg.groupId,
        });
        expect(listed.hasMore).toBe(false);
        expect(listed.pageIds).toEqual([reg.pageId]);

        const main = await performGetGroupMainPageId({
          db,
          env,
          accessCookie: access,
          groupId: reg.groupId,
        });
        expect(main.mainPageId).toBe(reg.pageId);

        const members = await performGetGroupMemberUserIds({
          db,
          env,
          accessCookie: access,
          groupId: reg.groupId,
        });
        expect(members.userIds.sort()).toEqual([reg.userId]);

        const newPageId = nanoid();
        const out = await performCreatePage({
          db,
          env,
          accessCookie: access,
          groupId: reg.groupId,
          body: {
            parentPageId: reg.pageId,
            pageId: newPageId,
            pageEncryptedSymmetricKeyring: rand32(),
            pageEncryptedRelativeTitle: rand32(),
            pageEncryptedAbsoluteTitle: rand32(),
          },
        });
        expect(out.pageId).toBe(newPageId);
        expect(out.numFreePages).toBe(1);

        const [urow] = await db
          .select({ n: users.numFreePages })
          .from(users)
          .where(eq(users.id, reg.userId));
        expect(urow?.n).toBe(1);

        const ids = await db
          .select({ id: pages.id })
          .from(pages)
          .where(eq(pages.groupId, reg.groupId));
        expect(ids.map((r) => r.id).sort()).toEqual(
          [reg.pageId, newPageId].sort(),
        );

        await expect(
          performListGroupPages({
            db,
            env,
            accessCookie: access,
            groupId: "nononononononononono1",
          }),
        ).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });
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

    it("pages: create with groupCreation (new shared group + first page)", async () => {
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
        const email = `gcreate-${nanoid()}@example.com`;
        const loginHash = rand32();
        const reg = await buildRegisterBody(email, loginHash);
        await performUserRegister({ db, env, body: reg });
        await db
          .update(users)
          .set({ plan: "pro" })
          .where(eq(users.id, reg.userId));
        const access = await signAccessToken({
          secret: env.ACCESS_SECRET,
          userId: reg.userId,
          sessionId: nanoid(),
        });

        const newGroupId = nanoid();
        const newPageId = nanoid();
        const gc = {
          groupEncryptedName: rand32(),
          groupIsPublic: true,
          groupAccessKeyring: rand32(),
          groupEncryptedInternalKeyring: rand32(),
          groupEncryptedContentKeyring: rand32(),
          groupPublicKeyring: rand32(),
          groupEncryptedPrivateKeyring: rand32(),
          groupOwnerEncryptedName: rand32(),
        };
        const out = await performCreatePage({
          db,
          env,
          accessCookie: access,
          groupId: newGroupId,
          body: {
            parentPageId: reg.pageId,
            pageId: newPageId,
            pageEncryptedSymmetricKeyring: rand32(),
            pageEncryptedRelativeTitle: rand32(),
            pageEncryptedAbsoluteTitle: rand32(),
            groupCreation: gc,
          },
        });
        expect(out.pageId).toBe(newPageId);
        const [gRow] = await db
          .select({
            id: groups.id,
            mainPageId: groups.mainPageId,
            userId: groups.userId,
          })
          .from(groups)
          .where(eq(groups.id, newGroupId));
        expect(gRow?.mainPageId).toBe(newPageId);
        expect(gRow?.userId).toBeNull();
        const [pRow] = await db
          .select({ groupId: pages.groupId })
          .from(pages)
          .where(eq(pages.id, newPageId));
        expect(pRow?.groupId).toBe(newGroupId);
        const [mem] = await db
          .select({ role: groupMembers.role, userId: groupMembers.userId })
          .from(groupMembers)
          .where(
            and(
              eq(groupMembers.groupId, newGroupId),
              eq(groupMembers.userId, reg.userId),
            ),
          );
        expect(mem?.role).toBe("owner");
        const { groupIds } = await performGetUserGroupIds({
          db,
          env,
          accessCookie: access,
        });
        expect(groupIds.sort()).toEqual([reg.groupId, newGroupId].sort());
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

    it("user page prefs: starting, path, favorites, recent, defaults, notifications", async () => {
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
        const email = `prefs-${nanoid()}@example.com`;
        const loginHash = rand32();
        const reg = await buildRegisterBody(email, loginHash);
        await performUserRegister({ db, env, body: reg });
        const access = await signAccessToken({
          secret: env.ACCESS_SECRET,
          userId: reg.userId,
          sessionId: nanoid(),
        });

        const start = await performGetStartingPageId({
          db,
          env,
          accessCookie: access,
        });
        expect(start.startingPageId).toBe(reg.pageId);

        const path1 = await performGetCurrentPath({
          db,
          env,
          accessCookie: access,
          initialPageId: reg.pageId,
        });
        expect(path1.pathPageIds).toEqual([reg.pageId]);

        const newPageId = nanoid();
        await performCreatePage({
          db,
          env,
          accessCookie: access,
          groupId: reg.groupId,
          body: {
            parentPageId: reg.pageId,
            pageId: newPageId,
            pageEncryptedSymmetricKeyring: rand32(),
            pageEncryptedRelativeTitle: rand32(),
            pageEncryptedAbsoluteTitle: rand32(),
          },
        });

        const path2 = await performGetCurrentPath({
          db,
          env,
          accessCookie: access,
          initialPageId: newPageId,
        });
        expect(path2.pathPageIds).toEqual([reg.pageId, newPageId]);

        await expect(
          performGetCurrentPath({
            db,
            env,
            accessCookie: access,
            initialPageId: "nononononononononono1",
          }),
        ).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });

        await performAddFavoritePages({
          db,
          env,
          accessCookie: access,
          pageIds: [reg.pageId, newPageId],
        });
        const [favRow] = await db
          .select({ favoritePageIds: users.favoritePageIds })
          .from(users)
          .where(eq(users.id, reg.userId));
        expect(favRow?.favoritePageIds).toEqual([reg.pageId, newPageId]);

        await performRemoveFavoritePages({
          db,
          env,
          accessCookie: access,
          pageIds: [reg.pageId],
        });
        const [favAfter] = await db
          .select({ favoritePageIds: users.favoritePageIds })
          .from(users)
          .where(eq(users.id, reg.userId));
        expect(favAfter?.favoritePageIds).toEqual([newPageId]);

        await expect(
          performRemoveRecentPages({
            db,
            env,
            accessCookie: access,
            pageIds: ["nononononononononono1"],
          }),
        ).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });

        await expect(
          performRemoveRecentPages({
            db,
            env,
            accessCookie: access,
            pageIds: [newPageId],
          }),
        ).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });

        await performRemoveRecentPages({
          db,
          env,
          accessCookie: access,
          pageIds: [reg.pageId],
        });
        const [recentMid] = await db
          .select({ recentPageIds: users.recentPageIds })
          .from(users)
          .where(eq(users.id, reg.userId));
        expect(recentMid?.recentPageIds).toEqual([]);

        await performClearRecentPages({
          db,
          env,
          accessCookie: access,
        });
        const [recentClear] = await db
          .select({ recentPageIds: users.recentPageIds })
          .from(users)
          .where(eq(users.id, reg.userId));
        expect(recentClear?.recentPageIds).toEqual([]);

        const newNote = rand32();
        await performPatchDefaultNote({
          db,
          env,
          accessCookie: access,
          userEncryptedDefaultNote: newNote,
        });
        const [noteRow] = await db
          .select({ enc: users.encryptedDefaultNote })
          .from(users)
          .where(eq(users.id, reg.userId));
        expect(Buffer.from(newNote).equals(noteRow!.enc)).toBe(true);

        const [n] = await db
          .insert(notifications)
          .values({
            type: "unit-test",
            encryptedContent: Buffer.from("hello-notif"),
          })
          .returning({ id: notifications.id });

        await db.insert(usersNotifications).values({
          userId: reg.userId,
          notificationId: n!.id,
          encryptedSymmetricKey: Buffer.from("sym-key"),
        });

        const loaded = await performLoadNotifications({
          db,
          env,
          accessCookie: access,
        });
        expect(loaded.hasMore).toBe(false);
        expect(loaded.items).toHaveLength(1);
        expect(loaded.items[0]!.id).toBe(n!.id);
        expect(loaded.items[0]!.type).toBe("unit-test");
        expect(loaded.lastNotificationRead).toBeNull();

        await performMarkNotificationsRead({
          db,
          env,
          accessCookie: access,
        });
        const [readRow] = await db
          .select({ lastNotificationRead: users.lastNotificationRead })
          .from(users)
          .where(eq(users.id, reg.userId));
        expect(readRow?.lastNotificationRead).toBe(n!.id);
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

    it("group privacy make private clears access_keyring and rejects repeat", async () => {
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
        const email = `priv-${nanoid()}@example.com`;
        const loginHash = rand32();
        const reg = await buildRegisterBody(email, loginHash);
        await performUserRegister({ db, env, body: reg });
        await db
          .update(users)
          .set({ plan: "pro" })
          .where(eq(users.id, reg.userId));
        const access = await signAccessToken({
          secret: env.ACCESS_SECRET,
          userId: reg.userId,
          sessionId: nanoid(),
        });

        const [mem] = await db
          .select({
            encryptedName: groupMembers.encryptedName,
          })
          .from(groupMembers)
          .where(
            and(
              eq(groupMembers.groupId, reg.groupId),
              eq(groupMembers.userId, reg.userId),
            ),
          );
        expect(mem).toBeDefined();
        const memberRow = mem!;

        const newPageSym = rand32();
        await performGroupPrivacyMakePrivate({
          db,
          env,
          accessCookie: access,
          groupId: reg.groupId,
          payload: {
            groupEncryptedName: rand32(),
            groupEncryptedContentKeyring: rand32(),
            groupPublicKeyring: rand32(),
            groupEncryptedPrivateKeyring: rand32(),
            groupMembers: {
              [reg.userId]: {
                encryptedAccessKeyring: rand32(),
                encryptedInternalKeyring: rand32(),
                encryptedName:
                  memberRow.encryptedName != null ? rand32() : null,
              },
            },
            groupJoinInvitations: {},
            groupJoinRequests: {},
            groupPages: {
              [reg.pageId]: { encryptedSymmetricKeyring: newPageSym },
            },
          },
        });

        const [gAfter] = await db
          .select({ accessKeyring: groups.accessKeyring })
          .from(groups)
          .where(eq(groups.id, reg.groupId));
        expect(gAfter?.accessKeyring).toBeNull();

        const [pAfter] = await db
          .select({ sk: pages.encryptedSymmetricKeyring })
          .from(pages)
          .where(eq(pages.id, reg.pageId));
        expect(
          Buffer.from(pAfter!.sk!).equals(Buffer.from(newPageSym)),
        ).toBe(true);

        await expect(
          performGroupPrivacyMakePrivate({
            db,
            env,
            accessCookie: access,
            groupId: reg.groupId,
            payload: {
              groupEncryptedName: rand32(),
              groupEncryptedContentKeyring: rand32(),
              groupPublicKeyring: rand32(),
              groupEncryptedPrivateKeyring: rand32(),
              groupMembers: {
                [reg.userId]: {
                  encryptedAccessKeyring: rand32(),
                  encryptedInternalKeyring: rand32(),
                  encryptedName: rand32(),
                },
              },
              groupJoinInvitations: {},
              groupJoinRequests: {},
              groupPages: {
                [reg.pageId]: { encryptedSymmetricKeyring: rand32() },
              },
            },
          }),
        ).rejects.toMatchObject({
          code: "BAD_REQUEST",
          message: "Group is already private.",
        });

        await db
          .update(groups)
          .set({ accessKeyring: Buffer.from(rand32()) })
          .where(eq(groups.id, reg.groupId));
        await expect(
          performGroupPrivacyMakePrivate({
            db,
            env,
            accessCookie: access,
            groupId: reg.groupId,
            payload: {
              groupEncryptedName: rand32(),
              groupEncryptedContentKeyring: rand32(),
              groupPublicKeyring: rand32(),
              groupEncryptedPrivateKeyring: rand32(),
              groupMembers: {
                [reg.userId]: {
                  encryptedAccessKeyring: rand32(),
                  encryptedInternalKeyring: rand32(),
                  encryptedName: rand32(),
                },
              },
              groupJoinInvitations: {},
              groupJoinRequests: {},
              groupPages: {
                [reg.pageId]: { encryptedSymmetricKeyring: rand32() },
                [nanoid()]: { encryptedSymmetricKeyring: rand32() },
              },
            },
          }),
        ).rejects.toMatchObject({ code: "BAD_REQUEST" });
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

    it("group password, privacy, soft delete, purge, restore failure after purge", async () => {
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
        const email = `gadm-${nanoid()}@example.com`;
        const loginHash = rand32();
        const reg = await buildRegisterBody(email, loginHash);
        await performUserRegister({ db, env, body: reg });
        await db
          .update(users)
          .set({ plan: "pro" })
          .where(eq(users.id, reg.userId));
        const access = await signAccessToken({
          secret: env.ACCESS_SECRET,
          userId: reg.userId,
          sessionId: nanoid(),
        });
        const gpass = new TextEncoder().encode("gpass-1");
        const gpass2 = new TextEncoder().encode("gpass-2");
        const kr = rand32();

        await performGroupPasswordEnable({
          db,
          env,
          accessCookie: access,
          groupId: reg.groupId,
          groupPasswordHash: gpass,
          groupEncryptedContentKeyring: kr,
        });
        const [h1] = await db
          .select({ h: groups.encryptedRehashedPasswordHash })
          .from(groups)
          .where(eq(groups.id, reg.groupId));
        expect(h1?.h).toBeDefined();

        await performGroupPasswordChange({
          db,
          env,
          accessCookie: access,
          groupId: reg.groupId,
          groupCurrentPasswordHash: gpass,
          groupNewPasswordHash: gpass2,
          groupEncryptedContentKeyring: rand32(),
        });

        await performGroupPasswordDisable({
          db,
          env,
          accessCookie: access,
          groupId: reg.groupId,
          groupPasswordHash: gpass2,
          groupEncryptedContentKeyring: rand32(),
        });
        const [h2] = await db
          .select({ h: groups.encryptedRehashedPasswordHash })
          .from(groups)
          .where(eq(groups.id, reg.groupId));
        expect(h2?.h).toBeNull();

        await db
          .update(groups)
          .set({ accessKeyring: null })
          .where(eq(groups.id, reg.groupId));
        await performGroupPrivacyMakePublic({
          db,
          env,
          accessCookie: access,
          groupId: reg.groupId,
          accessKeyring: rand32(),
        });
        const [pbl] = await db
          .select({ a: groups.accessKeyring, j: groups.areJoinRequestsAllowed })
          .from(groups)
          .where(eq(groups.id, reg.groupId));
        expect(pbl?.a).not.toBeNull();

        await performGroupPrivacySetJoinRequestsAllowed({
          db,
          env,
          accessCookie: access,
          groupId: reg.groupId,
          areJoinRequestsAllowed: false,
        });
        const [jr] = await db
          .select({ j: groups.areJoinRequestsAllowed })
          .from(groups)
          .where(eq(groups.id, reg.groupId));
        expect(jr?.j).toBe(false);

        await performGroupSoftDelete({
          db,
          env,
          accessCookie: access,
          groupId: reg.groupId,
        });
        const [sd] = await db
          .select({ d: groups.permanentDeletionDate })
          .from(groups)
          .where(eq(groups.id, reg.groupId));
        expect(sd?.d).toBeDefined();
        expect(new Date(sd!.d!).getTime()).toBeGreaterThan(Date.now());

        await performGroupRestore({
          db,
          env,
          accessCookie: access,
          groupId: reg.groupId,
        });
        const [rs] = await db
          .select({ d: groups.permanentDeletionDate })
          .from(groups)
          .where(eq(groups.id, reg.groupId));
        expect(rs?.d).toBeNull();

        await performGroupSoftDelete({
          db,
          env,
          accessCookie: access,
          groupId: reg.groupId,
        });
        await performGroupPurge({
          db,
          env,
          accessCookie: access,
          groupId: reg.groupId,
        });
        const [pg] = await db
          .select({ d: groups.permanentDeletionDate })
          .from(groups)
          .where(eq(groups.id, reg.groupId));
        expect(new Date(pg!.d!).getTime()).toBeLessThan(Date.now());

        await expect(
          performGroupRestore({
            db,
            env,
            accessCookie: access,
            groupId: reg.groupId,
          }),
        ).rejects.toMatchObject({ code: "BAD_REQUEST" });
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

    it("pages: bump, backlinks, snapshots, soft delete, restore, purge", async () => {
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
        const email = `pgops-${nanoid()}@example.com`;
        const loginHash = rand32();
        const reg = await buildRegisterBody(email, loginHash);
        await performUserRegister({ db, env, body: reg });
        await db
          .update(users)
          .set({ plan: "pro" })
          .where(eq(users.id, reg.userId));
        const access = await signAccessToken({
          secret: env.ACCESS_SECRET,
          userId: reg.userId,
          sessionId: nanoid(),
        });

        const page2 = nanoid();
        await performCreatePage({
          db,
          env,
          accessCookie: access,
          groupId: reg.groupId,
          body: {
            parentPageId: reg.pageId,
            pageId: page2,
            pageEncryptedSymmetricKeyring: rand32(),
            pageEncryptedRelativeTitle: rand32(),
            pageEncryptedAbsoluteTitle: rand32(),
          },
        });

        await performPageBump({
          db,
          env,
          accessCookie: access,
          pageId: page2,
          parentPageId: reg.pageId,
        });
        const [u1] = await db
          .select({
            starting: users.startingPageId,
            recent: users.recentPageIds,
          })
          .from(users)
          .where(eq(users.id, reg.userId));
        expect(u1?.starting).toBe(page2);
        expect(u1?.recent[0]).toBe(page2);

        const page3 = nanoid();
        await performCreatePage({
          db,
          env,
          accessCookie: access,
          groupId: reg.groupId,
          body: {
            parentPageId: reg.pageId,
            pageId: page3,
            pageEncryptedSymmetricKeyring: rand32(),
            pageEncryptedRelativeTitle: rand32(),
            pageEncryptedAbsoluteTitle: rand32(),
          },
        });

        await performPageBacklinkCreate({
          db,
          env,
          accessCookie: access,
          targetPageId: page2,
          sourcePageId: page3,
        });
        const [bl] = await db
          .select()
          .from(pageLinks)
          .where(
            and(
              eq(pageLinks.targetPageId, page2),
              eq(pageLinks.sourcePageId, page3),
            ),
          );
        expect(bl?.sourcePageId).toBe(page3);

        await performPageBacklinkDelete({
          db,
          env,
          accessCookie: access,
          sourcePageId: page3,
          targetPageId: page2,
        });
        const blAfter = await db
          .select()
          .from(pageLinks)
          .where(
            and(
              eq(pageLinks.targetPageId, page2),
              eq(pageLinks.sourcePageId, page3),
            ),
          );
        expect(blAfter.length).toBe(0);

        const kSym = rand32();
        const kData = rand32();
        const { snapshotId } = await performPageSnapshotSave({
          db,
          env,
          accessCookie: access,
          pageId: page2,
          encryptedSymmetricKey: kSym,
          encryptedData: kData,
        });
        const loaded = await performPageSnapshotLoad({
          db,
          env,
          accessCookie: access,
          pageId: page2,
          snapshotId,
        });
        expect(loaded.encryptedData.equals(Buffer.from(kData))).toBe(true);
        expect(loaded.encryptedSymmetricKey?.equals(Buffer.from(kSym))).toBe(
          true,
        );

        await performPageSnapshotDelete({
          db,
          env,
          accessCookie: access,
          pageId: page2,
          snapshotId,
        });

        await performPageSoftDelete({
          db,
          env,
          accessCookie: access,
          pageId: page2,
        });
        const [rowDel] = await db
          .select({ d: pages.permanentDeletionDate })
          .from(pages)
          .where(eq(pages.id, page2));
        expect(rowDel?.d).toBeDefined();

        await performPageRestore({
          db,
          env,
          accessCookie: access,
          pageId: page2,
        });
        const [rowOk] = await db
          .select({ d: pages.permanentDeletionDate })
          .from(pages)
          .where(eq(pages.id, page2));
        expect(rowOk?.d).toBeNull();

        await performPageSoftDelete({
          db,
          env,
          accessCookie: access,
          pageId: page2,
        });
        await performPagePurge({
          db,
          env,
          accessCookie: access,
          pageId: page2,
        });
        const [rowP] = await db
          .select({ d: pages.permanentDeletionDate })
          .from(pages)
          .where(eq(pages.id, page2));
        expect(new Date(rowP!.d!).getTime()).toBeLessThan(Date.now());
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

    it("pages: move (set main, groupCreation, validation)", async () => {
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
        const email = `pmove-${nanoid()}@example.com`;
        const loginHash = rand32();
        const reg = await buildRegisterBody(email, loginHash);
        await performUserRegister({ db, env, body: reg });
        await db
          .update(users)
          .set({ plan: "pro" })
          .where(eq(users.id, reg.userId));
        const access = await signAccessToken({
          secret: env.ACCESS_SECRET,
          userId: reg.userId,
          sessionId: nanoid(),
        });

        const childId = nanoid();
        await performCreatePage({
          db,
          env,
          accessCookie: access,
          groupId: reg.groupId,
          body: {
            parentPageId: reg.pageId,
            pageId: childId,
            pageEncryptedSymmetricKeyring: rand32(),
            pageEncryptedRelativeTitle: rand32(),
            pageEncryptedAbsoluteTitle: rand32(),
          },
        });

        await expect(
          performPageMove({
            db,
            env,
            accessCookie: access,
            pageId: childId,
            body: {
              destGroupId: reg.groupId,
              setAsMainPage: false,
            },
          }),
        ).rejects.toMatchObject({
          message: "No changes were requested on page move.",
        });

        await expect(
          performPageMove({
            db,
            env,
            accessCookie: access,
            pageId: reg.pageId,
            body: {
              destGroupId: reg.groupId,
              setAsMainPage: true,
            },
          }),
        ).rejects.toMatchObject({
          message:
            "Cannot move main page of a group. Please set another page as main page first.",
        });

        await performPageMove({
          db,
          env,
          accessCookie: access,
          pageId: childId,
          body: {
            destGroupId: reg.groupId,
            setAsMainPage: true,
          },
        });
        const [mPersonal] = await db
          .select({ mainPageId: groups.mainPageId, userId: groups.userId })
          .from(groups)
          .where(eq(groups.id, reg.groupId));
        expect(mPersonal?.mainPageId).toBe(childId);
        expect(mPersonal?.userId).toBe(reg.userId);

        const child2 = nanoid();
        await performCreatePage({
          db,
          env,
          accessCookie: access,
          groupId: reg.groupId,
          body: {
            parentPageId: childId,
            pageId: child2,
            pageEncryptedSymmetricKeyring: rand32(),
            pageEncryptedRelativeTitle: rand32(),
            pageEncryptedAbsoluteTitle: rand32(),
          },
        });
        const gc = {
          groupEncryptedName: rand32(),
          groupIsPublic: true,
          groupAccessKeyring: rand32(),
          groupEncryptedInternalKeyring: rand32(),
          groupEncryptedContentKeyring: rand32(),
          groupPublicKeyring: rand32(),
          groupEncryptedPrivateKeyring: rand32(),
          groupOwnerEncryptedName: rand32(),
        };
        const newGid = nanoid();
        const up = rand32();
        await performPageMove({
          db,
          env,
          accessCookie: access,
          pageId: child2,
          body: {
            destGroupId: newGid,
            setAsMainPage: false,
            groupCreation: gc,
            reencrypt: {
              pageEncryptedSymmetricKeyring: rand32(),
              pageEncryptedRelativeTitle: rand32(),
              pageEncryptedAbsoluteTitle: rand32(),
              pageEncryptedUpdate: up,
              pageEncryptedSnapshots: {},
            },
          },
        });
        const [prow] = await db
          .select({ groupId: pages.groupId })
          .from(pages)
          .where(eq(pages.id, child2));
        expect(prow?.groupId).toBe(newGid);
        const [upRow] = await db
          .select()
          .from(pageUpdates)
          .where(eq(pageUpdates.pageId, child2));
        expect(upRow?.index).toBe(0);
        expect(upRow?.encryptedData.equals(Buffer.from(up))).toBe(true);
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
