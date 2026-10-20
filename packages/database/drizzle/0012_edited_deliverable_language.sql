ALTER TABLE "user" ADD COLUMN "language" text DEFAULT 'pt' NOT NULL;--> statement-breakpoint
ALTER TABLE "job" ADD COLUMN "edited_deliverable" text;