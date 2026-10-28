CREATE TABLE "integration_sync" (
	"error" text,
	"kind" text NOT NULL,
	"last_synced_at" timestamp with time zone,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "integration_sync_user_id_kind_pk" PRIMARY KEY("user_id","kind")
);
--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "task_list" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "integration_sync" ADD CONSTRAINT "integration_sync_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_sync" ADD CONSTRAINT "integration_sync_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "task_external_idx" ON "task" USING btree ("organization_id","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "task_list_external_idx" ON "task_list" USING btree ("organization_id","external_id");