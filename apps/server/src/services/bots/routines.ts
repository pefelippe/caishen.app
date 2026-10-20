import { db, schema, type RoutineRow } from '@zapbots/database';
import { and, eq, isNull, lte } from 'drizzle-orm';

import { PlanLimitError, requireWithinLimit } from '../billing/billing';
import { aiConfigured } from '../models';
import { handOverJob } from './jobs';

/** How many Routines an Organization may keep. */
export const MAX_ROUTINES = 10;
const TICK_MS = 60_000;

/** When a Routine runs next, one week or one month after `from`. A month keeps the day, or ends on the last one. */
export function nextRunAfter(cadence: RoutineRow['cadence'], from: Date): Date {
  const next = new Date(from);
  if (cadence === 'WEEKLY') {
    next.setUTCDate(next.getUTCDate() + 7);
    return next;
  }
  const day = next.getUTCDate();
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + 1);
  const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  next.setUTCDate(Math.min(day, lastDay));
  return next;
}

/**
 * Hands over the Job of every Routine whose time has come, as the User who created it, and moves
 * each Routine to its next run. Returns how many Jobs were handed over.
 */
export async function runDueRoutines(now = new Date()): Promise<number> {
  // Without a Model provider the Jobs would only fail; the Routines wait for one.
  if (!aiConfigured()) return 0;
  const due = await db
    .select()
    .from(schema.routine)
    .where(and(lte(schema.routine.nextRunAt, now), isNull(schema.routine.pausedAt)));
  let handed = 0;
  for (const routine of due) {
    // Claiming by the old `nextRunAt` keeps two ticks from handing the same run over twice.
    const [claimed] = await db
      .update(schema.routine)
      .set({ nextRunAt: nextRunAfter(routine.cadence, now) })
      .where(
        and(eq(schema.routine.id, routine.id), eq(schema.routine.nextRunAt, routine.nextRunAt))
      )
      .returning({ id: schema.routine.id });
    if (!claimed || !routine.createdById) continue;
    const [member] = await db
      .select({ role: schema.member.role })
      .from(schema.member)
      .where(
        and(
          eq(schema.member.userId, routine.createdById),
          eq(schema.member.organizationId, routine.organizationId)
        )
      );
    if (!member) continue;
    const viewer = {
      organizationId: routine.organizationId,
      role: member.role,
      userId: routine.createdById,
    };
    const job = {
      botId: routine.botId,
      files: [],
      instructions: routine.instructions,
      routineId: routine.id,
    };
    try {
      await requireWithinLimit(viewer, 'jobs');
    } catch (error) {
      if (!(error instanceof PlanLimitError)) throw error;
      // Past the Limit the run still shows up, as a failed Job, so the Routine raises an Alert.
      await db.insert(schema.job).values({
        botId: job.botId,
        createdById: viewer.userId,
        error: error.message,
        finishedAt: now,
        instructions: job.instructions,
        organizationId: viewer.organizationId,
        routineId: job.routineId,
        status: 'FAILED',
      });
      continue;
    }
    await handOverJob(viewer, job);
    handed += 1;
  }
  return handed;
}

/** Checks for due Routines every minute, inside the server process (docs/adr/0010). */
export function startRoutineClock(): () => void {
  const tick = () => void runDueRoutines().catch(error => console.error('routines failed:', error));
  tick();
  const timer = setInterval(tick, TICK_MS);
  return () => clearInterval(timer);
}
