import type { IsoDate } from '@zapbots/finance';

/** The calendar date of `instant` in `timeZone` (an IANA name); São Paulo if it is not one. */
export function dateIn(timeZone: string, instant = new Date()): IsoDate {
  try {
    // The `en-CA` locale writes dates as `YYYY-MM-DD`.
    return new Intl.DateTimeFormat('en-CA', { timeZone }).format(instant);
  } catch {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(instant);
  }
}

/** Whether `timeZone` is a zone this runtime knows, e.g. "America/Manaus". */
export function isTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-CA', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** A time of day as people type it ("9", "9h", "9:30", "09h30", "21:05") as "HH:MM", or null. */
export function parseTime(text: string): null | string {
  const match = /^\s*(\d{1,2})\s*(?:[:h]\s*(\d{2})?)?\s*(?:min)?\s*$/i.exec(text);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2] ?? 0);
  if (hours > 23 || minutes > 59) return null;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/** Whether `value` is a real `YYYY-MM-DD` date. */
export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}
