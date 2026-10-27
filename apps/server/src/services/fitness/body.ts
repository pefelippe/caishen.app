import type { Viewer } from '@zapbots/auth';
import { db, schema, type MeasurementRow, type SleepLogRow } from '@zapbots/database';
import { MEASURE_LIMITS, MEASURE_UNITS, parseDecimal, type MeasureKind } from '@zapbots/fitness';
import { and, asc, between, desc, eq } from 'drizzle-orm';

import { badInput, notFound, owned } from '../../resolvers/guards';
import { text, time, viewerToday } from '../personal/clock';
import { count, range, requiredDay } from './shared';

export interface SleepLogInput {
  bedTime: string;
  notes?: null | string;
  quality?: null | number;
  wakeTime: string;
  wokeOn: string;
}

function sleepValues(input: SleepLogInput) {
  return {
    bedTime: time(input.bedTime, 'A hora de deitar') ?? badInput('Diga a hora de deitar.'),
    notes: text(input.notes, 'A observação', 1_000),
    quality: count(input.quality, 'A qualidade', [1, 5]),
    wakeTime: time(input.wakeTime, 'A hora de acordar') ?? badInput('Diga a hora de acordar.'),
    wokeOn: requiredDay(input.wokeOn, 'O dia'),
  };
}

/** Logs a night (no id) or changes one. */
export async function saveSleepLog(
  viewer: Viewer,
  id: null | string | undefined,
  input: SleepLogInput
): Promise<SleepLogRow> {
  const values = sleepValues(input);
  if (id) {
    const [row] = await db
      .update(schema.sleepLog)
      .set(values)
      .where(owned(schema.sleepLog, viewer, id))
      .returning();
    return row ?? notFound('Noite');
  }
  const [row] = await db
    .insert(schema.sleepLog)
    .values({ ...values, createdById: viewer.userId, organizationId: viewer.organizationId })
    .returning();
  return row!;
}

export async function deleteSleepLog(viewer: Viewer, id: string): Promise<boolean> {
  const deleted = await db
    .delete(schema.sleepLog)
    .where(owned(schema.sleepLog, viewer, id))
    .returning({ id: schema.sleepLog.id });
  return deleted.length > 0;
}

export async function listSleepLogs(
  viewer: Viewer,
  dates: { from?: null | string; to?: null | string }
): Promise<SleepLogRow[]> {
  const { from, to } = range(dates.from, dates.to, await viewerToday(viewer), 60);
  return db
    .select()
    .from(schema.sleepLog)
    .where(and(owned(schema.sleepLog, viewer), between(schema.sleepLog.wokeOn, from, to)))
    .orderBy(desc(schema.sleepLog.wokeOn), desc(schema.sleepLog.createdAt));
}

export async function lastSleep(viewer: Viewer): Promise<SleepLogRow | null> {
  const [row] = await db
    .select()
    .from(schema.sleepLog)
    .where(owned(schema.sleepLog, viewer))
    .orderBy(desc(schema.sleepLog.wokeOn), desc(schema.sleepLog.createdAt))
    .limit(1);
  return row ?? null;
}

/** Reads a Medida as typed ("72,5") into its integer unit, within what a body can be. */
export function measureValue(kind: MeasureKind, typed: string): number {
  const { scale, unit } = MEASURE_UNITS[kind];
  const value = parseDecimal(typed, scale);
  if (value === null) badInput(`A medida não é um número válido em ${unit} (ex.: 72,5).`);
  const [min, max] = MEASURE_LIMITS[kind];
  if (value < min || value > max) badInput('Confira a medida: o valor está fora do esperado.');
  return value;
}

export async function addMeasurement(
  viewer: Viewer,
  input: { kind: MeasureKind; measuredOn: string; value: string }
): Promise<MeasurementRow> {
  const [row] = await db
    .insert(schema.measurement)
    .values({
      createdById: viewer.userId,
      kind: input.kind,
      measuredOn: requiredDay(input.measuredOn),
      organizationId: viewer.organizationId,
      value: measureValue(input.kind, input.value),
    })
    .returning();
  return row!;
}

export async function deleteMeasurement(viewer: Viewer, id: string): Promise<boolean> {
  const deleted = await db
    .delete(schema.measurement)
    .where(owned(schema.measurement, viewer, id))
    .returning({ id: schema.measurement.id });
  return deleted.length > 0;
}

/** Oldest first, one kind or all. */
export function listMeasurements(
  viewer: Viewer,
  kind?: MeasureKind | null
): Promise<MeasurementRow[]> {
  return db
    .select()
    .from(schema.measurement)
    .where(
      and(owned(schema.measurement, viewer), kind ? eq(schema.measurement.kind, kind) : undefined)
    )
    .orderBy(asc(schema.measurement.measuredOn), asc(schema.measurement.createdAt));
}
