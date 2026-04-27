/**
 * Parse `postgresql://user:pass@host:port/dbname` and swap the database segment.
 */
export function withDatabaseName(connectionString: string, databaseName: string): string {
  const u = new URL(connectionString);
  u.pathname = `/${databaseName}`;
  return u.toString();
}

/** Admin catalog URL (role must be able to CREATE DATABASE). */
export function defaultAdminUrlFromAppUrl(appUrl: string): string {
  return withDatabaseName(appUrl, "postgres");
}
