import { describe, expect, it } from 'vitest';

import { bookingSlots, wallClock, windowsProblem, zonedInstant } from '../booking';

const iso = (dates: Date[]) => dates.map(date => date.toISOString());

describe('zonedInstant', () => {
  it('reads a clock in São Paulo (UTC-3)', () => {
    expect(zonedInstant('2026-11-10', '09:00', 'America/Sao_Paulo').toISOString()).toBe(
      '2026-11-10T12:00:00.000Z'
    );
  });

  it('follows daylight saving in New York', () => {
    expect(zonedInstant('2026-07-01', '09:00', 'America/New_York').toISOString()).toBe(
      '2026-07-01T13:00:00.000Z'
    );
    expect(zonedInstant('2026-12-01', '09:00', 'America/New_York').toISOString()).toBe(
      '2026-12-01T14:00:00.000Z'
    );
    // 02:30 does not exist on 2026-03-08 in New York: it comes out an hour later.
    expect(
      wallClock(zonedInstant('2026-03-08', '02:30', 'America/New_York'), 'America/New_York')
    ).toEqual({
      date: '2026-03-08',
      time: '03:30',
    });
  });
});

describe('bookingSlots', () => {
  const windows = [{ end: '11:00', start: '09:00', weekday: 2 }]; // Tuesdays 9 to 11.

  it('cuts the windows into slots, leaving out the busy ones and those too soon', () => {
    const slots = bookingSlots({
      busy: [{ end: new Date('2026-11-10T13:15:00Z'), start: new Date('2026-11-10T12:45:00Z') }],
      durationMinutes: 30,
      from: '2026-11-09',
      notBefore: new Date('2026-11-10T12:00:00Z'),
      timeZone: 'America/Sao_Paulo',
      to: '2026-11-17',
      windows,
    });
    // Busy 09:45–10:15 takes 09:30 and 10:00 on the 10th.
    expect(iso(slots)).toEqual([
      '2026-11-10T12:00:00.000Z',
      '2026-11-10T13:30:00.000Z',
      '2026-11-17T12:00:00.000Z',
      '2026-11-17T12:30:00.000Z',
      '2026-11-17T13:00:00.000Z',
      '2026-11-17T13:30:00.000Z',
    ]);
  });

  it('fits only whole slots in a window', () => {
    const slots = bookingSlots({
      busy: [],
      durationMinutes: 45,
      from: '2026-11-10',
      notBefore: new Date(0),
      timeZone: 'America/Sao_Paulo',
      to: '2026-11-10',
      windows,
    });
    expect(slots.map(slot => wallClock(slot, 'America/Sao_Paulo').time)).toEqual([
      '09:00',
      '09:45',
    ]);
  });
});

describe('windowsProblem', () => {
  it('refuses broken weeks', () => {
    expect(windowsProblem(windowsOk())).toBeNull();
    expect(windowsProblem([{ end: '09:00', start: '10:00', weekday: 1 }])).not.toBeNull();
    expect(
      windowsProblem([...windowsOk(), { end: '12:00', start: '11:00', weekday: 1 }])
    ).not.toBeNull();
    expect(windowsProblem([{ end: '25:00', start: '10:00', weekday: 1 }])).not.toBeNull();
  });
});

function windowsOk() {
  return [
    { end: '18:00', start: '09:00', weekday: 1 },
    { end: '12:00', start: '09:00', weekday: 5 },
  ];
}
