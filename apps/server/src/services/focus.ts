import { db, schema, type PomodoroRow } from '@mny/database';
import { addDays, dateOf, today, type IsoDate } from '@mny/finance';
import { and, asc, eq, gte } from 'drizzle-orm';

import { weekRange } from './fitness';

/** A Pomodoro is 25 minutes; shorter or longer blocks are accepted within these bounds. */
export const POMODORO_MINUTES = { max: 120, min: 1 };

/** Today's Pomodoros and the totals of the week of `asOf`, by the calendar of Brazil. */
export function summarizeFocus(pomodoros: PomodoroRow[], asOf: IsoDate) {
  const { weekEnd, weekStart } = weekRange(asOf);
  const dated = pomodoros.map(pomodoro => ({ date: dateOf(pomodoro.endedAt), pomodoro }));
  const inWeek = dated.filter(({ date }) => date >= weekStart && date <= weekEnd);
  const ofToday = inWeek.filter(({ date }) => date === asOf).map(({ pomodoro }) => pomodoro);
  const minutes = (rows: PomodoroRow[]) => rows.reduce((sum, row) => sum + row.minutes, 0);
  return {
    today: ofToday,
    todayMinutes: minutes(ofToday),
    weekCount: inWeek.length,
    weekMinutes: minutes(inWeek.map(({ pomodoro }) => pomodoro)),
  };
}

export async function focus(organizationId: string, asOf = today()) {
  // A day of slack before Monday covers the offset between UTC and Brazil; the summary is exact.
  const since = new Date(`${addDays(weekRange(asOf).weekStart, -1)}T00:00:00Z`);
  const rows = await db
    .select()
    .from(schema.pomodoro)
    .where(
      and(eq(schema.pomodoro.organizationId, organizationId), gte(schema.pomodoro.endedAt, since))
    )
    .orderBy(asc(schema.pomodoro.endedAt));
  return summarizeFocus(rows, asOf);
}
