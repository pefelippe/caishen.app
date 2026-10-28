import { randomBytes } from 'node:crypto';

import type { Viewer } from '@zapbots/auth';
import { db, schema } from '@zapbots/database';
import { formatDecimal, readHealthPayload, type HealthBatch } from '@zapbots/fitness';
import { wallClock } from '@zapbots/personal';
import { and, eq, sql } from 'drizzle-orm';

import { viewerTimeZone } from '../personal/clock';

const pathOf = (token: string) => `/api/health/${token}`;

type InboxRow = typeof schema.healthInbox.$inferSelect;

const shown = (row: InboxRow) => ({
  createdAt: row.createdAt,
  lastCounts: row.lastCounts as HealthCounts | null,
  lastReceivedAt: row.lastReceivedAt,
  path: pathOf(row.token),
});

/** The Viewer's address for their phone to send health data to, or null while they have none. */
export async function healthInbox(viewer: Viewer) {
  const [row] = await db
    .select()
    .from(schema.healthInbox)
    .where(eq(schema.healthInbox.userId, viewer.userId));
  return row ? shown(row) : null;
}

/** On: a new secret (the old address stops working). Off: no address; what came stays. */
export async function setHealthInbox(viewer: Viewer, on: boolean) {
  if (!on) {
    await db.delete(schema.healthInbox).where(eq(schema.healthInbox.userId, viewer.userId));
    return null;
  }
  const token = randomBytes(24).toString('base64url');
  const [row] = await db
    .insert(schema.healthInbox)
    .values({ organizationId: viewer.organizationId, token, userId: viewer.userId })
    .onConflictDoUpdate({
      set: { lastCounts: null, lastReceivedAt: null, token },
      target: schema.healthInbox.userId,
    })
    .returning();
  return shown(row!);
}

/** Who an address belongs to; null for one that does not exist (any more). */
async function inboxViewer(token: string): Promise<null | Viewer> {
  if (!/^[\w-]{16,64}$/.test(token)) return null;
  const [row] = await db
    .select({
      organizationId: schema.healthInbox.organizationId,
      role: schema.member.role,
      userId: schema.healthInbox.userId,
    })
    .from(schema.healthInbox)
    .innerJoin(
      schema.member,
      and(
        eq(schema.member.userId, schema.healthInbox.userId),
        eq(schema.member.organizationId, schema.healthInbox.organizationId)
      )
    )
    .where(eq(schema.healthInbox.token, token));
  return row ?? null;
}

export interface HealthCounts {
  bodyFat: number;
  sleeps: number;
  steps: number;
  weights: number;
  workouts: number;
}

/**
 * Saves what the phone sent, each reading under its name there (`external_id`), so sending the
 * same day again changes it: the day's steps (never fewer than already counted), one weight and
 * one body fat a day, one night a morning, each workout once. Null for an unknown address.
 */
export async function receiveHealth(token: string, body: unknown): Promise<HealthCounts | null> {
  const viewer = await inboxViewer(token);
  if (!viewer) return null;
  const zone = await viewerTimeZone(viewer);
  const batch = readHealthPayload(body, instant => wallClock(instant, zone));
  await saveBatch(viewer, batch);
  const counts: HealthCounts = {
    bodyFat: batch.bodyFat.length,
    sleeps: batch.sleeps.length,
    steps: batch.steps.length,
    weights: batch.weights.length,
    workouts: batch.workouts.length,
  };
  await db
    .update(schema.healthInbox)
    .set({ lastCounts: { ...counts }, lastReceivedAt: new Date() })
    .where(eq(schema.healthInbox.userId, viewer.userId));
  return counts;
}

async function saveBatch(viewer: Viewer, batch: HealthBatch) {
  const { organizationId, userId } = viewer;
  await db.transaction(async tx => {
    for (const day of batch.steps) {
      await tx
        .insert(schema.activityDay)
        .values({ day: day.date, organizationId, steps: day.count })
        .onConflictDoUpdate({
          // A send that counted only part of the day does not take steps away.
          set: {
            steps: sql`greatest(${schema.activityDay.steps}, excluded.steps)`,
            updatedAt: new Date(),
          },
          target: [schema.activityDay.organizationId, schema.activityDay.day],
        });
    }
    const readings = [
      ...batch.weights.map(item => ({
        date: item.date,
        kind: 'WEIGHT' as const,
        value: item.grams,
      })),
      ...batch.bodyFat.map(item => ({
        date: item.date,
        kind: 'BODY_FAT' as const,
        value: item.tenths,
      })),
    ];
    for (const reading of readings) {
      await tx
        .insert(schema.measurement)
        .values({
          createdById: userId,
          externalId: `health:${reading.kind}:${reading.date}`,
          kind: reading.kind,
          measuredOn: reading.date,
          organizationId,
          value: reading.value,
        })
        .onConflictDoUpdate({
          set: { value: reading.value },
          target: [schema.measurement.organizationId, schema.measurement.externalId],
        });
    }
    for (const night of batch.sleeps) {
      await tx
        .insert(schema.sleepLog)
        .values({
          ...night,
          createdById: userId,
          externalId: `health:sleep:${night.wokeOn}`,
          organizationId,
        })
        .onConflictDoUpdate({
          set: { bedTime: night.bedTime, wakeTime: night.wakeTime },
          target: [schema.sleepLog.organizationId, schema.sleepLog.externalId],
        });
    }
    for (const workout of batch.workouts) {
      const notes = [
        workout.distanceMeters
          ? `${formatDecimal(workout.distanceMeters, 3, 'pt-BR', 1)} km`
          : null,
        workout.kcal ? `${workout.kcal} kcal` : null,
      ]
        .filter(Boolean)
        .join(' · ');
      await tx
        .insert(schema.workoutSession)
        .values({
          createdById: userId,
          doneOn: workout.doneOn,
          durationMinutes: workout.durationMinutes,
          externalId: `health:workout:${workout.key}`,
          notes,
          organizationId,
          title: workout.title,
        })
        .onConflictDoNothing({
          target: [schema.workoutSession.organizationId, schema.workoutSession.externalId],
        });
    }
  });
}

/** The steps the phone counted on `date`, or null when it sent none. */
export async function stepsOn(viewer: Viewer, date: string): Promise<null | number> {
  const [row] = await db
    .select({ steps: schema.activityDay.steps })
    .from(schema.activityDay)
    .where(
      and(
        eq(schema.activityDay.organizationId, viewer.organizationId),
        eq(schema.activityDay.day, date)
      )
    );
  return row?.steps ?? null;
}
