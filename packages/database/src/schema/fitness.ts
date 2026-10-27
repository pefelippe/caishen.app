import {
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { user } from './auth';
import { organizationId, timestamps } from './columns';

/**
 * Fitness: Fichas de treino, Treinos, Dieta, Macros, Sono and Medidas. Health data, sensitive under
 * the LGPD: it belongs to the Organization (personal, docs/adr/0007), shows only to its User and
 * goes with the account. Only integers (grams, millimetres, kcal), like money in cents; days and
 * times are the User's wall clock, like Pessoal.
 */

const createdById = () => text('created_by_id').references(() => user.id, { onDelete: 'set null' });

/** Ficha de treino: a named list of exercises, maybe set for some weekdays. */
export const workoutPlan = pgTable('workout_plan', {
  createdById: createdById(),
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  notes: text('notes').notNull().default(''),
  organizationId: organizationId(),
  position: integer('position').notNull().default(0),
  /** 0 Sunday to 6; empty for a Ficha done on no set day. */
  weekdays: jsonb('weekdays').$type<number[]>().notNull().default([]),
  ...timestamps,
});

/** Exercício: one line of a Ficha. */
export const workoutExercise = pgTable(
  'workout_exercise',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Grams; null for the body's own weight. */
    loadGrams: integer('load_grams'),
    name: text('name').notNull(),
    notes: text('notes').notNull().default(''),
    organizationId: organizationId(),
    planId: uuid('plan_id')
      .notNull()
      .references(() => workoutPlan.id, { onDelete: 'cascade' }),
    position: integer('position').notNull().default(0),
    /** As people write it: "10", "8-12", "até a falha". */
    reps: text('reps').notNull().default(''),
    restSeconds: integer('rest_seconds'),
    sets: integer('sets').notNull().default(3),
  },
  table => [index('workout_exercise_plan_idx').on(table.planId)]
);

/** Treino: a workout done on a day, from a Ficha or not; its title stays if the Ficha goes. */
export const workoutSession = pgTable(
  'workout_session',
  {
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdById: createdById(),
    doneOn: date('done_on').notNull(),
    durationMinutes: integer('duration_minutes'),
    id: uuid('id').primaryKey().defaultRandom(),
    notes: text('notes').notNull().default(''),
    organizationId: organizationId(),
    planId: uuid('plan_id').references(() => workoutPlan.id, { onDelete: 'set null' }),
    title: text('title').notNull(),
  },
  table => [index('workout_session_done_idx').on(table.organizationId, table.doneOn)]
);

export const mealKind = pgEnum('meal_kind', ['BREAKFAST', 'LUNCH', 'SNACK', 'DINNER', 'OTHER']);

/** Refeição: what was eaten on a day, with its kcal and macros in whole grams. */
export const meal = pgTable(
  'meal',
  {
    carbsG: integer('carbs_g').notNull().default(0),
    createdById: createdById(),
    description: text('description').notNull(),
    eatenOn: date('eaten_on').notNull(),
    fatG: integer('fat_g').notNull().default(0),
    id: uuid('id').primaryKey().defaultRandom(),
    kcal: integer('kcal').notNull().default(0),
    kind: mealKind('kind').notNull().default('OTHER'),
    organizationId: organizationId(),
    proteinG: integer('protein_g').notNull().default(0),
    /** "HH:MM", or null. */
    time: text('time'),
    ...timestamps,
  },
  table => [index('meal_eaten_idx').on(table.organizationId, table.eatenOn)]
);

/** Metas de macros: what a User aims to eat a day, each optional. One row per User. */
export const macroTarget = pgTable('macro_target', {
  carbsG: integer('carbs_g'),
  fatG: integer('fat_g'),
  kcal: integer('kcal'),
  organizationId: organizationId(),
  proteinG: integer('protein_g'),
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  ...timestamps,
});

/** Noite de sono: from bed to waking, filed under the morning it ended. */
export const sleepLog = pgTable(
  'sleep_log',
  {
    /** "HH:MM", maybe the evening before `wokeOn`. */
    bedTime: text('bed_time').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdById: createdById(),
    id: uuid('id').primaryKey().defaultRandom(),
    notes: text('notes').notNull().default(''),
    organizationId: organizationId(),
    /** 1 to 5, or null. */
    quality: integer('quality'),
    wakeTime: text('wake_time').notNull(),
    wokeOn: date('woke_on').notNull(),
  },
  table => [index('sleep_log_woke_idx').on(table.organizationId, table.wokeOn)]
);

export const measureKind = pgEnum('measure_kind', [
  'WEIGHT',
  'BODY_FAT',
  'WAIST',
  'HIP',
  'CHEST',
  'ARM',
  'THIGH',
]);

/**
 * Medida: one reading of the body on a day. `value` in the kind's integer unit: grams for
 * WEIGHT, tenths of a percent for BODY_FAT, millimetres for the rest.
 */
export const measurement = pgTable(
  'measurement',
  {
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdById: createdById(),
    id: uuid('id').primaryKey().defaultRandom(),
    kind: measureKind('kind').notNull(),
    measuredOn: date('measured_on').notNull(),
    organizationId: organizationId(),
    value: integer('value').notNull(),
  },
  table => [index('measurement_kind_idx').on(table.organizationId, table.kind, table.measuredOn)]
);
