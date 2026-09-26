CREATE TYPE "public"."bureau" AS ENUM('SPC', 'SERASA', 'BOA_VISTA', 'QUOD');--> statement-breakpoint
CREATE TABLE "late_payment" (
	"credit_operation_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"installment_number" integer NOT NULL,
	"paid_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "late_payment_installment_unique" UNIQUE("credit_operation_id","installment_number")
);
--> statement-breakpoint
CREATE TABLE "reported_score" (
	"bureau" "bureau" NOT NULL,
	"consulted_on" date NOT NULL,
	"created_by_id" text,
	"holder_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"score" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "late_payment" ADD CONSTRAINT "late_payment_credit_operation_id_credit_operation_id_fk" FOREIGN KEY ("credit_operation_id") REFERENCES "public"."credit_operation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reported_score" ADD CONSTRAINT "reported_score_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reported_score" ADD CONSTRAINT "reported_score_holder_id_holder_id_fk" FOREIGN KEY ("holder_id") REFERENCES "public"."holder"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reported_score_holder_idx" ON "reported_score" USING btree ("holder_id","consulted_on");--> statement-breakpoint
ALTER TABLE "assessment" DROP COLUMN "grade";--> statement-breakpoint
-- Assessments graded on the old AAA–C- scale cannot be compared with the 0–1000 Score (docs/adr/0005).
DELETE FROM "assessment";