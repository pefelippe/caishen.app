import { describe, expect, it } from 'vitest';

import { parseMoney, parsePercent } from '../money';

describe('parseMoney', () => {
  it('reads the ways an amount is written in Brazil into whole cents', () => {
    expect(parseMoney('R$ 1.234,56')).toBe(123456);
    expect(parseMoney('20000,00')).toBe(2000000);
    expect(parseMoney('25.000')).toBe(2500000);
    expect(parseMoney('1234.56')).toBe(123456);
    expect(parseMoney(2500)).toBe(250000);
    expect(parseMoney('0,1')).toBe(10);
  });

  it('rounds past the cent without floating-point drift', () => {
    expect(parseMoney('0,105')).toBe(11);
    expect(parseMoney(1.005)).toBe(101);
  });

  it('refuses what is no amount', () => {
    expect(parseMoney('')).toBeNull();
    expect(parseMoney('vinte mil')).toBeNull();
    expect(parseMoney('-100')).toBeNull();
    expect(parseMoney('1,2,3')).toBeNull();
  });
});

describe('parsePercent', () => {
  it('reads a percentage into a fraction', () => {
    expect(parsePercent('1,89')?.toString()).toBe('0.0189');
    expect(parsePercent('2.5%')?.toString()).toBe('0.025');
    expect(parsePercent(3)?.toString()).toBe('0.03');
    expect(parsePercent('três')).toBeNull();
  });
});
