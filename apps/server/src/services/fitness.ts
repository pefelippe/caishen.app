import { db, schema } from '@mny/database';
import { addDays, today, type IsoDate } from '@mny/finance';
import { and, eq, gte, lte } from 'drizzle-orm';

/** The Monday-to-Sunday week that contains `date`. */
export function weekRange(date: IsoDate): { weekEnd: IsoDate; weekStart: IsoDate } {
  // getUTCDay: 0 is Sunday. Monday becomes offset 0, Sunday offset 6.
  const offset = (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;
  const weekStart = addDays(date, -offset);
  return { weekEnd: addDays(weekStart, 6), weekStart };
}

/** Progress of the Weekly Goal in the week that contains `asOf`. */
export async function fitnessWeek(organizationId: string, asOf = today()) {
  const { weekEnd, weekStart } = weekRange(asOf);
  const workouts = await db
    .select({ durationMinutes: schema.workout.durationMinutes })
    .from(schema.workout)
    .where(
      and(
        eq(schema.workout.organizationId, organizationId),
        gte(schema.workout.date, weekStart),
        lte(schema.workout.date, weekEnd)
      )
    );
  const [goal] = await db
    .select({ workoutsPerWeek: schema.weeklyGoal.workoutsPerWeek })
    .from(schema.weeklyGoal)
    .where(eq(schema.weeklyGoal.organizationId, organizationId));
  return {
    done: workouts.length,
    goal: goal?.workoutsPerWeek ?? null,
    minutes: workouts.reduce((sum, workout) => sum + workout.durationMinutes, 0),
    weekEnd,
    weekStart,
  };
}
