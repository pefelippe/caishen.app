CREATE TABLE "activity_day" (
	"day" date NOT NULL,
	"organization_id" text NOT NULL,
	"steps" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "activity_day_organization_id_day_pk" PRIMARY KEY("organization_id","day")
);
--> statement-breakpoint
CREATE TABLE "health_inbox" (
	"last_counts" jsonb,
	"last_received_at" timestamp with time zone,
	"organization_id" text NOT NULL,
	"token" text NOT NULL,
	"user_id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "health_inbox_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "measurement" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "sleep_log" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "workout_session" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "activity_day" ADD CONSTRAINT "activity_day_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_inbox" ADD CONSTRAINT "health_inbox_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "health_inbox" ADD CONSTRAINT "health_inbox_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "measurement_external_idx" ON "measurement" USING btree ("organization_id","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sleep_log_external_idx" ON "sleep_log" USING btree ("organization_id","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workout_session_external_idx" ON "workout_session" USING btree ("organization_id","external_id");