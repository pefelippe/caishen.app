CREATE TYPE "public"."currency" AS ENUM('BRL', 'USD');--> statement-breakpoint
CREATE TABLE "exchange_rate" (
	"buy_rate" numeric(12, 6) NOT NULL,
	"currency" "currency" NOT NULL,
	"date" date NOT NULL,
	CONSTRAINT "exchange_rate_currency_date_unique" UNIQUE("currency","date")
);
--> statement-breakpoint
CREATE TABLE "income_rate_override" (
	"date" date NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"income_source_id" uuid NOT NULL,
	"rate" numeric(12, 6) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "income_rate_override_source_date_unique" UNIQUE("income_source_id","date")
);
--> statement-breakpoint
ALTER TABLE "income_source" ADD COLUMN "currency" "currency" DEFAULT 'BRL' NOT NULL;--> statement-breakpoint
ALTER TABLE "income_source" ADD COLUMN "iof_rate" numeric(8, 6);--> statement-breakpoint
ALTER TABLE "income_source" ADD COLUMN "spread_rate" numeric(8, 6);--> statement-breakpoint
ALTER TABLE "income_rate_override" ADD CONSTRAINT "income_rate_override_income_source_id_income_source_id_fk" FOREIGN KEY ("income_source_id") REFERENCES "public"."income_source"("id") ON DELETE cascade ON UPDATE no action;