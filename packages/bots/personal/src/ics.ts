import { addDays, type IsoDate } from '@zapbots/finance';

import { zonedInstant } from './booking';

/** One line of a calendar file: all day (no `startTime`) or at a time on the owner's clock. */
export interface IcsEntry {
  date: IsoDate;
  description?: string;
  /** "HH:MM"; with no end a timed entry lasts an hour. */
  endTime: null | string;
  startTime: null | string;
  title: string;
  /** Unique and stable across reads, so calendars update the entry rather than add another. */
  uid: string;
  url?: string;
}

/** Text as RFC 5545 wants it: backslashes, commas, semicolons and line breaks escaped. */
const escape = (text: string) =>
  text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Lines longer than 75 bytes go on, each piece after a break and a space. */
function fold(line: string): string {
  const bytes = new TextEncoder();
  if (bytes.encode(line).length <= 75) return line;
  const pieces: string[] = [];
  let piece = '';
  for (const char of line) {
    // The first piece takes 75 bytes; the rest 74, after their leading space.
    if (bytes.encode(piece + char).length > (pieces.length ? 74 : 75)) {
      pieces.push(piece);
      piece = '';
    }
    piece += char;
  }
  pieces.push(piece);
  return pieces.join('\r\n ');
}

const compactDate = (date: IsoDate) => date.replace(/-/g, '');
const utc = (instant: Date) =>
  instant
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');

/**
 * A calendar file (iCalendar, `.ics`) others subscribe to: the entries' times are written in UTC,
 * worked out from the owner's `timeZone`, so no calendar has to know the zone.
 */
export function icsCalendar({
  entries,
  name,
  now = new Date(),
  timeZone,
}: {
  entries: IcsEntry[];
  name: string;
  now?: Date;
  timeZone: string;
}): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Caishen//Agenda//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escape(name)}`,
    `X-WR-TIMEZONE:${timeZone}`,
    // Calendars that honour it read the link again every hour.
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    'X-PUBLISHED-TTL:PT1H',
  ];
  for (const entry of entries) {
    lines.push('BEGIN:VEVENT', `UID:${entry.uid}`, `DTSTAMP:${utc(now)}`);
    if (entry.startTime) {
      const start = zonedInstant(entry.date, entry.startTime, timeZone);
      // An end before the start runs into the next day.
      const end = entry.endTime
        ? zonedInstant(
            entry.endTime > entry.startTime ? entry.date : addDays(entry.date, 1),
            entry.endTime,
            timeZone
          )
        : new Date(start.getTime() + 60 * 60 * 1000);
      lines.push(`DTSTART:${utc(start)}`, `DTEND:${utc(end)}`);
    } else {
      lines.push(
        `DTSTART;VALUE=DATE:${compactDate(entry.date)}`,
        `DTEND;VALUE=DATE:${compactDate(addDays(entry.date, 1))}`,
        'TRANSP:TRANSPARENT'
      );
    }
    lines.push(`SUMMARY:${escape(entry.title)}`);
    if (entry.description) lines.push(`DESCRIPTION:${escape(entry.description)}`);
    if (entry.url) lines.push(`URL:${entry.url}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return `${lines.map(fold).join('\r\n')}\r\n`;
}
