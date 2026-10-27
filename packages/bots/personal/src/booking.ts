import { addDays, type IsoDate } from '@zapbots/finance';

/** Hours a booking link takes, on one weekday (0 Sunday to 6), as "HH:MM" on the owner's clock. */
export interface BookingWindow {
  end: string;
  start: string;
  weekday: number;
}

/** A span of time already taken, as instants. */
export interface Busy {
  end: Date;
  start: Date;
}

const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number) as [number, number];
  return hours * 60 + minutes;
};

const toTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

const parts = (instant: Date, timeZone: string) => {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
      minute: '2-digit',
      month: '2-digit',
      timeZone,
      year: 'numeric',
    })
      .formatToParts(instant)
      .map(part => [part.type, part.value])
  );
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    minutes: Number(values.hour) * 60 + Number(values.minute),
  };
};

/** The date and the "HH:MM" that `instant` shows on a clock in `timeZone`. */
export function wallClock(instant: Date, timeZone: string): { date: IsoDate; time: string } {
  const { date, minutes } = parts(instant, timeZone);
  return { date, time: toTime(minutes) };
}

/**
 * The instant a clock in `timeZone` shows `date` at `time`. In the hour a clock jumps forward the
 * time does not exist and comes out an hour later; in the hour it repeats, the first one.
 */
export function zonedInstant(date: IsoDate, time: string, timeZone: string): Date {
  const wanted = Date.parse(`${date}T${time}:00Z`);
  const shownAt = (at: number) => {
    const shown = parts(new Date(at), timeZone);
    return Date.parse(`${shown.date}T${toTime(shown.minutes)}:00Z`);
  };
  // The offset around `wanted`, then around the instant it gives: they differ only near a change.
  const first = wanted - (shownAt(wanted) - wanted);
  const second = wanted - (shownAt(first) - first);
  const exact = [first, second].filter(at => shownAt(at) === wanted);
  return new Date(exact.length ? Math.min(...exact) : Math.max(first, second));
}

/**
 * The starts of the free slots of a booking link: every `durationMinutes` inside each window, on
 * the owner's clock, from `from` to `to` (owner's dates), not before `notBefore` and not over
 * anything in `busy`.
 */
export function bookingSlots({
  busy,
  durationMinutes,
  from,
  notBefore,
  timeZone,
  to,
  windows,
}: {
  busy: Busy[];
  durationMinutes: number;
  from: IsoDate;
  notBefore: Date;
  timeZone: string;
  to: IsoDate;
  windows: BookingWindow[];
}): Date[] {
  const slots: Date[] = [];
  const length = durationMinutes * 60_000;
  for (let date = from; date <= to; date = addDays(date, 1)) {
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    for (const window of windows.filter(candidate => candidate.weekday === weekday)) {
      const end = toMinutes(window.end);
      for (
        let minute = toMinutes(window.start);
        minute + durationMinutes <= end;
        minute += durationMinutes
      ) {
        const start = zonedInstant(date, toTime(minute), timeZone);
        if (start < notBefore) continue;
        const finish = start.getTime() + length;
        const taken = busy.some(span => span.start.getTime() < finish && span.end > start);
        if (!taken) slots.push(start);
      }
    }
  }
  return slots.sort((a, b) => a.getTime() - b.getTime());
}

/** Checks a week of windows: real hours, start before end, at most one per weekday. */
export function windowsProblem(windows: BookingWindow[]): null | string {
  const seen = new Set<number>();
  for (const window of windows) {
    if (!Number.isInteger(window.weekday) || window.weekday < 0 || window.weekday > 6)
      return 'Dia da semana inválido.';
    if (seen.has(window.weekday)) return 'Só um horário por dia da semana.';
    seen.add(window.weekday);
    if (
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(window.start) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(window.end)
    )
      return 'Hora inválida.';
    if (window.start >= window.end) return 'O horário termina antes de começar.';
  }
  return null;
}
