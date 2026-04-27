import { randomBytes } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import * as schema from "./schema.js";
import { users } from "./schema.js";
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

describe.skipIf(ctx == null)("postgres template database (§5.7)", () => {
  const templateName = ctx!.templateName;
  const adminUrl = ctx!.adminUrl;
  const appBaseUrl = ctx!.appBaseUrl;

  beforeAll(async () => {
    await ensureTemplateDatabase(ctx!);
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
});
