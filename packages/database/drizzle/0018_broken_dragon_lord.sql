CREATE TYPE "public"."payment_method" AS ENUM('CARD', 'PIX', 'DEBIT', 'BOLETO', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."recurring_cycle" AS ENUM('MONTHLY', 'YEARLY');--> statement-breakpoint
ALTER TYPE "public"."proposal_kind" ADD VALUE 'RECURRING_EXPENSE';--> statement-breakpoint
CREATE TABLE "recurring_expense" (
	"amount_cents" bigint NOT NULL,
	"category" text,
	"credit_card_id" uuid,
	"cycle" "recurring_cycle" DEFAULT 'MONTHLY' NOT NULL,
	"description" text NOT NULL,
	"due_day" integer NOT NULL,
	"due_month" integer,
	"ends_on" date,
	"holder_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"payment_method" "payment_method",
	"starts_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recurring_expense" ADD CONSTRAINT "recurring_expense_credit_card_id_credit_card_id_fk" FOREIGN KEY ("credit_card_id") REFERENCES "public"."credit_card"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_expense" ADD CONSTRAINT "recurring_expense_holder_id_holder_id_fk" FOREIGN KEY ("holder_id") REFERENCES "public"."holder"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_expense" ADD CONSTRAINT "recurring_expense_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recurring_expense_holder_idx" ON "recurring_expense" USING btree ("holder_id");