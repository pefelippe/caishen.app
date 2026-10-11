import { describe, expect, it } from 'vitest';

import { addMonths, dateInMonth, dateOf } from '../dates';

describe('dateOf', () => {
  it('keeps the Brazilian day late in the evening, when UTC is already tomorrow', () => {
    // 22:30 in São Paulo (UTC-3) on the 11th is 01:30 UTC on the 12th.
    expect(dateOf(new Date('2026-10-12T01:30:00Z'))).toBe('2026-10-11');
    expect(dateOf(new Date('2026-10-12T03:00:00Z'))).toBe('2026-10-12');
  });
});

describe('month arithmetic', () => {
  it('clamps to the last day of shorter months', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonths('2026-03-15', -3)).toBe('2025-12-15');
    expect(dateInMonth('2028-02', 31)).toBe('2028-02-29');
  });
});
