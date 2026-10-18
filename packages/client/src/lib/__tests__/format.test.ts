import { describe, expect, it } from 'vitest';

import { formatCents, formatDate, formatPercent, parseCents, parsePercent } from '../format';

describe('parseCents', () => {
  it('reads amounts typed the Brazilian way and the plain way', () => {
    expect(parseCents('1.234,56')).toBe(123_456);
    expect(parseCents('R$ 1.000,00')).toBe(100_000);
    expect(parseCents('500,5')).toBe(50_050);
    expect(parseCents('1234.56')).toBe(123_456);
    expect(parseCents('80')).toBe(8_000);
  });

  it('rounds to the cent and gives null for nothing usable', () => {
    expect(parseCents('0,005')).toBe(1);
    expect(parseCents('')).toBeNull();
    expect(parseCents('   ')).toBeNull();
    expect(parseCents('abc')).toBeNull();
    expect(parseCents('R$')).toBeNull();
  });
});

describe('parsePercent', () => {
  it('turns "1,89" into a monthly fraction', () => {
    expect(parsePercent('1,89')).toBeCloseTo(0.0189, 10);
    expect(parsePercent('2.5')).toBeCloseTo(0.025, 10);
    expect(parsePercent('')).toBeNull();
    expect(parsePercent('x')).toBeNull();
  });
});

describe('formatting', () => {
  it('writes cents, ratios and dates for pt-BR, with a dash for nothing', () => {
    expect(formatCents(123_456)).toBe('R$ 1.234,56');
    expect(formatCents(null)).toBe('—');
    expect(formatPercent(0.0189)).toBe('1,89%');
    expect(formatPercent(undefined)).toBe('—');
    expect(formatDate('2026-10-17')).toBe('17/10/2026');
    expect(formatDate('2026-10-17T12:00:00Z')).toBe('17/10/2026');
    expect(formatDate(null)).toBe('—');
  });
});
