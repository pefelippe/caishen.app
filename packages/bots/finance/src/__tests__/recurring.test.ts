import { describe, expect, it } from 'vitest';

import { recurringDueInMonth } from '../recurring';

describe('recurringDueInMonth', () => {
  it('charges a monthly one every month, on its day', () => {
    const gym = { cycle: 'MONTHLY' as const, dueDay: 5 };
    expect(recurringDueInMonth(gym, '2026-11')).toBe('2026-11-05');
    expect(recurringDueInMonth(gym, '2027-01')).toBe('2027-01-05');
  });

  it('falls on the last day when the month is shorter', () => {
    expect(recurringDueInMonth({ cycle: 'MONTHLY', dueDay: 31 }, '2027-02')).toBe('2027-02-28');
  });

  it('charges a yearly one only in its month', () => {
    const insurance = { cycle: 'YEARLY' as const, dueDay: 5, dueMonth: 11 };
    expect(recurringDueInMonth(insurance, '2026-11')).toBe('2026-11-05');
    expect(recurringDueInMonth(insurance, '2026-12')).toBeNull();
  });

  it('starts on its start and stops at its cancellation', () => {
    const netflix = {
      cycle: 'MONTHLY' as const,
      dueDay: 10,
      endsOn: '2027-01-10',
      startsOn: '2026-10-15',
    };
    expect(recurringDueInMonth(netflix, '2026-10')).toBeNull();
    expect(recurringDueInMonth(netflix, '2026-11')).toBe('2026-11-10');
    expect(recurringDueInMonth(netflix, '2027-01')).toBeNull();
  });
});
