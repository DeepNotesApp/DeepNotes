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
import { groups, pages } from "@deepnotes/db/schema";

import { performCreatePage } from "./group-pages.js";
import { performPageSoftDelete, performPagePurge } from "./page-operations.js";
import { performGroupPurge } from "./group-deletion.js";
import { performScheduledCleanup } from "./scheduled-cleanup.js";
import { performUserRegister } from "./register-user.js";
import type { SessionEnv } from "./env.js";
import { ensureSodiumReady } from "./crypto/session-crypto.js";
import { signAccessToken } from "./jwt.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(__dirname, "../../../.env") });

const TEMPLATE_NAME = "dn_test_tpl_scheduled_cleanup";

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

async function buildRegisterBody(email: string, loginHash: Uint8Array) {
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
  "scheduled cleanup: Postgres template DB",
  () => {
    const baseCtx = resolveTemplateContext()!;
    const ctx: TemplateDbContext = {
      ...baseCtx,
      templateName: TEMPLATE_NAME,
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

    it("purges soft-deleted pages and groups past their grace period", async () => {
      const env = testSessionEnv();
      const cloneName = `dn_test_sched_${randomBytes(8).toString("hex")}`;
      const admin = postgres(ctx.adminUrl, { max: 1 });
      try {
        await createDatabaseFromTemplate(admin, cloneName, ctx.templateName);
        const cloneUrl = withDatabaseName(baseCtx.appBaseUrl, cloneName);
        const client = postgres(cloneUrl, { max: 1 });
        const db = drizzle(client, { schema });

        const email = `u-${nanoid()}@example.com`;
        const loginHash = rand32();
        const reg = await buildRegisterBody(email, loginHash);
        const { userId } = await performUserRegister({ db, env, body: reg });

        const access = await signAccessToken({
          secret: env.ACCESS_SECRET,
          userId,
          sessionId: nanoid(),
        });

        // Create an extra page in the personal group
        const extraPage = await performCreatePage({
          db,
          env,
          accessCookie: access,
          groupId: reg.groupId,
          body: {
            parentPageId: reg.pageId,
            pageId: nanoid(),
            pageEncryptedSymmetricKeyring: rand32(),
            pageEncryptedRelativeTitle: rand32(),
            pageEncryptedAbsoluteTitle: rand32(),
          },
        });

        // Soft-delete then purge the extra page (mark for immediate cleanup)
        await performPageSoftDelete({
          db,
          env,
          accessCookie: access,
          pageId: extraPage.pageId,
        });
        await performPagePurge({
          db,
          env,
          accessCookie: access,
          pageId: extraPage.pageId,
        });

        // Create another group and page, then purge it (sets deletion date to past)
        const group2Id = nanoid();
        const page2Id = nanoid();
        const reg2 = await buildRegisterBody(`v-${nanoid()}@example.com`, rand32());
        reg2.groupId = group2Id;
        reg2.pageId = page2Id;
        const { userId: user2 } = await performUserRegister({ db, env, body: reg2 });
        const access2 = await signAccessToken({
          secret: env.ACCESS_SECRET,
          userId: user2,
          sessionId: nanoid(),
        });

        // Purge the group immediately (sets permanentDeletionDate to yesterday)
        await performGroupPurge({
          db,
          env,
          accessCookie: access2,
          groupId: group2Id,
        });

        // Verify the purged page still exists before cleanup
        const pageBefore = await db
          .select({ id: pages.id })
          .from(pages)
          .where(eq(pages.id, extraPage.pageId));
        expect(pageBefore.length).toBe(1);

        // Verify the purged group still exists before cleanup
        const groupBefore = await db
          .select({ id: groups.id })
          .from(groups)
          .where(eq(groups.id, group2Id));
        expect(groupBefore.length).toBe(1);

        // Run scheduled cleanup
        const result = await performScheduledCleanup({ db });
        expect(result.deletedPages).toBe(1);
        expect(result.deletedGroups).toBe(1);

        // Verify the soft-deleted page is gone
        const pageAfter = await db
          .select({ id: pages.id })
          .from(pages)
          .where(eq(pages.id, extraPage.pageId));
        expect(pageAfter.length).toBe(0);

        // Verify the purged group is gone
        const groupAfter = await db
          .select({ id: groups.id })
          .from(groups)
          .where(eq(groups.id, group2Id));
        expect(groupAfter.length).toBe(0);

        // Verify the active page and group still exist
        const activePage = await db
          .select({ id: pages.id })
          .from(pages)
          .where(eq(pages.id, reg.pageId));
        expect(activePage.length).toBe(1);

        const activeGroup = await db
          .select({ id: groups.id })
          .from(groups)
          .where(eq(groups.id, reg.groupId));
        expect(activeGroup.length).toBe(1);
      } finally {
        await admin.end({ timeout: 5 });
      }
    });
  },
);
