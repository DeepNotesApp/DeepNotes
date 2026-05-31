import { createDb, type DeepnotesDb } from "@deepnotes/db/client";

/** Create a new Drizzle instance per request to avoid Cloudflare Workers I/O isolation issues. */
export function getDbForConnectionString(connectionString: string): DeepnotesDb {
  return createDb(connectionString);
}
