CREATE TABLE "page_spatial_updates" (
	"page_id" char(21) NOT NULL,
	"index" bigint NOT NULL,
	"encrypted_data" "bytea" NOT NULL,
	CONSTRAINT "page_spatial_updates_pkey" PRIMARY KEY("page_id","index")
);
--> statement-breakpoint
ALTER TABLE "page_spatial_updates" ADD CONSTRAINT "page_spatial_updates_page_id_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."pages"("id") ON DELETE cascade ON UPDATE no action;