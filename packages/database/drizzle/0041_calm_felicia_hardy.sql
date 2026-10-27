ALTER TABLE "workout_plan" ADD COLUMN "for_name" text;--> statement-breakpoint
ALTER TABLE "workout_plan" ADD COLUMN "share_token" text;--> statement-breakpoint
ALTER TABLE "workout_plan" ADD CONSTRAINT "workout_plan_share_token_unique" UNIQUE("share_token");