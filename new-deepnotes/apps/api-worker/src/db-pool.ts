import { createDb, type DeepnotesDb } from "@deepnotes/db/client";

let cachedConn: string | undefined;
let cachedDb: DeepnotesDb | undefined;

/** One Drizzle instance per isolate; Hyperdrive URL is stable for the binding. */
export function getDbForConnectionString(connectionString: string): DeepnotesDb {
  if (cachedDb != null && cachedConn === connectionString) {
    return cachedDb;
  }
  cachedConn = connectionString;
  cachedDb = createDb(connectionString);
  return cachedDb;
}
