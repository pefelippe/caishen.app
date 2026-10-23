CREATE TYPE "public"."proposal_action" AS ENUM('CREATE', 'UPDATE');--> statement-breakpoint
ALTER TABLE "proposal" ADD COLUMN "action" "proposal_action" DEFAULT 'CREATE' NOT NULL;--> statement-breakpoint
ALTER TABLE "proposal" ADD COLUMN "previous" jsonb;--> statement-breakpoint
ALTER TABLE "proposal" ADD COLUMN "target_id" uuid;