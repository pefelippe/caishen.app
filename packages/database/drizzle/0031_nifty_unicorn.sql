CREATE TABLE "company_guide" (
	"amount_cents" bigint NOT NULL,
	"competence" text NOT NULL,
	"due_date" date NOT NULL,
	"external_id" text NOT NULL,
	"holder_id" uuid NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"organization_id" text NOT NULL,
	"paid" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_guide_holder_external_unique" UNIQUE("holder_id","external_id")
);
--> statement-breakpoint
ALTER TABLE "company_guide" ADD CONSTRAINT "company_guide_holder_id_holder_id_fk" FOREIGN KEY ("holder_id") REFERENCES "public"."holder"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_guide" ADD CONSTRAINT "company_guide_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "company_guide_holder_due_idx" ON "company_guide" USING btree ("holder_id","due_date");