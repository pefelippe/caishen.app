import { describe, expect, it } from 'vitest';

import { dateIn, isIsoDate, isTimeZone, parseTime } from '../clock';

describe('dateIn', () => {
  it("follows the User's zone across midnight", () => {
    const instant = new Date('2026-10-12T02:30:00Z');
    expect(dateIn('America/Sao_Paulo', instant)).toBe('2026-10-11');
    expect(dateIn('Europe/Lisbon', instant)).toBe('2026-10-12');
    expect(dateIn('Nowhere/Else', instant)).toBe('2026-10-11');
  });

  it('knows real zones only', () => {
    expect(isTimeZone('America/Manaus')).toBe(true);
    expect(isTimeZone('Nowhere/Else')).toBe(false);
  });
});

describe('parseTime', () => {
  it('reads times as people type them', () => {
    expect(parseTime('9')).toBe('09:00');
    expect(parseTime('9h')).toBe('09:00');
    expect(parseTime('09h30')).toBe('09:30');
    expect(parseTime('21:05')).toBe('21:05');
    expect(parseTime('25:00')).toBeNull();
    expect(parseTime('meio-dia')).toBeNull();
  });
});

describe('isIsoDate', () => {
  it('refuses impossible dates', () => {
    expect(isIsoDate('2026-02-28')).toBe(true);
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('28/02/2026')).toBe(false);
  });
});
