ALTER TABLE "conversation" ADD COLUMN "replying_since" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "stop_requested_at" timestamp with time zone;