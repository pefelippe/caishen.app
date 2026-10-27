import { describe, expect, it } from 'vitest';

import { nextOccurrence, occurrences, parseRepeat } from '../recurrence';

describe('occurrences', () => {
  it('lists a daily series inside the range only', () => {
    expect(
      occurrences('2026-10-01', { every: 'DAY', interval: 2 }, '2026-10-04', '2026-10-09')
    ).toEqual(['2026-10-05', '2026-10-07', '2026-10-09']);
  });

  it('keeps the 31st through short months instead of drifting to the 28th', () => {
    expect(
      occurrences('2026-01-31', { every: 'MONTH', interval: 1 }, '2026-01-01', '2026-04-30')
    ).toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  });

  it('falls on the chosen weekdays every other week', () => {
    // 2026-10-05 is a Monday: Mondays and Wednesdays, every 2 weeks.
    const repeat = { every: 'WEEK' as const, interval: 2, weekdays: [1, 3] };
    expect(occurrences('2026-10-05', repeat, '2026-10-01', '2026-10-25')).toEqual([
      '2026-10-05',
      '2026-10-07',
      '2026-10-19',
      '2026-10-21',
    ]);
  });

  it('starts nothing before the series starts', () => {
    expect(
      occurrences('2026-10-10', { every: 'WEEK', interval: 1 }, '2026-10-01', '2026-10-20')
    ).toEqual(['2026-10-10', '2026-10-17']);
  });
});

describe('nextOccurrence', () => {
  it('moves a yearly date to the next year', () => {
    expect(nextOccurrence('2024-02-29', { every: 'YEAR', interval: 1 })).toBe('2025-02-28');
  });

  it('skips past a given day', () => {
    expect(nextOccurrence('2026-10-01', { every: 'WEEK', interval: 1 }, '2026-10-20')).toBe(
      '2026-10-22'
    );
  });

  it('finds the next quarter', () => {
    expect(nextOccurrence('2026-01-15', { every: 'MONTH', interval: 3 })).toBe('2026-04-15');
  });
});

describe('parseRepeat', () => {
  it('reads valid shapes and refuses the rest', () => {
    expect(parseRepeat({ every: 'WEEK', weekdays: [3, 1, 1, 9] })).toEqual({
      every: 'WEEK',
      interval: 1,
      weekdays: [1, 3],
    });
    expect(parseRepeat({ every: 'HOUR' })).toBeNull();
    expect(parseRepeat({ every: 'DAY', interval: 0 })).toBeNull();
  });
});
