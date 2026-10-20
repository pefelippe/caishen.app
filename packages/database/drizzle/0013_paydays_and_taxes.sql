CREATE TYPE "public"."tax_frequency" AS ENUM('MONTHLY', 'YEARLY');--> statement-breakpoint
CREATE TABLE "tax" (
	"amount_cents" bigint NOT NULL,
	"due_day" integer NOT NULL,
	"due_month" integer,
	"frequency" "tax_frequency" NOT NULL,
	"holder_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"installments" integer DEFAULT 1 NOT NULL,
	"name" text NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "income_source" ADD COLUMN "paydays" integer[] DEFAULT '{}'::integer[] NOT NULL;--> statement-breakpoint
ALTER TABLE "tax" ADD CONSTRAINT "tax_holder_id_holder_id_fk" FOREIGN KEY ("holder_id") REFERENCES "public"."holder"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax" ADD CONSTRAINT "tax_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tax_holder_idx" ON "tax" USING btree ("holder_id");