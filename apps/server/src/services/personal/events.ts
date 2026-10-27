import type { Viewer } from '@zapbots/auth';
import { db, schema, type EventRow } from '@zapbots/database';

import { badInput, notFound, owned } from '../../resolvers/guards';
import { day, repeat, text, time, title } from './clock';

/** An Evento as a form, the chat or a Proposal give it, not checked yet. */
export interface EventInput {
  endTime?: null | string;
  endsOn?: null | string;
  location?: null | string;
  notes?: null | string;
  /** Checked by `parseRepeat`. */
  repeat?: unknown;
  startTime?: null | string;
  startsOn: string;
  title: string;
}

/** The columns of a checked Evento. */
export function eventValues(input: EventInput) {
  const startsOn = day(input.startsOn, 'O dia');
  if (!startsOn) badInput('Escolha o dia do Evento.');
  const endsOn = day(input.endsOn, 'O último dia');
  const startTime = time(input.startTime, 'A hora de início');
  const endTime = time(input.endTime, 'A hora do fim');
  if (endsOn && endsOn < startsOn) badInput('O último dia vem antes do primeiro.');
  if (endTime && !startTime) badInput('Escolha a hora de início antes da hora do fim.');
  if (startTime && endTime && !endsOn && endTime < startTime)
    badInput('A hora do fim vem antes da hora de início.');
  return {
    endTime,
    endsOn: endsOn === startsOn ? null : endsOn,
    location: text(input.location, 'O local', 200),
    notes: text(input.notes, 'A nota', 10_000),
    repeat: repeat(input.repeat),
    startTime,
    startsOn,
    title: title(input.title),
  };
}

export async function findEvent(viewer: Viewer, id: string): Promise<EventRow> {
  const [row] = await db
    .select()
    .from(schema.event)
    .where(owned(schema.event, viewer, id));
  return row ?? notFound('Evento');
}

export async function createEvent(viewer: Viewer, input: EventInput): Promise<EventRow> {
  const [row] = await db
    .insert(schema.event)
    .values({
      ...eventValues(input),
      createdById: viewer.userId,
      organizationId: viewer.organizationId,
    })
    .returning();
  return row!;
}

/** Changes the Evento, and for a repeating one the whole series. */
export async function updateEvent(viewer: Viewer, id: string, input: EventInput) {
  await findEvent(viewer, id);
  const [row] = await db
    .update(schema.event)
    .set(eventValues(input))
    .where(owned(schema.event, viewer, id))
    .returning();
  return row!;
}

export async function deleteEvent(viewer: Viewer, id: string): Promise<boolean> {
  const deleted = await db
    .delete(schema.event)
    .where(owned(schema.event, viewer, id))
    .returning({ id: schema.event.id });
  return deleted.length > 0;
}
