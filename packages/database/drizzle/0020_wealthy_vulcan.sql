CREATE TYPE "public"."company_activity" AS ENUM('COMMERCE', 'INDUSTRY', 'SERVICES', 'COMMERCE_SERVICES');--> statement-breakpoint
CREATE TYPE "public"."simples_annex" AS ENUM('I', 'II', 'III', 'IV', 'V');--> statement-breakpoint
CREATE TYPE "public"."tax_regime" AS ENUM('MEI', 'SIMPLES', 'PRESUMIDO', 'REAL');--> statement-breakpoint
CREATE TABLE "company" (
	"activity" "company_activity" DEFAULT 'SERVICES' NOT NULL,
	"annex" "simples_annex",
	"cnpj" text NOT NULL,
	"exports" boolean DEFAULT false NOT NULL,
	"fator_r" boolean DEFAULT false NOT NULL,
	"holder_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"iss_rate" numeric(8, 6),
	"name" text,
	"organization_id" text NOT NULL,
	"pro_labore_cents" bigint DEFAULT 0 NOT NULL,
	"regime" "tax_regime" NOT NULL,
	"revenue_source_id" uuid,
	"starts_on" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_holder_id_unique" UNIQUE("holder_id")
);
--> statement-breakpoint
CREATE TABLE "company_revenue" (
	"amount_cents" bigint NOT NULL,
	"company_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"month" text NOT NULL,
	"organization_id" text NOT NULL,
	"rbt12_cents" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_revenue_company_month_unique" UNIQUE("company_id","month")
);
--> statement-breakpoint
ALTER TABLE "company" ADD CONSTRAINT "company_holder_id_holder_id_fk" FOREIGN KEY ("holder_id") REFERENCES "public"."holder"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company" ADD CONSTRAINT "company_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company" ADD CONSTRAINT "company_revenue_source_id_income_source_id_fk" FOREIGN KEY ("revenue_source_id") REFERENCES "public"."income_source"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_revenue" ADD CONSTRAINT "company_revenue_company_id_company_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_revenue" ADD CONSTRAINT "company_revenue_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "company_organization_idx" ON "company" USING btree ("organization_id");