ALTER TABLE "expense" ADD COLUMN "external_id" text;--> statement-breakpoint
ALTER TABLE "expense" ADD CONSTRAINT "expense_holder_external_unique" UNIQUE("holder_id","external_id");