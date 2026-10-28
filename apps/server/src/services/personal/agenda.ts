import type { Viewer } from '@zapbots/auth';
import { db, schema } from '@zapbots/database';
import { addDays } from '@zapbots/finance';
import { occurrences } from '@zapbots/personal';
import { and, between, gte, isNotNull, lte, or, sql } from 'drizzle-orm';

import { badInput, owned } from '../../resolvers/guards';
import { duesBetween } from '../obligations';
import { viewerHolder } from '../viewerHolder';
import { externalOccurrences } from './calendars';
import { day, viewerTimeZone } from './clock';

export type AgendaKind = 'DUE' | 'EVENT' | 'EXTERNAL' | 'TASK';

/** One line of the Agenda on one day: an Evento, a Tarefa's deadline or a bill from the Caishen. */
export interface AgendaItem {
  amountCents: null | number;
  /** The day it is on. */
  date: string;
  done: boolean | null;
  endTime: null | string;
  id: string;
  kind: AgendaKind;
  /** Where it opens: a Tarefa or Evento by id on its page; a bill on Gastos. */
  link: string;
  /** For an event from an outside calendar, that calendar's name. */
  source: null | string;
  startTime: null | string;
  title: string;
}

/** The longest window the Agenda reads at once: a month view with the weeks around it. */
export const MAX_AGENDA_DAYS = 92;

const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

/**
 * Everything on the Viewer's days from `from` to `to`, both included: Eventos (repeating ones on
 * each date of their series, those over several days on each day), Tarefas due (done ones too)
 * what falls due in Finanças, which only links to its screen, and the events of the calendars kept
 * elsewhere (`calendars.ts`). By day, then all day before
 * the hours.
 */
export async function agenda(viewer: Viewer, from: string, to: string): Promise<AgendaItem[]> {
  if (!day(from) || !day(to) || to < from) badInput('O período não é válido.');
  if (daysBetween(from, to) > MAX_AGENDA_DAYS) badInput('A Agenda lê até três meses de cada vez.');
  const items: AgendaItem[] = [];

  const events = await db
    .select()
    .from(schema.event)
    .where(
      and(
        owned(schema.event, viewer),
        lte(schema.event.startsOn, to),
        or(
          isNotNull(schema.event.repeat),
          gte(sql`coalesce(${schema.event.endsOn}, ${schema.event.startsOn})`, from)
        )
      )
    );
  for (const event of events) {
    const base = {
      amountCents: null,
      done: null,
      endTime: event.endTime,
      id: event.id,
      kind: 'EVENT' as const,
      link: `/personal/calendar?e=${event.id}`,
      source: null,
      startTime: event.startTime,
      title: event.title,
    };
    const dates = event.repeat
      ? occurrences(event.startsOn, event.repeat, from, to)
      : Array.from(
          { length: daysBetween(event.startsOn, event.endsOn ?? event.startsOn) + 1 },
          (_, index) => addDays(event.startsOn, index)
        ).filter(date => date >= from && date <= to);
    for (const date of dates) items.push({ ...base, date });
  }

  const tasks = await db
    .select()
    .from(schema.task)
    .where(and(owned(schema.task, viewer), between(schema.task.dueOn, from, to)));
  for (const task of tasks) {
    items.push({
      amountCents: null,
      date: task.dueOn!,
      done: Boolean(task.doneAt),
      endTime: null,
      id: task.id,
      kind: 'TASK',
      link: `/personal/tasks?t=${task.id}`,
      source: null,
      startTime: task.dueTime,
      title: task.title,
    });
  }

  const holder = await viewerHolder(viewer);
  for (const due of await duesBetween(holder.id, from, to)) {
    items.push({
      amountCents: due.amountCents,
      date: due.dueDate,
      done: null,
      endTime: null,
      id: `due:${due.dueDate}:${due.label}`,
      kind: 'DUE',
      link: '/caishen/fixed',
      source: null,
      startTime: null,
      title: due.label,
    });
  }

  const zone = await viewerTimeZone(viewer);
  for (const occurrence of await externalOccurrences(viewer.organizationId, zone, from, to)) {
    items.push({
      amountCents: null,
      date: occurrence.date,
      done: null,
      endTime: occurrence.endTime,
      id: `external:${occurrence.calendarId}:${occurrence.uid}:${occurrence.date}`,
      kind: 'EXTERNAL',
      link: '/integrations#calendars',
      source: occurrence.calendarName,
      startTime: occurrence.startTime,
      title: occurrence.title,
    });
  }

  return items.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      (a.startTime ?? '').localeCompare(b.startTime ?? '') ||
      a.title.localeCompare(b.title, 'pt-BR')
  );
}
