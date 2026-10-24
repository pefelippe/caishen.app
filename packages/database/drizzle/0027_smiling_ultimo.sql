CREATE TYPE "public"."import_account_kind" AS ENUM('CHECKING', 'CREDIT_CARD', 'SAVINGS', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."import_source" AS ENUM('CSV', 'XLSX', 'OFX');--> statement-breakpoint
CREATE TABLE "expense_import" (
	"account_kind" "import_account_kind" DEFAULT 'CHECKING' NOT NULL,
	"bank_name" text,
	"file_name" text NOT NULL,
	"holder_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"source" "import_source" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "expense" ADD COLUMN "import_id" uuid;--> statement-breakpoint
ALTER TABLE "expense_import" ADD CONSTRAINT "expense_import_holder_id_holder_id_fk" FOREIGN KEY ("holder_id") REFERENCES "public"."holder"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_import" ADD CONSTRAINT "expense_import_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "expense_import_holder_idx" ON "expense_import" USING btree ("holder_id","created_at");--> statement-breakpoint
ALTER TABLE "expense" ADD CONSTRAINT "expense_import_id_expense_import_id_fk" FOREIGN KEY ("import_id") REFERENCES "public"."expense_import"("id") ON DELETE cascade ON UPDATE no action;