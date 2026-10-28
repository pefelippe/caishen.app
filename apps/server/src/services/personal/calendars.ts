import type { Viewer } from '@zapbots/auth';
import { db, schema } from '@zapbots/database';
import { addDays, type IsoDate } from '@zapbots/finance';
import { isTimeZone, wallClock, zonedInstant } from '@zapbots/personal';
import { asc, eq } from 'drizzle-orm';
import ICAL from 'ical.js';

import { badInput, owned } from '../../resolvers/guards';
import { fetchOutside, FetchRefused } from '../safeFetch';
import { open, seal } from '../sealed';
import { text } from './clock';

export type CalendarSource = 'GOOGLE' | 'ICLOUD' | 'OTHER' | 'OUTLOOK';

/** Calendars a few years old weigh some hundreds of kB; past this it is not a calendar. */
const MAX_BYTES = 5 * 1024 * 1024;
/** How long a read calendar is kept before it is read again. */
const FRESH_MS = 15 * 60 * 1000;
/** At most this many dates of one repeating event are walked through. */
const MAX_STEPS = 5000;
/** At most this many calendars per Organization. */
const MAX_CALENDARS = 10;

/** One time of an outside event on the owner's clock. */
export interface ExternalOccurrence {
  calendarId: string;
  calendarName: string;
  date: IsoDate;
  /** Instants, for busy time; null for all day. */
  end: Date | null;
  endTime: null | string;
  start: Date | null;
  startTime: null | string;
  title: string;
  uid: string;
}

/** What people paste: webcal:// (iPhone, iCloud) and http:// are read as https://. */
export function calendarUrl(input: string): URL {
  const trimmed = input
    .trim()
    .replace(/^webcals?:\/\//i, 'https://')
    .replace(/^http:\/\//i, 'https://');
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    badInput('Cole o link do calendário, começando com https:// ou webcal://.');
  }
  if (url.protocol !== 'https:')
    badInput('Cole o link do calendário, começando com https:// ou webcal://.');
  return url;
}

export function sourceOf(host: string): CalendarSource {
  if (/(^|\.)icloud\.com$/i.test(host)) return 'ICLOUD';
  if (/(^|\.)google\.com$/i.test(host)) return 'GOOGLE';
  if (/(^|\.)(outlook\.com|office365\.com|office\.com|live\.com)$/i.test(host)) return 'OUTLOOK';
  return 'OTHER';
}

/** A calendar file read: its events, each repeating one with its exceptions. */
interface Parsed {
  events: ICAL.Event[];
}

/** Reads an .ics file; throws `FetchRefused` when it is not one. */
export function parseCalendar(file: string): Parsed {
  let root: ICAL.Component;
  try {
    root = new ICAL.Component(ICAL.parse(file) as unknown[]);
  } catch {
    throw new FetchRefused('O link não é de um calendário (.ics).');
  }
  if (root.name !== 'vcalendar') throw new FetchRefused('O link não é de um calendário (.ics).');
  // The zones the file describes, so its times can be read in them.
  for (const zone of root.getAllSubcomponents('vtimezone')) {
    const tzid = zone.getFirstPropertyValue('tzid');
    if (typeof tzid === 'string' && !ICAL.TimezoneService.has(tzid)) {
      ICAL.TimezoneService.register(zone);
    }
  }
  const masters = new Map<string, ICAL.Event>();
  const exceptions: ICAL.Event[] = [];
  const events: ICAL.Event[] = [];
  for (const component of root.getAllSubcomponents('vevent')) {
    const event = new ICAL.Event(component);
    if (event.isRecurrenceException()) exceptions.push(event);
    else {
      events.push(event);
      if (event.uid) masters.set(event.uid, event);
    }
  }
  for (const exception of exceptions) {
    const master = masters.get(exception.uid);
    if (master) master.relateException(exception);
    else events.push(exception);
  }
  return { events };
}

const pad = (value: number) => String(value).padStart(2, '0');
const dateOf = (time: ICAL.Time): IsoDate => `${time.year}-${pad(time.month)}-${pad(time.day)}`;
const hoursOf = (time: ICAL.Time) => `${pad(time.hour)}:${pad(time.minute)}`;

/**
 * The instant of a time from the file: in its own zone (an IANA name, or one the file describes),
 * in UTC, or, with no zone at all, on the owner's clock.
 */
function instantOf(time: ICAL.Time, fallbackZone: null | string, ownerZone: string): Date {
  const tzid = time.zone?.tzid && time.zone.tzid !== 'floating' ? time.zone.tzid : fallbackZone;
  if (tzid === 'UTC' || tzid === 'Z') return new Date(time.toUnixTime() * 1000);
  if (tzid && isTimeZone(tzid)) return zonedInstant(dateOf(time), hoursOf(time), tzid);
  if (tzid && ICAL.TimezoneService.has(tzid) && time.zone?.tzid === tzid) {
    return new Date(time.toUnixTime() * 1000);
  }
  return zonedInstant(dateOf(time), hoursOf(time), ownerZone);
}

const cancelled = (event: ICAL.Event) =>
  String(event.component.getFirstPropertyValue('status') ?? '').toUpperCase() === 'CANCELLED';

/** The times of the file's events from `from` to `to` (the owner's dates), on the owner's clock. */
export function occurrencesBetween(
  parsed: Parsed,
  calendar: { id: string; name: string },
  ownerZone: string,
  from: IsoDate,
  to: IsoDate
): ExternalOccurrence[] {
  const windowStart = zonedInstant(from, '00:00', ownerZone);
  const windowEnd = zonedInstant(addDays(to, 1), '00:00', ownerZone);
  const found: ExternalOccurrence[] = [];

  const add = (item: ICAL.Event, start: ICAL.Time, end: ICAL.Time | null, key: string) => {
    if (cancelled(item)) return;
    const zone =
      String(item.component.getFirstProperty('dtstart')?.getParameter('tzid') ?? '') || null;
    const base = {
      calendarId: calendar.id,
      calendarName: calendar.name,
      title: item.summary?.trim() || 'Sem título',
      uid: key,
    };
    if (start.isDate) {
      // All day: on each of its days; the end is the day after the last.
      const first = dateOf(start);
      const after = end && dateOf(end) > first ? dateOf(end) : addDays(first, 1);
      for (let date = first; date < after; date = addDays(date, 1)) {
        if (date >= from && date <= to) {
          found.push({ ...base, date, end: null, endTime: null, start: null, startTime: null });
        }
      }
      return;
    }
    const startsAt = instantOf(start, zone, ownerZone);
    const endsAt = end ? instantOf(end, zone, ownerZone) : new Date(startsAt.getTime() + 3_600_000);
    if (endsAt <= windowStart || startsAt >= windowEnd) return;
    const shown = wallClock(startsAt, ownerZone);
    const ends = wallClock(endsAt, ownerZone);
    if (shown.date < from || shown.date > to) return;
    found.push({
      ...base,
      date: shown.date,
      end: endsAt,
      endTime: ends.time === shown.time && ends.date === shown.date ? null : ends.time,
      start: startsAt,
      startTime: shown.time,
    });
  };

  // A day either side, so times in other zones near the edges are not lost.
  const before = new Date(windowStart.getTime() - 86_400_000);
  for (const event of parsed.events) {
    if (!event.startDate) continue;
    if (!event.isRecurring()) {
      add(event, event.startDate, event.endDate ?? null, event.uid ?? '');
      continue;
    }
    const iterator = event.iterator();
    for (
      let step = 0, next = iterator.next();
      next && step < MAX_STEPS;
      step++, next = iterator.next()
    ) {
      const details = event.getOccurrenceDetails(next);
      const zone =
        String(event.component.getFirstProperty('dtstart')?.getParameter('tzid') ?? '') || null;
      const at = details.startDate.isDate
        ? zonedInstant(dateOf(details.startDate), '00:00', ownerZone)
        : instantOf(details.startDate, zone, ownerZone);
      if (at.getTime() > windowEnd.getTime() + 86_400_000) break;
      if (at < before) continue;
      add(details.item, details.startDate, details.endDate, `${event.uid}:${next.toString()}`);
    }
  }
  return found;
}

/** Read calendars, kept a while per process: one read serves the Agenda, its days and the links. */
const cache = new Map<string, { at: number; parsed: Parsed; url: string }>();

async function readCalendar(
  row: typeof schema.externalCalendar.$inferSelect,
  { fresh = false } = {}
): Promise<Parsed> {
  const url = open(row.sealedUrl, 'calendar-url');
  const kept = cache.get(row.id);
  if (!fresh && kept && kept.url === url && Date.now() - kept.at < FRESH_MS) return kept.parsed;
  try {
    const parsed = parseCalendar(
      await fetchOutside(new URL(url), { accept: 'text/calendar, */*', maxBytes: MAX_BYTES })
    );
    cache.set(row.id, { at: Date.now(), parsed, url });
    await db
      .update(schema.externalCalendar)
      .set({ error: null, lastReadAt: new Date() })
      .where(eq(schema.externalCalendar.id, row.id));
    return parsed;
  } catch (error) {
    const message =
      error instanceof FetchRefused ? error.message : 'Não consegui ler o calendário.';
    if (row.error !== message) {
      await db
        .update(schema.externalCalendar)
        .set({ error: message })
        .where(eq(schema.externalCalendar.id, row.id));
    }
    // A calendar read before keeps showing while its link fails.
    if (kept && kept.url === url) return kept.parsed;
    throw error;
  }
}

const shown = (row: typeof schema.externalCalendar.$inferSelect) => ({
  error: row.error,
  host: row.host,
  id: row.id,
  lastReadAt: row.lastReadAt,
  name: row.name,
  source: sourceOf(row.host),
});

export async function listExternalCalendars(viewer: Viewer) {
  const rows = await db
    .select()
    .from(schema.externalCalendar)
    .where(owned(schema.externalCalendar, viewer))
    .orderBy(asc(schema.externalCalendar.createdAt));
  return rows.map(shown);
}

/** Adds a calendar by its link, once it is read: a link that is not a calendar is refused. */
export async function addExternalCalendar(viewer: Viewer, name: string, link: string) {
  const url = calendarUrl(link);
  const existing = await listExternalCalendars(viewer);
  if (existing.length >= MAX_CALENDARS) badInput(`Dá para ligar até ${MAX_CALENDARS} agendas.`);
  let parsed: Parsed;
  try {
    parsed = parseCalendar(
      await fetchOutside(url, { accept: 'text/calendar, */*', maxBytes: MAX_BYTES })
    );
  } catch (error) {
    if (error instanceof FetchRefused) badInput(error.message);
    throw error;
  }
  const [row] = await db
    .insert(schema.externalCalendar)
    .values({
      createdById: viewer.userId,
      host: url.hostname,
      lastReadAt: new Date(),
      name: text(name, 'O nome', 60) || defaultName(sourceOf(url.hostname)),
      organizationId: viewer.organizationId,
      sealedUrl: seal(url.toString(), 'calendar-url'),
    })
    .returning();
  cache.set(row!.id, { at: Date.now(), parsed, url: url.toString() });
  return shown(row!);
}

const defaultName = (source: CalendarSource) =>
  ({ GOOGLE: 'Google Agenda', ICLOUD: 'iCloud', OTHER: 'Agenda', OUTLOOK: 'Outlook' })[source];

async function findCalendar(viewer: Viewer, id: string) {
  const [row] = await db
    .select()
    .from(schema.externalCalendar)
    .where(owned(schema.externalCalendar, viewer, id));
  if (!row) badInput('Essa agenda não existe mais.');
  return row;
}

/** Reads it again now, past the cache; a failure is kept on it for the page to show. */
export async function refreshExternalCalendar(viewer: Viewer, id: string) {
  const row = await findCalendar(viewer, id);
  await readCalendar(row, { fresh: true }).catch(() => null);
  return shown(await findCalendar(viewer, id));
}

export async function removeExternalCalendar(viewer: Viewer, id: string) {
  await findCalendar(viewer, id);
  await db.delete(schema.externalCalendar).where(owned(schema.externalCalendar, viewer, id));
  cache.delete(id);
  return true;
}

/**
 * The outside calendars' events from `from` to `to` on the owner's clock. A calendar that cannot
 * be read is left out (its error stays on it); the rest still show.
 */
export async function externalOccurrences(
  organizationId: string,
  ownerZone: string,
  from: IsoDate,
  to: IsoDate
): Promise<ExternalOccurrence[]> {
  const rows = await db
    .select()
    .from(schema.externalCalendar)
    .where(eq(schema.externalCalendar.organizationId, organizationId));
  const lists = await Promise.all(
    rows.map(async row => {
      try {
        return occurrencesBetween(await readCalendar(row), row, ownerZone, from, to);
      } catch {
        return [];
      }
    })
  );
  return lists.flat();
}
