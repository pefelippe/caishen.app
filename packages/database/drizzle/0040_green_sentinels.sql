CREATE TYPE "public"."meal_kind" AS ENUM('BREAKFAST', 'LUNCH', 'SNACK', 'DINNER', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."measure_kind" AS ENUM('WEIGHT', 'BODY_FAT', 'WAIST', 'HIP', 'CHEST', 'ARM', 'THIGH');--> statement-breakpoint
CREATE TABLE "macro_target" (
	"carbs_g" integer,
	"fat_g" integer,
	"kcal" integer,
	"organization_id" text NOT NULL,
	"protein_g" integer,
	"user_id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal" (
	"carbs_g" integer DEFAULT 0 NOT NULL,
	"created_by_id" text,
	"description" text NOT NULL,
	"eaten_on" date NOT NULL,
	"fat_g" integer DEFAULT 0 NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kcal" integer DEFAULT 0 NOT NULL,
	"kind" "meal_kind" DEFAULT 'OTHER' NOT NULL,
	"organization_id" text NOT NULL,
	"protein_g" integer DEFAULT 0 NOT NULL,
	"time" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "measurement" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_id" text,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "measure_kind" NOT NULL,
	"measured_on" date NOT NULL,
	"organization_id" text NOT NULL,
	"value" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sleep_log" (
	"bed_time" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_id" text,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"organization_id" text NOT NULL,
	"quality" integer,
	"wake_time" text NOT NULL,
	"woke_on" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_exercise" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"load_grams" integer,
	"name" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"organization_id" text NOT NULL,
	"plan_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"reps" text DEFAULT '' NOT NULL,
	"rest_seconds" integer,
	"sets" integer DEFAULT 3 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_plan" (
	"created_by_id" text,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"organization_id" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"weekdays" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_session" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_id" text,
	"done_on" date NOT NULL,
	"duration_minutes" integer,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"organization_id" text NOT NULL,
	"plan_id" uuid,
	"title" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "macro_target" ADD CONSTRAINT "macro_target_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "macro_target" ADD CONSTRAINT "macro_target_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal" ADD CONSTRAINT "meal_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal" ADD CONSTRAINT "meal_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "measurement" ADD CONSTRAINT "measurement_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "measurement" ADD CONSTRAINT "measurement_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sleep_log" ADD CONSTRAINT "sleep_log_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sleep_log" ADD CONSTRAINT "sleep_log_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_exercise" ADD CONSTRAINT "workout_exercise_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_exercise" ADD CONSTRAINT "workout_exercise_plan_id_workout_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."workout_plan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_plan" ADD CONSTRAINT "workout_plan_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_plan" ADD CONSTRAINT "workout_plan_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_session" ADD CONSTRAINT "workout_session_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_session" ADD CONSTRAINT "workout_session_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_session" ADD CONSTRAINT "workout_session_plan_id_workout_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."workout_plan"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "meal_eaten_idx" ON "meal" USING btree ("organization_id","eaten_on");--> statement-breakpoint
CREATE INDEX "measurement_kind_idx" ON "measurement" USING btree ("organization_id","kind","measured_on");--> statement-breakpoint
CREATE INDEX "sleep_log_woke_idx" ON "sleep_log" USING btree ("organization_id","woke_on");--> statement-breakpoint
CREATE INDEX "workout_exercise_plan_idx" ON "workout_exercise" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "workout_session_done_idx" ON "workout_session" USING btree ("organization_id","done_on");