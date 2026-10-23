CREATE TYPE "public"."proposal_kind" AS ENUM('CREDIT_OPERATION', 'INCOME_SOURCE', 'ONE_OFF_INCOME', 'EXPENSE');--> statement-breakpoint
CREATE TYPE "public"."proposal_status" AS ENUM('PENDING', 'CONFIRMED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "proposal" (
	"conversation_id" uuid NOT NULL,
	"decided_at" timestamp with time zone,
	"decided_by_id" text,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"input" jsonb NOT NULL,
	"kind" "proposal_kind" NOT NULL,
	"message_id" uuid,
	"organization_id" text NOT NULL,
	"record_id" uuid,
	"status" "proposal_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "proposal" ADD CONSTRAINT "proposal_conversation_id_conversation_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal" ADD CONSTRAINT "proposal_decided_by_id_user_id_fk" FOREIGN KEY ("decided_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal" ADD CONSTRAINT "proposal_message_id_message_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."message"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposal" ADD CONSTRAINT "proposal_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "proposal_conversation_idx" ON "proposal" USING btree ("conversation_id","created_at");