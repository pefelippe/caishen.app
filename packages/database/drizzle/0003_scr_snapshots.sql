CREATE TABLE "scr_entry" (
	"due_cents" bigint DEFAULT 0 NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institution" text NOT NULL,
	"limit_cents" bigint DEFAULT 0 NOT NULL,
	"loss_cents" bigint DEFAULT 0 NOT NULL,
	"modality" text NOT NULL,
	"overdue_cents" bigint DEFAULT 0 NOT NULL,
	"overdue_max_days" integer,
	"scr_snapshot_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scr_snapshot" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"holder_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"imported_by_id" text,
	"reference_month" text NOT NULL,
	"source_hash" text,
	CONSTRAINT "scr_snapshot_holder_month_unique" UNIQUE("holder_id","reference_month"),
	CONSTRAINT "scr_snapshot_holder_hash_unique" UNIQUE("holder_id","source_hash")
);
--> statement-breakpoint
ALTER TABLE "scr_entry" ADD CONSTRAINT "scr_entry_scr_snapshot_id_scr_snapshot_id_fk" FOREIGN KEY ("scr_snapshot_id") REFERENCES "public"."scr_snapshot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scr_snapshot" ADD CONSTRAINT "scr_snapshot_holder_id_holder_id_fk" FOREIGN KEY ("holder_id") REFERENCES "public"."holder"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scr_snapshot" ADD CONSTRAINT "scr_snapshot_imported_by_id_user_id_fk" FOREIGN KEY ("imported_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;