ALTER TYPE "public"."conversation_channel" ADD VALUE 'TELEGRAM';--> statement-breakpoint
CREATE TABLE "telegram_link" (
	"chat_id" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"linked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text NOT NULL,
	"unlinked_at" timestamp with time zone,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telegram_link_code" (
	"code" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"used_at" timestamp with time zone,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "telegram_link_code_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "telegram_update" (
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"update_id" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
ALTER TABLE "telegram_link" ADD CONSTRAINT "telegram_link_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_link" ADD CONSTRAINT "telegram_link_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_link_code" ADD CONSTRAINT "telegram_link_code_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "telegram_link_code" ADD CONSTRAINT "telegram_link_code_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "telegram_link_chat_active" ON "telegram_link" USING btree ("chat_id") WHERE "telegram_link"."unlinked_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "telegram_link_user_active" ON "telegram_link" USING btree ("user_id") WHERE "telegram_link"."unlinked_at" is null;