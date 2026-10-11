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

/** The Monday of each of the last `count` weeks, oldest first, ending with the week of `asOf`. */
export function recentWeekStarts(asOf: IsoDate, count: number): IsoDate[] {
  const { weekStart } = weekRange(asOf);
  return Array.from({ length: count }, (_, index) => addDays(weekStart, -7 * (count - 1 - index)));
}

/** Progress of the Weekly Goal in each of the last `count` weeks, oldest first. */
export async function fitnessHistory(organizationId: string, count: number, asOf = today()) {
  const starts = recentWeekStarts(asOf, count);
  const workouts = await db
    .select({ date: schema.workout.date, durationMinutes: schema.workout.durationMinutes })
    .from(schema.workout)
    .where(
      and(
        eq(schema.workout.organizationId, organizationId),
        gte(schema.workout.date, starts[0]!),
        lte(schema.workout.date, addDays(starts.at(-1)!, 6))
      )
    );
  const [goal] = await db
    .select({ workoutsPerWeek: schema.weeklyGoal.workoutsPerWeek })
    .from(schema.weeklyGoal)
    .where(eq(schema.weeklyGoal.organizationId, organizationId));
  return starts.map(weekStart => {
    const weekEnd = addDays(weekStart, 6);
    const inWeek = workouts.filter(workout => workout.date >= weekStart && workout.date <= weekEnd);
    return {
      done: inWeek.length,
      goal: goal?.workoutsPerWeek ?? null,
      minutes: inWeek.reduce((sum, workout) => sum + workout.durationMinutes, 0),
      weekEnd,
      weekStart,
    };
  });
}

/** Progress of the Weekly Goal in the week that contains `asOf`. */
export async function fitnessWeek(organizationId: string, asOf = today()) {
  const [week] = await fitnessHistory(organizationId, 1, asOf);
  return week!;
}
