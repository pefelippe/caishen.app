CREATE TABLE "booking" (
	"booking_type_id" uuid NOT NULL,
	"cancel_token" text NOT NULL,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"event_id" uuid,
	"guest_email" text NOT NULL,
	"guest_name" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"organization_id" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	CONSTRAINT "booking_cancel_token_unique" UNIQUE("cancel_token")
);
--> statement-breakpoint
CREATE TABLE "booking_type" (
	"active" boolean DEFAULT true NOT NULL,
	"days_ahead" integer DEFAULT 30 NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"duration_minutes" integer NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"min_notice_minutes" integer DEFAULT 240 NOT NULL,
	"organization_id" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"user_id" text NOT NULL,
	"windows" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "booking_type_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_booking_type_id_booking_type_id_fk" FOREIGN KEY ("booking_type_id") REFERENCES "public"."booking_type"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_event_id_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."event"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking" ADD CONSTRAINT "booking_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_type" ADD CONSTRAINT "booking_type_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_type" ADD CONSTRAINT "booking_type_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "booking_type_starts_idx" ON "booking" USING btree ("booking_type_id","starts_at");