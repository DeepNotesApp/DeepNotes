import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Bootstrap table so the migration chain is non-empty.
 * Replace or extend when importing the legacy schema from postgres-init.sql (RESTART_PLAN §4.5).
 */
export const appMeta = pgTable("app_meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
});
