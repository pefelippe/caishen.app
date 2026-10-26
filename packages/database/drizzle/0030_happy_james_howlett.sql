CREATE TYPE "public"."ai_provider" AS ENUM('ANTHROPIC', 'GOOGLE', 'OPENAI', 'OPENROUTER');--> statement-breakpoint
CREATE TABLE "ai_key" (
	"ciphertext" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"last4" text NOT NULL,
	"organization_id" text NOT NULL,
	"provider" "ai_provider" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_key_organization_provider_unique" UNIQUE("organization_id","provider")
);
--> statement-breakpoint
ALTER TABLE "ai_key" ADD CONSTRAINT "ai_key_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;