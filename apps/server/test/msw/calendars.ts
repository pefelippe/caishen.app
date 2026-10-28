import { http, HttpResponse, type HttpHandler } from 'msw';

/** Lines as calendar files have them, ending in CRLF. */
const ics = (...lines: string[]) => `${lines.join('\r\n')}\r\n`;

const SAO_PAULO = [
  'BEGIN:VTIMEZONE',
  'TZID:America/Sao_Paulo',
  'BEGIN:STANDARD',
  'DTSTART:19700101T000000',
  'TZOFFSETFROM:-0300',
  'TZOFFSETTO:-0300',
  'END:STANDARD',
  'END:VTIMEZONE',
];

/** A public iCloud calendar as Apple serves it: its own zone, a weekly class with one skipped and one moved. */
export const ICLOUD_URL = 'https://p52-caldav.icloud.com/published/2/MTIzNDU2Nzg5';
const ICLOUD = ics(
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:-//Apple Inc.//macOS 15.0//EN',
  'X-WR-CALNAME:Casa',
  ...SAO_PAULO,
  'BEGIN:VEVENT',
  'UID:dentista@icloud',
  'DTSTAMP:20261001T120000Z',
  'DTSTART;TZID=America/Sao_Paulo:20261110T100000',
  'DTEND;TZID=America/Sao_Paulo:20261110T110000',
  'SUMMARY:Dentista',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:ingles@icloud',
  'DTSTAMP:20261001T120000Z',
  'DTSTART;TZID=America/Sao_Paulo:20261103T190000',
  'DTEND;TZID=America/Sao_Paulo:20261103T200000',
  'RRULE:FREQ=WEEKLY;BYDAY=TU',
  'EXDATE;TZID=America/Sao_Paulo:20261117T190000',
  'SUMMARY:Inglês',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:ingles@icloud',
  'DTSTAMP:20261001T120000Z',
  'RECURRENCE-ID;TZID=America/Sao_Paulo:20261124T190000',
  'DTSTART;TZID=America/Sao_Paulo:20261124T200000',
  'DTEND;TZID=America/Sao_Paulo:20261124T210000',
  'SUMMARY:Inglês (remarcada)',
  'END:VEVENT',
  'END:VCALENDAR'
);

/** Google's secret address: times in UTC, an all-day holiday and a cancelled meeting. */
export const GOOGLE_URL =
  'https://calendar.google.com/calendar/ical/ana%40gmail.com/private-abc123/basic.ics';
const GOOGLE = ics(
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:-//Google Inc//Google Calendar 70.9054//EN',
  'BEGIN:VEVENT',
  'UID:reuniao@google.com',
  'DTSTAMP:20261001T120000Z',
  'DTSTART:20261111T130000Z',
  'DTEND:20261111T140000Z',
  'SUMMARY:Reunião\\, time',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:feriado@google.com',
  'DTSTAMP:20261001T120000Z',
  'DTSTART;VALUE=DATE:20261120',
  'DTEND;VALUE=DATE:20261121',
  'SUMMARY:Consciência Negra',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:cancelada@google.com',
  'DTSTAMP:20261001T120000Z',
  'DTSTART:20261112T150000Z',
  'DTEND:20261112T160000Z',
  'STATUS:CANCELLED',
  'SUMMARY:Cancelada',
  'END:VEVENT',
  'END:VCALENDAR'
);

/** Outlook's published calendar: a Windows zone name, described in the file. */
export const OUTLOOK_URL =
  'https://outlook.office365.com/owa/calendar/abc@empresa.com/def/calendar.ics';
const OUTLOOK = ics(
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:Microsoft Exchange Server 2010',
  'BEGIN:VTIMEZONE',
  'TZID:E. South America Standard Time',
  'BEGIN:STANDARD',
  'DTSTART:16010101T000000',
  'TZOFFSETFROM:-0300',
  'TZOFFSETTO:-0300',
  'END:STANDARD',
  'END:VTIMEZONE',
  'BEGIN:VEVENT',
  'UID:daily@outlook',
  'DTSTAMP:20261001T120000Z',
  'DTSTART;TZID=E. South America Standard Time:20261112T090000',
  'DTEND;TZID=E. South America Standard Time:20261112T093000',
  'SUMMARY:Daily',
  'END:VEVENT',
  'END:VCALENDAR'
);

export const NOT_A_CALENDAR_URL = 'https://example.com/pagina.html';
export const GONE_URL = 'https://calendar.google.com/calendar/ical/gone/basic.ics';

const calendar = (body: string) => () =>
  new HttpResponse(body, { headers: { 'Content-Type': 'text/calendar; charset=utf-8' } });

/** The three calendars, a page that is not one and a link that no longer exists. */
export const calendarHandlers: HttpHandler[] = [
  http.get(ICLOUD_URL, calendar(ICLOUD)),
  http.get(GOOGLE_URL, calendar(GOOGLE)),
  http.get(OUTLOOK_URL, calendar(OUTLOOK)),
  http.get(NOT_A_CALENDAR_URL, () => HttpResponse.html('<html><body>Olá</body></html>')),
  http.get(GONE_URL, () => new HttpResponse(null, { status: 404 })),
];
