CREATE TYPE "public"."budget_method" AS ENUM('AUVP', 'CUSTOM', 'FIFTY_THIRTY_TWENTY', 'SEVENTY_TWENTY_TEN');--> statement-breakpoint
CREATE TABLE "budget" (
	"categories" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"holder_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"method" "budget_method" NOT NULL,
	"organization_id" text NOT NULL,
	"slices" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "budget_holder_id_unique" UNIQUE("holder_id")
);
--> statement-breakpoint
ALTER TABLE "budget" ADD CONSTRAINT "budget_holder_id_holder_id_fk" FOREIGN KEY ("holder_id") REFERENCES "public"."holder"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget" ADD CONSTRAINT "budget_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;