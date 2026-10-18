CREATE TYPE "public"."routine_cadence" AS ENUM('WEEKLY', 'MONTHLY');--> statement-breakpoint
CREATE TABLE "routine" (
	"bot_id" uuid NOT NULL,
	"cadence" "routine_cadence" NOT NULL,
	"created_by_id" text,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"instructions" text NOT NULL,
	"next_run_at" timestamp with time zone NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "routine_id" uuid;--> statement-breakpoint
ALTER TABLE "routine" ADD CONSTRAINT "routine_bot_id_bot_id_fk" FOREIGN KEY ("bot_id") REFERENCES "public"."bot"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine" ADD CONSTRAINT "routine_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine" ADD CONSTRAINT "routine_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "routine_next_run_idx" ON "routine" USING btree ("next_run_at");--> statement-breakpoint
ALTER TABLE "job" ADD CONSTRAINT "job_routine_id_routine_id_fk" FOREIGN KEY ("routine_id") REFERENCES "public"."routine"("id") ON DELETE set null ON UPDATE no action;