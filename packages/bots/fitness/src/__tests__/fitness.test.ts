import { describe, expect, it } from 'vitest';

import {
  averageSleep,
  hoursLabel,
  kcalOfMacros,
  measureTrend,
  percentOfTarget,
  plansOn,
  sleepMinutes,
  totalMacros,
} from '../fitness';
import { formatDecimal, formatMeasure, parseDecimal } from '../units';

describe('parseDecimal', () => {
  it('reads what people type without floats', () => {
    expect(parseDecimal('72,5', 3)).toBe(72_500);
    expect(parseDecimal('72.55', 3)).toBe(72_550);
    expect(parseDecimal('80', 1)).toBe(800);
    expect(parseDecimal(' 0,1 ', 1)).toBe(1);
    expect(parseDecimal('72,', 1)).toBe(720);
  });

  it('refuses what is not a number or too precise', () => {
    expect(parseDecimal('', 1)).toBeNull();
    expect(parseDecimal('-3', 1)).toBeNull();
    expect(parseDecimal('1,23', 1)).toBeNull();
    expect(parseDecimal('abc', 1)).toBeNull();
  });
});

describe('formatting', () => {
  it('writes Medidas in their unit', () => {
    expect(formatMeasure('WEIGHT', 72_500)).toBe('72,5 kg');
    expect(formatMeasure('WEIGHT', 72_460)).toBe('72,5 kg');
    expect(formatMeasure('WAIST', 815)).toBe('81,5 cm');
    expect(formatMeasure('BODY_FAT', 182)).toBe('18,2 %');
    expect(formatDecimal(1_500, 3, 'en-US')).toBe('1.5');
  });
});

describe('sleep', () => {
  it('crosses midnight', () => {
    expect(sleepMinutes('23:30', '07:00')).toBe(450);
    expect(sleepMinutes('01:00', '08:15')).toBe(435);
    expect(sleepMinutes('14:00', '14:30')).toBe(30);
    expect(hoursLabel(450)).toBe('7h30');
    expect(hoursLabel(65)).toBe('1h05');
  });

  it('averages nights', () => {
    expect(averageSleep([])).toBeNull();
    expect(
      averageSleep([
        { bedTime: '23:00', wakeTime: '07:00' },
        { bedTime: '00:00', wakeTime: '07:00' },
      ])
    ).toBe(450);
  });
});

describe('macros', () => {
  it('adds Refeições and compares with the targets', () => {
    const day = totalMacros([
      { carbsG: 50, fatG: 10, kcal: 400, proteinG: 30 },
      { carbsG: 20, fatG: 5, kcal: 200, proteinG: 25 },
    ]);
    expect(day).toEqual({ carbsG: 70, fatG: 15, kcal: 600, proteinG: 55 });
    expect(kcalOfMacros(day)).toBe(4 * 55 + 4 * 70 + 9 * 15);
    expect(percentOfTarget(600, 2000)).toBe(30);
    expect(percentOfTarget(2200, 2000)).toBe(110);
    expect(percentOfTarget(600, null)).toBeNull();
  });
});

describe('measureTrend', () => {
  const points = [
    { kind: 'WEIGHT' as const, measuredOn: '2026-08-01', value: 80_000 },
    { kind: 'WEIGHT' as const, measuredOn: '2026-09-20', value: 78_000 },
    { kind: 'WEIGHT' as const, measuredOn: '2026-10-25', value: 77_000 },
    { kind: 'WEIGHT' as const, measuredOn: '2026-10-10', value: 77_500 },
    { kind: 'WAIST' as const, measuredOn: '2026-10-25', value: 850 },
  ];

  it('compares the last with the newest a month older', () => {
    expect(measureTrend(points, 'WEIGHT')).toEqual({ change: -1_000, latest: points[2] });
  });

  it('falls back on the oldest, and has no change alone', () => {
    expect(measureTrend(points, 'WEIGHT', 365)?.change).toBe(-3_000);
    expect(measureTrend(points, 'WAIST')?.change).toBeNull();
    expect(measureTrend(points, 'HIP')).toBeNull();
  });
});

describe('plansOn', () => {
  it('picks the Fichas of a weekday', () => {
    const plans = [
      { name: 'A', weekdays: [1, 3] },
      { name: 'B', weekdays: [2, 4] },
    ];
    expect(plansOn(plans, 3).map(plan => plan.name)).toEqual(['A']);
    expect(plansOn(plans, 0)).toEqual([]);
  });
});
