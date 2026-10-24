CREATE TYPE "public"."conversation_channel" AS ENUM('APP', 'WHATSAPP');--> statement-breakpoint
CREATE TABLE "whatsapp_link" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"linked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"organization_id" text NOT NULL,
	"phone" text NOT NULL,
	"unlinked_at" timestamp with time zone,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_link_code" (
	"code" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"used_at" timestamp with time zone,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "whatsapp_link_code_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "whatsapp_message" (
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"wamid" text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_stranger" (
	"phone_hash" text PRIMARY KEY NOT NULL,
	"told_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_usage" (
	"month" text PRIMARY KEY NOT NULL,
	"sent" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversation" ADD COLUMN "channel" "conversation_channel" DEFAULT 'APP' NOT NULL;--> statement-breakpoint
ALTER TABLE "whatsapp_link" ADD CONSTRAINT "whatsapp_link_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_link" ADD CONSTRAINT "whatsapp_link_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_link_code" ADD CONSTRAINT "whatsapp_link_code_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_link_code" ADD CONSTRAINT "whatsapp_link_code_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "whatsapp_link_phone_active" ON "whatsapp_link" USING btree ("phone") WHERE "whatsapp_link"."unlinked_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "whatsapp_link_user_active" ON "whatsapp_link" USING btree ("user_id") WHERE "whatsapp_link"."unlinked_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "conversation_whatsapp_once" ON "conversation" USING btree ("organization_id") WHERE "conversation"."channel" = 'WHATSAPP';