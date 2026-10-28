import { createHash, randomBytes } from 'node:crypto';

import type { Viewer } from '@zapbots/auth';
import { db, schema } from '@zapbots/database';
import { addDays } from '@zapbots/finance';
import { icsCalendar, type IcsEntry } from '@zapbots/personal';
import { and, eq } from 'drizzle-orm';

import { agenda, MAX_AGENDA_DAYS } from './agenda';
import { viewerTimeZone, viewerToday } from './clock';

/** How far the calendar link reaches: a month back and a year ahead. */
const DAYS_BACK = 31;
const DAYS_AHEAD = 365;

const brl = new Intl.NumberFormat('pt-BR', { currency: 'BRL', style: 'currency' });

const pathOf = (token: string) => `/api/calendar/${token}.ics`;

const shown = (row: { createdAt: Date; token: string }) => ({
  createdAt: row.createdAt,
  path: pathOf(row.token),
});

/** The Viewer's calendar link, or null while they have none. */
export async function calendarFeed(viewer: Viewer) {
  const [row] = await db
    .select()
    .from(schema.calendarFeed)
    .where(eq(schema.calendarFeed.userId, viewer.userId));
  return row ? shown(row) : null;
}

/** On: a new secret, so a link that leaked stops working. Off: no link at all. */
export async function setCalendarFeed(viewer: Viewer, on: boolean) {
  if (!on) {
    await db.delete(schema.calendarFeed).where(eq(schema.calendarFeed.userId, viewer.userId));
    return null;
  }
  const values = {
    createdAt: new Date(),
    organizationId: viewer.organizationId,
    token: randomBytes(24).toString('base64url'),
    userId: viewer.userId,
  };
  const [row] = await db
    .insert(schema.calendarFeed)
    .values(values)
    .onConflictDoUpdate({
      set: { createdAt: values.createdAt, token: values.token },
      target: schema.calendarFeed.userId,
    })
    .returning();
  return shown(row!);
}

/** Who a calendar link belongs to, as a Viewer of their Organization; null for an unknown one. */
async function feedViewer(token: string): Promise<null | Viewer> {
  if (!/^[\w-]{16,64}$/.test(token)) return null;
  const [row] = await db
    .select({
      organizationId: schema.calendarFeed.organizationId,
      role: schema.member.role,
      userId: schema.calendarFeed.userId,
    })
    .from(schema.calendarFeed)
    .innerJoin(
      schema.member,
      and(
        eq(schema.member.userId, schema.calendarFeed.userId),
        eq(schema.member.organizationId, schema.calendarFeed.organizationId)
      )
    )
    .where(eq(schema.calendarFeed.token, token));
  return row ?? null;
}

/**
 * The Agenda behind a calendar link as an `.ics` file: Eventos, Tarefas with a day and what falls
 * due in Finanças, a month back and a year ahead. Null for a link that does not exist (any more).
 */
export async function calendarFeedFile(token: string): Promise<null | string> {
  const viewer = await feedViewer(token);
  if (!viewer) return null;
  const [timeZone, today] = await Promise.all([viewerTimeZone(viewer), viewerToday(viewer)]);
  const origin = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';

  const entries: IcsEntry[] = [];
  const last = addDays(today, DAYS_AHEAD);
  // The Agenda reads at most three months at once.
  for (let from = addDays(today, -DAYS_BACK); from <= last; from = addDays(from, MAX_AGENDA_DAYS)) {
    const to =
      addDays(from, MAX_AGENDA_DAYS - 1) < last ? addDays(from, MAX_AGENDA_DAYS - 1) : last;
    for (const item of await agenda(viewer, from, to)) {
      // What comes from the User's other calendars is already there.
      if (item.kind === 'EXTERNAL') continue;
      const uid = createHash('sha256')
        .update(`${item.kind}:${item.id}:${item.date}`)
        .digest('hex')
        .slice(0, 32);
      entries.push({
        date: item.date,
        description:
          item.kind === 'DUE'
            ? `Vence hoje${item.amountCents === null ? '' : `: ${brl.format(item.amountCents / 100)}`}.`
            : item.kind === 'TASK'
              ? item.done
                ? 'Tarefa feita.'
                : 'Tarefa com prazo para hoje.'
              : undefined,
        endTime: item.endTime,
        startTime: item.startTime,
        title:
          item.kind === 'DUE'
            ? `Vence: ${item.title}`
            : item.kind === 'TASK' && item.done
              ? `✓ ${item.title}`
              : item.title,
        uid: `${uid}@caishen`,
        url: `${origin}${item.link}`,
      });
    }
  }
  return icsCalendar({ entries, name: 'Caishen', timeZone });
}
