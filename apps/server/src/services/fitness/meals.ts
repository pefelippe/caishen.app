import type { Viewer } from '@zapbots/auth';
import { db, schema, type MacroTargetRow, type MealRow } from '@zapbots/database';
import { addDays } from '@zapbots/finance';
import { totalMacros, type Macros } from '@zapbots/fitness';
import { and, asc, between, eq } from 'drizzle-orm';

import { badInput, notFound, owned } from '../../resolvers/guards';
import { time, title } from '../personal/clock';
import { count, MAX_DAYS, requiredDay } from './shared';

type MealKind = MealRow['kind'];

export interface MealInput {
  carbsG?: null | number;
  description: string;
  eatenOn: string;
  fatG?: null | number;
  kcal?: null | number;
  kind?: MealKind | null;
  proteinG?: null | number;
  time?: null | string;
}

const GRAMS: [number, number] = [0, 5_000];

function mealValues(input: MealInput) {
  return {
    carbsG: count(input.carbsG, 'Os carboidratos (g)', GRAMS) ?? 0,
    description: title(input.description, 'O que você comeu'),
    eatenOn: requiredDay(input.eatenOn),
    fatG: count(input.fatG, 'As gorduras (g)', GRAMS) ?? 0,
    kcal: count(input.kcal, 'As calorias', [0, 20_000]) ?? 0,
    kind: input.kind ?? 'OTHER',
    proteinG: count(input.proteinG, 'As proteínas (g)', GRAMS) ?? 0,
    time: time(input.time),
  };
}

export async function createMeal(viewer: Viewer, input: MealInput): Promise<MealRow> {
  const [row] = await db
    .insert(schema.meal)
    .values({
      ...mealValues(input),
      createdById: viewer.userId,
      organizationId: viewer.organizationId,
    })
    .returning();
  return row!;
}

export async function updateMeal(viewer: Viewer, id: string, input: MealInput): Promise<MealRow> {
  const values = mealValues(input);
  const [row] = await db
    .update(schema.meal)
    .set(values)
    .where(owned(schema.meal, viewer, id))
    .returning();
  return row ?? notFound('Refeição');
}

export async function deleteMeal(viewer: Viewer, id: string): Promise<boolean> {
  const deleted = await db
    .delete(schema.meal)
    .where(owned(schema.meal, viewer, id))
    .returning({ id: schema.meal.id });
  return deleted.length > 0;
}

function checkRange(from: string, to: string) {
  requiredDay(from, 'O começo');
  requiredDay(to, 'O fim');
  if (from > to) badInput('O começo vem depois do fim.');
  if (addDays(from, MAX_DAYS - 1) < to) badInput(`Escolha até ${MAX_DAYS} dias.`);
}

/** The Refeições of some days, by day and then time (those without one last). */
export function listMeals(viewer: Viewer, from: string, to: string): Promise<MealRow[]> {
  checkRange(from, to);
  return db
    .select()
    .from(schema.meal)
    .where(and(owned(schema.meal, viewer), between(schema.meal.eatenOn, from, to)))
    .orderBy(asc(schema.meal.eatenOn), asc(schema.meal.time), asc(schema.meal.createdAt));
}

export interface MacroDay extends Macros {
  date: string;
  meals: number;
}

/** Each day from `from` to `to`, with what its Refeições add up to (zero without any). */
export async function macroDays(viewer: Viewer, from: string, to: string): Promise<MacroDay[]> {
  const meals = await listMeals(viewer, from, to);
  const days: MacroDay[] = [];
  for (let date = from; date <= to; date = addDays(date, 1)) {
    const eaten = meals.filter(meal => meal.eatenOn === date);
    days.push({ date, meals: eaten.length, ...totalMacros(eaten) });
  }
  return days;
}

export async function macroTarget(viewer: Viewer): Promise<MacroTargetRow | null> {
  const [row] = await db
    .select()
    .from(schema.macroTarget)
    .where(eq(schema.macroTarget.userId, viewer.userId));
  return row ?? null;
}

export async function setMacroTarget(
  viewer: Viewer,
  input: Partial<Record<'carbsG' | 'fatG' | 'kcal' | 'proteinG', null | number>>
): Promise<MacroTargetRow> {
  const values = {
    carbsG: count(input.carbsG, 'A meta de carboidratos (g)', GRAMS),
    fatG: count(input.fatG, 'A meta de gorduras (g)', GRAMS),
    kcal: count(input.kcal, 'A meta de calorias', [0, 20_000]),
    proteinG: count(input.proteinG, 'A meta de proteínas (g)', GRAMS),
  };
  const [row] = await db
    .insert(schema.macroTarget)
    .values({ ...values, organizationId: viewer.organizationId, userId: viewer.userId })
    .onConflictDoUpdate({ set: values, target: schema.macroTarget.userId })
    .returning();
  return row!;
}
