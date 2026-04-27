import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { defaultAdminUrlFromAppUrl, withDatabaseName } from "./db-url.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const MIGRATIONS_FOLDER = join(__dirname, "../../migrations");

/** Only generated names — never pass request input here. */
function assertSafeDbIdentifier(name: string): void {
  if (!/^[a-z][a-z0-9_]{0,62}$/i.test(name)) {
    throw new Error(`Refusing unsafe database identifier: ${name}`);
  }
}

export async function terminateConnections(
  admin: ReturnType<typeof postgres>,
  dbName: string,
): Promise<void> {
  assertSafeDbIdentifier(dbName);
  await admin.unsafe(
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${dbName.replace(/'/g, "''")}' AND pid <> pg_backend_pid()`,
  );
}

export async function dropDatabaseIfExists(
  admin: ReturnType<typeof postgres>,
  dbName: string,
): Promise<void> {
  assertSafeDbIdentifier(dbName);
  await terminateConnections(admin, dbName);
  await admin.unsafe(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)`);
}

export async function createDatabaseFromTemplate(
  admin: ReturnType<typeof postgres>,
  newDbName: string,
  templateName: string,
): Promise<void> {
  assertSafeDbIdentifier(newDbName);
  assertSafeDbIdentifier(templateName);
  await admin.unsafe(`CREATE DATABASE ${newDbName} TEMPLATE ${templateName}`);
}

export async function migrateFreshDatabase(connectionString: string): Promise<void> {
  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client);
  try {
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  } finally {
    await client.end({ timeout: 5 });
  }
}

export type TemplateDbContext = {
  adminUrl: string;
  appBaseUrl: string;
  templateName: string;
};

export function resolveTemplateContext(): TemplateDbContext | null {
  const appBaseUrl = process.env.DATABASE_URL;
  if (!appBaseUrl) return null;
  const adminUrl =
    process.env.DATABASE_ADMIN_URL ?? defaultAdminUrlFromAppUrl(appBaseUrl);
  const templateName = process.env.TEST_DB_TEMPLATE_NAME ?? "dn_test_tpl_deepnotes";
  return { adminUrl, appBaseUrl, templateName };
}

/**
 * Build a migrated template database (RESTART_PLAN §5.7). Caller must drop when done.
 */
export async function ensureTemplateDatabase(ctx: TemplateDbContext): Promise<void> {
  assertSafeDbIdentifier(ctx.templateName);
  const admin = postgres(ctx.adminUrl, { max: 1 });
  try {
    await dropDatabaseIfExists(admin, ctx.templateName);
    await admin.unsafe(`CREATE DATABASE ${ctx.templateName}`);
  } finally {
    await admin.end({ timeout: 5 });
  }
  const templateUrl = withDatabaseName(ctx.appBaseUrl, ctx.templateName);
  await migrateFreshDatabase(templateUrl);
}
