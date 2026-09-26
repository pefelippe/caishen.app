CREATE TYPE "public"."risk_band" AS ENUM('HIGH', 'MEDIUM', 'LOW');--> statement-breakpoint
ALTER TABLE "assessment" ADD COLUMN "band" "risk_band" NOT NULL;--> statement-breakpoint
ALTER TABLE "assessment" ADD COLUMN "breakdown" jsonb NOT NULL;