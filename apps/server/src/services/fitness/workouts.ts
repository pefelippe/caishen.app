import { randomBytes } from 'node:crypto';

import type { Viewer } from '@zapbots/auth';
import {
  db,
  schema,
  type WorkoutExerciseRow,
  type WorkoutPlanRow,
  type WorkoutSessionRow,
} from '@zapbots/database';
import { parseDecimal } from '@zapbots/fitness';
import { and, asc, between, desc, eq, inArray, max, sql } from 'drizzle-orm';

import { badInput, notFound, owned } from '../../resolvers/guards';
import { text, title, viewerToday } from '../personal/clock';
import { count, range, requiredDay } from './shared';

export interface WorkoutExerciseInput {
  load?: null | string;
  name: string;
  notes?: null | string;
  reps?: null | string;
  restSeconds?: null | number;
  sets: number;
}

export interface WorkoutPlanInput {
  exercises: WorkoutExerciseInput[];
  forName?: null | string;
  name: string;
  notes?: null | string;
  weekdays?: null | number[];
}

/** At most this many exercises in one Ficha. */
const MAX_EXERCISES = 40;

function exerciseValues(input: WorkoutExerciseInput, index: number) {
  const where = `No exercício ${index + 1}`;
  const load = input.load?.trim();
  const loadGrams = load ? parseDecimal(load, 3) : null;
  if (load && (loadGrams === null || loadGrams > 1_000_000))
    badInput(`${where}, a carga não é um peso válido em kg (ex.: 22,5).`);
  return {
    loadGrams,
    name: title(input.name, `${where}, o nome`),
    notes: text(input.notes, `${where}, a observação`, 500),
    position: index,
    reps: text(input.reps, `${where}, as repetições`, 40),
    restSeconds: count(input.restSeconds, `${where}, o descanso (s)`, [0, 3_600]),
    sets: count(input.sets, `${where}, as séries`, [1, 50])!,
  };
}

function weekdays(value: null | number[] | undefined): number[] {
  const days = [...new Set(value ?? [])].sort();
  if (days.some(day => !Number.isInteger(day) || day < 0 || day > 6))
    badInput('Os dias da semana vão de 0 (domingo) a 6.');
  return days;
}

async function findPlan(viewer: Viewer, id: string): Promise<WorkoutPlanRow> {
  const [row] = await db
    .select()
    .from(schema.workoutPlan)
    .where(owned(schema.workoutPlan, viewer, id));
  return row ?? notFound('Ficha');
}

/** Creates a Ficha, or changes one and puts its exercises in place of the old ones. */
export async function saveWorkoutPlan(
  viewer: Viewer,
  id: null | string | undefined,
  input: WorkoutPlanInput
): Promise<WorkoutPlanRow> {
  if (input.exercises.length > MAX_EXERCISES)
    badInput(`Uma Ficha pode ter até ${MAX_EXERCISES} exercícios.`);
  const values = {
    forName: text(input.forName, 'Para quem', 120) || null,
    name: title(input.name, 'O nome da Ficha'),
    notes: text(input.notes, 'A observação', 2_000),
    weekdays: weekdays(input.weekdays),
  };
  const exercises = input.exercises.map(exerciseValues);
  if (id) await findPlan(viewer, id);
  return db.transaction(async tx => {
    const [plan] = id
      ? await tx
          .update(schema.workoutPlan)
          .set(values)
          .where(owned(schema.workoutPlan, viewer, id))
          .returning()
      : await tx
          .insert(schema.workoutPlan)
          .values({
            ...values,
            createdById: viewer.userId,
            organizationId: viewer.organizationId,
          })
          .returning();
    await tx.delete(schema.workoutExercise).where(eq(schema.workoutExercise.planId, plan!.id));
    if (exercises.length)
      await tx.insert(schema.workoutExercise).values(
        exercises.map(exercise => ({
          ...exercise,
          organizationId: viewer.organizationId,
          planId: plan!.id,
        }))
      );
    return plan!;
  });
}

export async function deleteWorkoutPlan(viewer: Viewer, id: string): Promise<boolean> {
  const deleted = await db
    .delete(schema.workoutPlan)
    .where(owned(schema.workoutPlan, viewer, id))
    .returning({ id: schema.workoutPlan.id });
  return deleted.length > 0;
}

export function listWorkoutPlans(viewer: Viewer): Promise<WorkoutPlanRow[]> {
  return (
    db
      .select()
      .from(schema.workoutPlan)
      .where(owned(schema.workoutPlan, viewer))
      // The User's own first, then each person's together.
      .orderBy(
        sql`${schema.workoutPlan.forName} is not null`,
        asc(schema.workoutPlan.forName),
        asc(schema.workoutPlan.position),
        asc(schema.workoutPlan.createdAt)
      )
  );
}

/** Opens the Ficha's public link with a new secret, or closes it. */
export async function shareWorkoutPlan(
  viewer: Viewer,
  id: string,
  shared: boolean
): Promise<WorkoutPlanRow> {
  await findPlan(viewer, id);
  const [row] = await db
    .update(schema.workoutPlan)
    .set({ shareToken: shared ? randomBytes(18).toString('base64url') : null })
    .where(owned(schema.workoutPlan, viewer, id))
    .returning();
  return row!;
}

/** A shared Ficha by its secret, with who made it, for anyone with the link. */
export async function publicWorkoutPlan(
  token: string
): Promise<(WorkoutPlanRow & { ownerName: string }) | null> {
  if (!token) return null;
  const [row] = await db
    .select({ ownerName: schema.user.name, plan: schema.workoutPlan })
    .from(schema.workoutPlan)
    .leftJoin(schema.user, eq(schema.user.id, schema.workoutPlan.createdById))
    .where(eq(schema.workoutPlan.shareToken, token));
  return row ? { ...row.plan, ownerName: row.ownerName ?? 'Caishen' } : null;
}

export function planExercises(planId: string): Promise<WorkoutExerciseRow[]> {
  return db
    .select()
    .from(schema.workoutExercise)
    .where(eq(schema.workoutExercise.planId, planId))
    .orderBy(asc(schema.workoutExercise.position));
}

export async function planLastDoneOn(planId: string): Promise<null | string> {
  const [row] = await db
    .select({ last: max(schema.workoutSession.doneOn) })
    .from(schema.workoutSession)
    .where(eq(schema.workoutSession.planId, planId));
  return row?.last ?? null;
}

export interface WorkoutSessionInput {
  doneOn: string;
  durationMinutes?: null | number;
  notes?: null | string;
  planId?: null | string;
  title?: null | string;
}

/** Logs a Treino; from a Ficha, its name is the title unless another is given. */
export async function logWorkout(
  viewer: Viewer,
  input: WorkoutSessionInput
): Promise<WorkoutSessionRow> {
  const plan = input.planId ? await findPlan(viewer, input.planId) : null;
  const [row] = await db
    .insert(schema.workoutSession)
    .values({
      createdById: viewer.userId,
      doneOn: requiredDay(input.doneOn),
      durationMinutes: count(input.durationMinutes, 'A duração (min)', [1, 1_440]),
      notes: text(input.notes, 'A observação', 2_000),
      organizationId: viewer.organizationId,
      planId: plan?.id ?? null,
      title: input.title?.trim() ? title(input.title) : (plan?.name ?? title(input.title)),
    })
    .returning();
  return row!;
}

export async function deleteWorkoutSession(viewer: Viewer, id: string): Promise<boolean> {
  const deleted = await db
    .delete(schema.workoutSession)
    .where(owned(schema.workoutSession, viewer, id))
    .returning({ id: schema.workoutSession.id });
  return deleted.length > 0;
}

export async function listWorkoutSessions(
  viewer: Viewer,
  dates: { from?: null | string; to?: null | string }
): Promise<WorkoutSessionRow[]> {
  const { from, to } = range(dates.from, dates.to, await viewerToday(viewer), 90);
  return db
    .select()
    .from(schema.workoutSession)
    .where(
      and(owned(schema.workoutSession, viewer), between(schema.workoutSession.doneOn, from, to))
    )
    .orderBy(desc(schema.workoutSession.doneOn), desc(schema.workoutSession.createdAt));
}

/** The Treinos logged on one day. */
export function sessionsOn(viewer: Viewer, date: string): Promise<WorkoutSessionRow[]> {
  return db
    .select()
    .from(schema.workoutSession)
    .where(and(owned(schema.workoutSession, viewer), eq(schema.workoutSession.doneOn, date)));
}

/** Fichas by id, for the Fichas of a weekday. */
export function plansById(viewer: Viewer, ids: string[]): Promise<WorkoutPlanRow[]> {
  if (ids.length === 0) return Promise.resolve([]);
  return db
    .select()
    .from(schema.workoutPlan)
    .where(and(owned(schema.workoutPlan, viewer), inArray(schema.workoutPlan.id, ids)));
}
