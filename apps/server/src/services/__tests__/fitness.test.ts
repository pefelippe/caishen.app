import { describe, expect, it } from 'vitest';

import { weekRange } from '../fitness';

describe('weekRange', () => {
  it('runs from Monday to Sunday', () => {
    // 2026-10-14 is a Wednesday.
    expect(weekRange('2026-10-14')).toEqual({ weekEnd: '2026-10-18', weekStart: '2026-10-12' });
  });

  it('keeps a Monday as the first day', () => {
    expect(weekRange('2026-10-12').weekStart).toBe('2026-10-12');
  });

  it('puts a Sunday at the end of its week, not the start of the next', () => {
    expect(weekRange('2026-10-11')).toEqual({ weekEnd: '2026-10-11', weekStart: '2026-10-05' });
  });

  it('crosses month and year boundaries', () => {
    expect(weekRange('2027-01-01')).toEqual({ weekEnd: '2027-01-03', weekStart: '2026-12-28' });
  });
});
