import { randomBytes } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import * as schema from "./schema.js";
import { sessions, users } from "./schema.js";
import { withDatabaseName } from "./test/db-url.js";
import {
  createDatabaseFromTemplate,
  dropDatabaseIfExists,
  ensureTemplateDatabase,
  resolveTemplateContext,
} from "./test/template-db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: join(__dirname, "../../../.env") });

const ctx = resolveTemplateContext();

// Vitest still executes the describe callback to collect tests when using
// describe.skipIf, so we must not dereference ctx at suite top level when null.
if (ctx == null) {
  describe.skip("postgres template database (§5.7) — skipped without DATABASE_URL", () => {
    it("requires DATABASE_URL (and optional DATABASE_ADMIN_URL / TEST_DB_TEMPLATE_NAME)", () => {});
  });
} else {
  const { templateName, adminUrl, appBaseUrl } = ctx;

  describe("postgres template database (§5.7)", () => {
    beforeAll(async () => {
      await ensureTemplateDatabase(ctx);
    });

    afterAll(async () => {
      const admin = postgres(adminUrl, { max: 1 });
      try {
        await dropDatabaseIfExists(admin, templateName);
      } finally {
        await admin.end({ timeout: 5 });
      }
    });

    it("clones template and sees isolated empty users", async () => {
      const cloneName = `dn_test_${randomBytes(8).toString("hex")}`;
      const admin = postgres(adminUrl, { max: 1 });
      try {
        await createDatabaseFromTemplate(admin, cloneName, templateName);
      } finally {
        await admin.end({ timeout: 5 });
      }

      const cloneUrl = withDatabaseName(appBaseUrl, cloneName);
      const client = postgres(cloneUrl, { max: 1 });
      const db = drizzle(client, { schema });
      try {
        const countRows = await db
          .select({ n: sql<number>`count(*)::int` })
          .from(users);
        expect(countRows[0]?.n).toBe(0);

        const uid = "012345678901234567890";
        await db.insert(users).values({
          id: uid,
          startingPageId: uid,
          personalGroupId: uid,
          publicKeyring: Buffer.alloc(1),
          encryptedPrivateKeyring: Buffer.alloc(1),
          encryptedSymmetricKeyring: Buffer.alloc(1),
          encryptedDefaultArrow: Buffer.alloc(1),
          encryptedDefaultNote: Buffer.alloc(1),
          encryptedEmail: Buffer.alloc(1),
          emailHash: Buffer.alloc(1),
          encryptedRehashedLoginHash: Buffer.alloc(1),
        });

        const row = await db.select().from(users).where(eq(users.id, uid));
        expect(row).toHaveLength(1);
      } finally {
        await client.end({ timeout: 5 });
        const admin2 = postgres(adminUrl, { max: 1 });
        try {
          await dropDatabaseIfExists(admin2, cloneName);
        } finally {
          await admin2.end({ timeout: 5 });
        }
      }
    });

  it("rejects orphan session row (FK to users and devices)", async () => {
    const cloneName = `dn_test_${randomBytes(8).toString("hex")}`;
    const admin = postgres(adminUrl, { max: 1 });
    try {
      await createDatabaseFromTemplate(admin, cloneName, templateName);
    } finally {
      await admin.end({ timeout: 5 });
    }

    const cloneUrl = withDatabaseName(appBaseUrl, cloneName);
    const client = postgres(cloneUrl, { max: 1 });
    const db = drizzle(client, { schema });
    try {
      const exp = new Date(Date.now() + 86_400_000).toISOString();
      await expect(
        db.insert(sessions).values({
          id: "sess01234567890123456",
          userId: "user01234567890123456",
          deviceId: "devc01234567890123456",
          encryptionKey: randomBytes(32),
          refreshCode: "refr01234567890123456",
          expirationDate: exp,
          invalidated: false,
        }),
      ).rejects.toThrow();
    } finally {
      await client.end({ timeout: 5 });
      const admin2 = postgres(adminUrl, { max: 1 });
      try {
        await dropDatabaseIfExists(admin2, cloneName);
      } finally {
        await admin2.end({ timeout: 5 });
      }
    }
  });
});
}
