import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  char,
  customType,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/** Binary columns in the legacy DB (`postgres-init.sql`). */
export const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

export const users = pgTable(
  "users",
  {
    id: char("id", { length: 21 }).primaryKey().default(sql`public.nanoid()`),
    creationDate: timestamp("creation_date", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    startingPageId: char("starting_page_id", { length: 21 }).notNull(),
    recentPageIds: char("recent_page_ids", { length: 21 })
      .array()
      .notNull()
      .default(sql`'{}'::character(21)[]`),
    personalGroupId: char("personal_group_id", { length: 21 }).notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    publicKeyring: bytea("public_keyring").notNull(),
    encryptedPrivateKeyring: bytea("encrypted_private_keyring").notNull(),
    encryptedSymmetricKeyring: bytea("encrypted_symmetric_keyring").notNull(),
    encryptedDefaultArrow: bytea("encrypted_default_arrow").notNull(),
    encryptedDefaultNote: bytea("encrypted_default_note").notNull(),
    twoFactorAuthEnabled: boolean("two_factor_auth_enabled")
      .notNull()
      .default(false),
    emailVerificationExpirationDate: timestamp(
      "email_verification_expiration_date",
      { withTimezone: true, mode: "string" },
    ),
    emailVerificationCode: text("email_verification_code"),
    recentGroupIds: char("recent_group_ids", { length: 21 })
      .array()
      .notNull()
      .default(sql`'{}'::character(21)[]`),
    lastNotificationRead: bigint("last_notification_read", {
      mode: "number",
    }),
    customerId: text("customer_id"),
    plan: text("plan").notNull().default("basic"),
    subscriptionId: text("subscription_id"),
    encryptedName: bytea("encrypted_name"),
    numFreePages: integer("num_free_pages").notNull().default(0),
    encryptedAuthenticatorSecret: bytea("encrypted_authenticator_secret"),
    encryptedEmail: bytea("encrypted_email").notNull(),
    encryptedNewEmail: bytea("encrypted_new_email"),
    encryptedRecoveryCodes: bytea("encrypted_recovery_codes"),
    demo: boolean("demo"),
    emailHash: bytea("email_hash").notNull(),
    encryptedRehashedLoginHash: bytea("encrypted_rehashed_login_hash").notNull(),
    isNew: boolean("new").notNull().default(true),
  },
  (t) => [
    uniqueIndex("users_encrypted_email_key").on(t.encryptedEmail),
    uniqueIndex("users_email_hash_idx").on(t.emailHash),
    index("users_creation_date_idx").on(sql`${t.creationDate} DESC`),
    index("users_customer_id_idx").on(t.customerId),
  ],
);

export const groups = pgTable("groups", {
  id: char("id", { length: 21 }).primaryKey().default(sql`public.nanoid()`),
  mainPageId: char("main_page_id", { length: 21 }).notNull(),
  creationDate: timestamp("creation_date", {
    withTimezone: true,
    mode: "string",
  })
    .notNull()
    .defaultNow(),
  userId: char("user_id", { length: 21 }).references(() => users.id, {
    onDelete: "cascade",
  }),
  encryptedName: bytea("encrypted_name").notNull(),
  publicKeyring: bytea("public_keyring").notNull(),
  encryptedPrivateKeyring: bytea("encrypted_private_keyring").notNull(),
  accessKeyring: bytea("access_keyring"),
  encryptedContentKeyring: bytea("encrypted_content_keyring").notNull(),
  permanentDeletionDate: timestamp("permanent_deletion_date", {
    withTimezone: true,
    mode: "string",
  }),
  encryptedRehashedPasswordHash: bytea("encrypted_rehashed_password_hash"),
  areJoinRequestsAllowed: boolean("are_join_requests_allowed")
    .notNull()
    .default(true),
});

export const pages = pgTable("pages", {
  id: char("id", { length: 21 }).primaryKey().default(sql`public.nanoid()`),
  creationDate: timestamp("creation_date", {
    withTimezone: true,
    mode: "string",
  })
    .notNull()
    .defaultNow(),
  lastActivityDate: timestamp("last_activity_date", {
    withTimezone: true,
    mode: "string",
  })
    .notNull()
    .defaultNow(),
  groupId: char("group_id", { length: 21 })
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  encryptedRelativeTitle: bytea("encrypted_relative_title").notNull(),
  encryptedSymmetricKeyring: bytea("encrypted_symmetric_keyring").notNull(),
  free: boolean("free"),
  nextSnapshotUpdateIndex: bigint("next_snapshot_update_index", {
    mode: "number",
  })
    .notNull()
    .default(100),
  nextSnapshotDate: timestamp("next_snapshot_date", {
    withTimezone: true,
    mode: "string",
  })
    .notNull()
    .default(sql`(now() + '00:15:00'::interval)`),
  /** Legacy column; key rotation is dropped in the new product (RESTART_PLAN). Kept for DB compatibility. */
  nextKeyRotationDate: timestamp("next_key_rotation_date", {
    withTimezone: true,
    mode: "string",
  })
    .notNull()
    .default(sql`(now() + '7 days'::interval)`),
  permanentDeletionDate: timestamp("permanent_deletion_date", {
    withTimezone: true,
    mode: "string",
  }),
  encryptedAbsoluteTitle: bytea("encrypted_absolute_title").notNull(),
});

export const devices = pgTable("devices", {
  id: char("id", { length: 21 }).primaryKey().default(sql`public.nanoid()`),
  userId: char("user_id", { length: 21 })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  trusted: boolean("trusted").notNull().default(false),
  hash: bytea("hash").notNull(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: char("id", { length: 21 }).primaryKey().default(sql`public.nanoid()`),
    userId: char("user_id", { length: 21 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    creationDate: timestamp("creation_date", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    invalidated: boolean("invalidated").notNull().default(false),
    deviceId: char("device_id", { length: 21 })
      .notNull()
      .references(() => devices.id, { onDelete: "cascade" }),
    lastRefreshDate: timestamp("last_refresh_date", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    expirationDate: timestamp("expiration_date", {
      withTimezone: true,
      mode: "string",
    }).notNull(),
    encryptionKey: bytea("encryption_key").notNull(),
    refreshCode: char("refresh_code", { length: 21 }).notNull(),
  },
  (t) => [index("sessions_refresh_code_idx").on(t.refreshCode)],
);

export const notifications = pgTable("notifications", {
  type: text("type").notNull(),
  datetime: timestamp("datetime", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow(),
  encryptedContent: bytea("encrypted_content").notNull(),
  id: bigint("id", { mode: "number" })
    .primaryKey()
    .generatedAlwaysAsIdentity({ name: "notifications_id_seq" }),
});

export const groupMembers = pgTable(
  "group_members",
  {
    userId: char("user_id", { length: 21 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    groupId: char("group_id", { length: 21 })
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    encryptedAccessKeyring: bytea("encrypted_access_keyring"),
    role: text("role").notNull(),
    encryptedInternalKeyring: bytea("encrypted_internal_keyring").notNull(),
    lastActivityDate: timestamp("last_activity_date", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    encryptedName: bytea("encrypted_name"),
    encryptedNameForUser: bytea("encrypted_name_for_user"),
  },
  (t) => [
    primaryKey({ columns: [t.groupId, t.userId], name: "groups_users_pkey" }),
    index("group_members_user_id_idx").on(
      t.userId,
      sql`${t.lastActivityDate} DESC`,
    ),
  ],
);

export const groupJoinInvitations = pgTable(
  "group_join_invitations",
  {
    groupId: char("group_id", { length: 21 })
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: char("user_id", { length: 21 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    inviterId: char("inviter_id", { length: 21 }).notNull(),
    role: text("role").notNull(),
    encryptedAccessKeyring: bytea("encrypted_access_keyring"),
    encryptedInternalKeyring: bytea("encrypted_internal_keyring").notNull(),
    encryptedName: bytea("encrypted_name").notNull(),
    creationDate: timestamp("creation_date", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    encryptedNameForUser: bytea("encrypted_name_for_user"),
  },
  (t) => [
    primaryKey({
      columns: [t.groupId, t.userId],
      name: "group_join_invitations_pkey",
    }),
    index("group_join_invitations_user_id_idx").on(
      t.userId,
      sql`${t.creationDate} DESC`,
    ),
  ],
);

export const groupJoinRequests = pgTable(
  "group_join_requests",
  {
    groupId: char("group_id", { length: 21 })
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: char("user_id", { length: 21 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rejected: boolean("rejected").notNull().default(false),
    encryptedName: bytea("encrypted_name").notNull(),
    creationDate: timestamp("creation_date", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    encryptedNameForUser: bytea("encrypted_name_for_user").notNull(),
  },
  (t) => [
    primaryKey({
      columns: [t.groupId, t.userId],
      name: "group_join_requests_pkey",
    }),
    index("group_join_requests_user_id_idx").on(
      t.userId,
      sql`${t.creationDate} DESC`,
    ),
  ],
);

export const pageLinks = pgTable(
  "page_links",
  {
    targetPageId: char("target_page_id", { length: 21 })
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    sourcePageId: char("source_page_id", { length: 21 })
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    lastActivityDate: timestamp("last_activity_date", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({
      columns: [t.sourcePageId, t.targetPageId],
      name: "page_links_pkey",
    }),
    index("page_links_target_page_id_idx").on(
      t.targetPageId,
      sql`${t.lastActivityDate} DESC`,
    ),
  ],
);

export const pageSnapshots = pgTable(
  "page_snapshots",
  {
    pageId: char("page_id", { length: 21 })
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    creationDate: timestamp("creation_date", {
      withTimezone: true,
      mode: "string",
    })
      .notNull()
      .defaultNow(),
    encryptedData: bytea("encrypted_data").notNull(),
    authorId: char("author_id", { length: 21 }),
    type: text("type").notNull(),
    encryptedSymmetricKey: bytea("encrypted_symmetric_key"),
    id: char("id", { length: 21 }).primaryKey().default(sql`public.nanoid()`),
  },
  () => [],
);

export const pageUpdates = pgTable(
  "page_updates",
  {
    pageId: char("page_id", { length: 21 })
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    index: bigint("index", { mode: "number" }).notNull(),
    encryptedData: bytea("encrypted_data").notNull(),
  },
  (t) => [
    primaryKey({
      columns: [t.pageId, t.index],
      name: "pages_updates_pkey",
    }),
  ],
);

export const usersNotifications = pgTable(
  "users_notifications",
  {
    userId: char("user_id", { length: 21 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    encryptedSymmetricKey: bytea("encrypted_symmetric_key").notNull(),
    notificationId: bigint("notification_id", { mode: "number" })
      .notNull()
      .references(() => notifications.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({
      columns: [t.userId, t.notificationId],
      name: "users_notifications_pkey",
    }),
  ],
);

export const usersPages = pgTable(
  "users_pages",
  {
    userId: char("user_id", { length: 21 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    pageId: char("page_id", { length: 21 }).notNull(),
    lastParentId: char("last_parent_id", { length: 21 }),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.pageId], name: "users_pages_pkey" }),
    index("users_pages_page_id_idx").on(t.pageId),
  ],
);

export const usersRelations = relations(users, ({ many, one }) => ({
  devices: many(devices),
  sessions: many(sessions),
  personalGroup: one(groups, {
    fields: [users.personalGroupId],
    references: [groups.id],
  }),
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
  owner: one(users, { fields: [groups.userId], references: [users.id] }),
  pages: many(pages),
  members: many(groupMembers),
}));

export const pagesRelations = relations(pages, ({ one }) => ({
  group: one(groups, { fields: [pages.groupId], references: [groups.id] }),
}));
