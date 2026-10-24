CREATE TYPE "public"."bank_account_kind" AS ENUM('BANK', 'CREDIT');--> statement-breakpoint
CREATE TYPE "public"."bank_link_status" AS ENUM('ACTIVE', 'ERROR', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."bank_provider" AS ENUM('PLUGGY');--> statement-breakpoint
CREATE TABLE "bank_account" (
	"balance_cents" bigint,
	"bank_link_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "bank_account_kind" NOT NULL,
	"name" text NOT NULL,
	"number" text,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bank_account_link_external_unique" UNIQUE("bank_link_id","external_id")
);
--> statement-breakpoint
CREATE TABLE "bank_link" (
	"consent_expires_at" timestamp with time zone,
	"consent_id" uuid,
	"error" text,
	"external_id" text NOT NULL,
	"holder_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institution" text NOT NULL,
	"last_synced_at" timestamp with time zone,
	"organization_id" text NOT NULL,
	"provider" "bank_provider" NOT NULL,
	"status" "bank_link_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bank_link_provider_external_unique" UNIQUE("provider","external_id")
);
--> statement-breakpoint
ALTER TABLE "expense" ADD COLUMN "bank_link_id" uuid;--> statement-breakpoint
ALTER TABLE "bank_account" ADD CONSTRAINT "bank_account_bank_link_id_bank_link_id_fk" FOREIGN KEY ("bank_link_id") REFERENCES "public"."bank_link"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_account" ADD CONSTRAINT "bank_account_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_link" ADD CONSTRAINT "bank_link_consent_id_consent_id_fk" FOREIGN KEY ("consent_id") REFERENCES "public"."consent"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_link" ADD CONSTRAINT "bank_link_holder_id_holder_id_fk" FOREIGN KEY ("holder_id") REFERENCES "public"."holder"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_link" ADD CONSTRAINT "bank_link_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense" ADD CONSTRAINT "expense_bank_link_id_bank_link_id_fk" FOREIGN KEY ("bank_link_id") REFERENCES "public"."bank_link"("id") ON DELETE cascade ON UPDATE no action;