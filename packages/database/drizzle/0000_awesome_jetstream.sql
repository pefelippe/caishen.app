CREATE TYPE "public"."amortization_system" AS ENUM('PRICE', 'SAC');--> statement-breakpoint
CREATE TYPE "public"."data_source" AS ENUM('BACEN_REGISTRATO', 'BUREAU', 'OPEN_FINANCE');--> statement-breakpoint
CREATE TYPE "public"."holder_kind" AS ENUM('PF', 'PJ');--> statement-breakpoint
CREATE TYPE "public"."modality" AS ENUM('CARD_INSTALLMENT', 'GOODS_FINANCING', 'OTHER', 'OVERDRAFT', 'PAYROLL_LOAN_INSS', 'PAYROLL_LOAN_PRIVATE', 'PAYROLL_LOAN_PUBLIC', 'PERSONAL_LOAN', 'REAL_ESTATE_FINANCING', 'VEHICLE_FINANCING');--> statement-breakpoint
CREATE TYPE "public"."rate_source" AS ENUM('INFORMED', 'IMPLIED');--> statement-breakpoint
CREATE TABLE "account" (
	"access_token" text,
	"access_token_expires_at" timestamp with time zone,
	"account_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"id_token" text,
	"password" text,
	"provider_id" text NOT NULL,
	"refresh_token" text,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"email" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"inviter_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"role" text,
	"status" text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"logo" text,
	"metadata" text,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"active_organization_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"ip_address" text,
	"token" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"image" text,
	"name" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessment" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_id" text,
	"grade" text NOT NULL,
	"holder_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"indicators" jsonb NOT NULL,
	"model_version" text NOT NULL,
	"score" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consent" (
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"granted_by_id" text NOT NULL,
	"holder_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"revoked_at" timestamp with time zone,
	"source" "data_source" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_card" (
	"closing_day" integer NOT NULL,
	"due_day" integer NOT NULL,
	"holder_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issuer" text,
	"limit_cents" bigint NOT NULL,
	"name" text NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_operation" (
	"collateral_description" text,
	"collateral_value_cents" bigint,
	"first_due_date" date NOT NULL,
	"holder_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lender" text,
	"modality" "modality" NOT NULL,
	"monthly_rate" numeric(16, 12) NOT NULL,
	"name" text NOT NULL,
	"organization_id" text NOT NULL,
	"principal_cents" bigint NOT NULL,
	"rate_source" "rate_source" NOT NULL,
	"system" "amortization_system" DEFAULT 'PRICE' NOT NULL,
	"term_months" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extra_amortization" (
	"amount_cents" bigint NOT NULL,
	"credit_operation_id" uuid NOT NULL,
	"date" date NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "holder" (
	"birth_date" date,
	"document" text,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "holder_kind" DEFAULT 'PF' NOT NULL,
	"name" text NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "income_source" (
	"description" text NOT NULL,
	"ends_on" date,
	"holder_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"monthly_net_cents" bigint NOT NULL,
	"starts_on" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "note" (
	"content" "bytea",
	"created_by_id" text,
	"credit_card_id" uuid,
	"credit_operation_id" uuid,
	"holder_id" uuid,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"title" text DEFAULT 'Sem título' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "statement" (
	"amount_cents" bigint NOT NULL,
	"credit_card_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference_month" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "statement_card_month_unique" UNIQUE("credit_card_id","reference_month")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment" ADD CONSTRAINT "assessment_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment" ADD CONSTRAINT "assessment_holder_id_holder_id_fk" FOREIGN KEY ("holder_id") REFERENCES "public"."holder"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent" ADD CONSTRAINT "consent_granted_by_id_user_id_fk" FOREIGN KEY ("granted_by_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent" ADD CONSTRAINT "consent_holder_id_holder_id_fk" FOREIGN KEY ("holder_id") REFERENCES "public"."holder"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_card" ADD CONSTRAINT "credit_card_holder_id_holder_id_fk" FOREIGN KEY ("holder_id") REFERENCES "public"."holder"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_card" ADD CONSTRAINT "credit_card_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_operation" ADD CONSTRAINT "credit_operation_holder_id_holder_id_fk" FOREIGN KEY ("holder_id") REFERENCES "public"."holder"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_operation" ADD CONSTRAINT "credit_operation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extra_amortization" ADD CONSTRAINT "extra_amortization_credit_operation_id_credit_operation_id_fk" FOREIGN KEY ("credit_operation_id") REFERENCES "public"."credit_operation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holder" ADD CONSTRAINT "holder_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holder" ADD CONSTRAINT "holder_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "income_source" ADD CONSTRAINT "income_source_holder_id_holder_id_fk" FOREIGN KEY ("holder_id") REFERENCES "public"."holder"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note" ADD CONSTRAINT "note_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note" ADD CONSTRAINT "note_credit_card_id_credit_card_id_fk" FOREIGN KEY ("credit_card_id") REFERENCES "public"."credit_card"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note" ADD CONSTRAINT "note_credit_operation_id_credit_operation_id_fk" FOREIGN KEY ("credit_operation_id") REFERENCES "public"."credit_operation"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note" ADD CONSTRAINT "note_holder_id_holder_id_fk" FOREIGN KEY ("holder_id") REFERENCES "public"."holder"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note" ADD CONSTRAINT "note_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "statement" ADD CONSTRAINT "statement_credit_card_id_credit_card_id_fk" FOREIGN KEY ("credit_card_id") REFERENCES "public"."credit_card"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "member_user_idx" ON "member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "assessment_holder_idx" ON "assessment" USING btree ("holder_id","created_at");--> statement-breakpoint
CREATE INDEX "credit_card_holder_idx" ON "credit_card" USING btree ("holder_id");--> statement-breakpoint
CREATE INDEX "credit_operation_holder_idx" ON "credit_operation" USING btree ("holder_id");--> statement-breakpoint
CREATE INDEX "holder_organization_idx" ON "holder" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "note_organization_idx" ON "note" USING btree ("organization_id");