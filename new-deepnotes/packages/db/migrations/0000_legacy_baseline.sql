CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "public";
--> statement-breakpoint
CREATE FUNCTION "public"."nanoid"("size" integer DEFAULT 21, "alphabet" text DEFAULT '_-0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'::text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
    idBuilder     text := '';
    i             int  := 0;
    bytes         bytea;
    alphabetIndex int;
    mask          int;
    step          int;
BEGIN
    mask := (2 << cast(floor(log(length(alphabet) - 1) / log(2)) as int)) - 1;
    step := cast(ceil(1.6 * mask * size / length(alphabet)) AS int);

    while true
        loop
            bytes := gen_random_bytes(size);
            while i < size
                loop
                    alphabetIndex := (get_byte(bytes, i) & mask) + 1;
                    if alphabetIndex <= length(alphabet) then
                        idBuilder := idBuilder || substr(alphabet, alphabetIndex, 1);
                        if length(idBuilder) = size then
                            return idBuilder;
                        end if;
                    end if;
                    i = i + 1;
                end loop;

            i := 0;
        end loop;
END
$$;
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" char(21) PRIMARY KEY DEFAULT public.nanoid() NOT NULL,
	"user_id" char(21) NOT NULL,
	"trusted" boolean DEFAULT false NOT NULL,
	"hash" bytea NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_join_invitations" (
	"group_id" char(21) NOT NULL,
	"user_id" char(21) NOT NULL,
	"inviter_id" char(21) NOT NULL,
	"role" text NOT NULL,
	"encrypted_access_keyring" bytea,
	"encrypted_internal_keyring" bytea NOT NULL,
	"encrypted_name" bytea NOT NULL,
	"creation_date" timestamp with time zone DEFAULT now() NOT NULL,
	"encrypted_name_for_user" bytea,
	CONSTRAINT "group_join_invitations_pkey" PRIMARY KEY("group_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "group_join_requests" (
	"group_id" char(21) NOT NULL,
	"user_id" char(21) NOT NULL,
	"rejected" boolean DEFAULT false NOT NULL,
	"encrypted_name" bytea NOT NULL,
	"creation_date" timestamp with time zone DEFAULT now() NOT NULL,
	"encrypted_name_for_user" bytea NOT NULL,
	CONSTRAINT "group_join_requests_pkey" PRIMARY KEY("group_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "group_members" (
	"user_id" char(21) NOT NULL,
	"group_id" char(21) NOT NULL,
	"encrypted_access_keyring" bytea,
	"role" text NOT NULL,
	"encrypted_internal_keyring" bytea NOT NULL,
	"last_activity_date" timestamp with time zone DEFAULT now() NOT NULL,
	"encrypted_name" bytea,
	"encrypted_name_for_user" bytea,
	CONSTRAINT "groups_users_pkey" PRIMARY KEY("group_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" char(21) PRIMARY KEY DEFAULT public.nanoid() NOT NULL,
	"main_page_id" char(21) NOT NULL,
	"creation_date" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" char(21),
	"encrypted_name" bytea NOT NULL,
	"public_keyring" bytea NOT NULL,
	"encrypted_private_keyring" bytea NOT NULL,
	"access_keyring" bytea,
	"encrypted_content_keyring" bytea NOT NULL,
	"permanent_deletion_date" timestamp with time zone,
	"encrypted_rehashed_password_hash" bytea,
	"are_join_requests_allowed" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"type" text NOT NULL,
	"datetime" timestamp with time zone DEFAULT now() NOT NULL,
	"encrypted_content" bytea NOT NULL,
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "notifications_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1)
);
--> statement-breakpoint
CREATE TABLE "page_links" (
	"target_page_id" char(21) NOT NULL,
	"source_page_id" char(21) NOT NULL,
	"last_activity_date" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "page_links_pkey" PRIMARY KEY("source_page_id","target_page_id")
);
--> statement-breakpoint
CREATE TABLE "page_snapshots" (
	"page_id" char(21) NOT NULL,
	"creation_date" timestamp with time zone DEFAULT now() NOT NULL,
	"encrypted_data" bytea NOT NULL,
	"author_id" char(21),
	"type" text NOT NULL,
	"encrypted_symmetric_key" bytea,
	"id" char(21) PRIMARY KEY DEFAULT public.nanoid() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page_updates" (
	"page_id" char(21) NOT NULL,
	"index" bigint NOT NULL,
	"encrypted_data" bytea NOT NULL,
	CONSTRAINT "pages_updates_pkey" PRIMARY KEY("page_id","index")
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" char(21) PRIMARY KEY DEFAULT public.nanoid() NOT NULL,
	"creation_date" timestamp with time zone DEFAULT now() NOT NULL,
	"last_activity_date" timestamp with time zone DEFAULT now() NOT NULL,
	"group_id" char(21) NOT NULL,
	"encrypted_relative_title" bytea NOT NULL,
	"encrypted_symmetric_keyring" bytea NOT NULL,
	"free" boolean,
	"next_snapshot_update_index" bigint DEFAULT 100 NOT NULL,
	"next_snapshot_date" timestamp with time zone DEFAULT (now() + '00:15:00'::interval) NOT NULL,
	"next_key_rotation_date" timestamp with time zone DEFAULT (now() + '7 days'::interval) NOT NULL,
	"permanent_deletion_date" timestamp with time zone,
	"encrypted_absolute_title" bytea NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" char(21) PRIMARY KEY DEFAULT public.nanoid() NOT NULL,
	"user_id" char(21) NOT NULL,
	"creation_date" timestamp with time zone DEFAULT now() NOT NULL,
	"invalidated" boolean DEFAULT false NOT NULL,
	"device_id" char(21) NOT NULL,
	"last_refresh_date" timestamp with time zone DEFAULT now() NOT NULL,
	"expiration_date" timestamp with time zone NOT NULL,
	"encryption_key" bytea NOT NULL,
	"refresh_code" char(21) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" char(21) PRIMARY KEY DEFAULT public.nanoid() NOT NULL,
	"creation_date" timestamp with time zone DEFAULT now() NOT NULL,
	"starting_page_id" char(21) NOT NULL,
	"recent_page_ids" char(21)[] DEFAULT '{}'::character(21)[] NOT NULL,
	"personal_group_id" char(21) NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"public_keyring" bytea NOT NULL,
	"encrypted_private_keyring" bytea NOT NULL,
	"encrypted_symmetric_keyring" bytea NOT NULL,
	"encrypted_default_arrow" bytea NOT NULL,
	"encrypted_default_note" bytea NOT NULL,
	"two_factor_auth_enabled" boolean DEFAULT false NOT NULL,
	"email_verification_expiration_date" timestamp with time zone,
	"email_verification_code" text,
	"recent_group_ids" char(21)[] DEFAULT '{}'::character(21)[] NOT NULL,
	"last_notification_read" bigint,
	"customer_id" text,
	"plan" text DEFAULT 'basic' NOT NULL,
	"subscription_id" text,
	"encrypted_name" bytea,
	"num_free_pages" integer DEFAULT 0 NOT NULL,
	"encrypted_authenticator_secret" bytea,
	"encrypted_email" bytea NOT NULL,
	"encrypted_new_email" bytea,
	"encrypted_recovery_codes" bytea,
	"demo" boolean,
	"email_hash" bytea NOT NULL,
	"encrypted_rehashed_login_hash" bytea NOT NULL,
	"new" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users_notifications" (
	"user_id" char(21) NOT NULL,
	"encrypted_symmetric_key" bytea NOT NULL,
	"notification_id" bigint NOT NULL,
	CONSTRAINT "users_notifications_pkey" PRIMARY KEY("user_id","notification_id")
);
--> statement-breakpoint
CREATE TABLE "users_pages" (
	"user_id" char(21) NOT NULL,
	"page_id" char(21) NOT NULL,
	"last_parent_id" char(21),
	CONSTRAINT "users_pages_pkey" PRIMARY KEY("user_id","page_id")
);
--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_join_invitations" ADD CONSTRAINT "group_join_invitations_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_join_invitations" ADD CONSTRAINT "group_join_invitations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_join_requests" ADD CONSTRAINT "group_join_requests_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_join_requests" ADD CONSTRAINT "group_join_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "groups" ADD CONSTRAINT "groups_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_links" ADD CONSTRAINT "page_links_target_page_id_pages_id_fk" FOREIGN KEY ("target_page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_links" ADD CONSTRAINT "page_links_source_page_id_pages_id_fk" FOREIGN KEY ("source_page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_snapshots" ADD CONSTRAINT "page_snapshots_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_updates" ADD CONSTRAINT "page_updates_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_notifications" ADD CONSTRAINT "users_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_notifications" ADD CONSTRAINT "users_notifications_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_pages" ADD CONSTRAINT "users_pages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "group_join_invitations_user_id_idx" ON "group_join_invitations" USING btree ("user_id","creation_date" DESC);--> statement-breakpoint
CREATE INDEX "group_join_requests_user_id_idx" ON "group_join_requests" USING btree ("user_id","creation_date" DESC);--> statement-breakpoint
CREATE INDEX "group_members_user_id_idx" ON "group_members" USING btree ("user_id","last_activity_date" DESC);--> statement-breakpoint
CREATE INDEX "page_links_target_page_id_idx" ON "page_links" USING btree ("target_page_id","last_activity_date" DESC);--> statement-breakpoint
CREATE INDEX "sessions_refresh_code_idx" ON "sessions" USING btree ("refresh_code");--> statement-breakpoint
CREATE UNIQUE INDEX "users_encrypted_email_key" ON "users" USING btree ("encrypted_email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_hash_idx" ON "users" USING btree ("email_hash");--> statement-breakpoint
CREATE INDEX "users_creation_date_idx" ON "users" USING btree ("creation_date" DESC);--> statement-breakpoint
CREATE INDEX "users_customer_id_idx" ON "users" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "users_pages_page_id_idx" ON "users_pages" USING btree ("page_id");
