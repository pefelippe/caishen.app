CREATE TABLE "automation_inbox" (
	"last_added" integer,
	"last_received_at" timestamp with time zone,
	"organization_id" text NOT NULL,
	"token" text NOT NULL,
	"user_id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "automation_inbox_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "automation_inbox" ADD CONSTRAINT "automation_inbox_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_inbox" ADD CONSTRAINT "automation_inbox_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;