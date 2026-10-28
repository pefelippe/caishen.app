import { describe, expect, it } from 'vitest';

import { readHealthPayload, workoutTitle, type WallClock } from '../health';

/** São Paulo's clock, three hours behind UTC. */
const wall: WallClock = instant => {
  const shifted = new Date(instant.getTime() - 3 * 3_600_000).toISOString();
  return { date: shifted.slice(0, 10), time: shifted.slice(11, 16) };
};

describe('readHealthPayload', () => {
  it('reads Health Auto Export (Apple Health)', () => {
    const batch = readHealthPayload(
      {
        data: {
          metrics: [
            {
              data: [
                { date: '2026-10-27 00:00:00 -0300', qty: 8421 },
                { date: '2026-10-28 00:00:00 -0300', qty: 1200.4 },
              ],
              name: 'step_count',
              units: 'count',
            },
            {
              data: [
                { date: '2026-10-28 07:00:00 -0300', qty: 72.45 },
                { date: '2026-10-28 08:00:00 -0300', qty: 72.4 },
              ],
              name: 'weight_body_mass',
              units: 'kg',
            },
            {
              data: [{ date: '2026-10-27 07:00:00 -0300', qty: 160 }],
              name: 'body_mass',
              units: 'lb',
            },
            {
              data: [{ date: '2026-10-28 07:00:00 -0300', qty: 18.5 }],
              name: 'body_fat_percentage',
              units: '%',
            },
            {
              data: [
                {
                  date: '2026-10-28',
                  sleepEnd: '2026-10-28 06:30:00 -0300',
                  sleepStart: '2026-10-27 23:10:00 -0300',
                  totalSleep: 7.3,
                },
              ],
              name: 'sleep_analysis',
              units: 'hr',
            },
            { data: [{ date: '2026-10-28 00:00:00 -0300', qty: 61 }], name: 'heart_rate' },
          ],
          workouts: [
            {
              activeEnergyBurned: { qty: 350.6, units: 'kcal' },
              distance: { qty: 3.1, units: 'mi' },
              duration: 1800,
              end: '2026-10-28 07:30:00 -0300',
              id: 'ABC-1',
              name: 'Outdoor Run',
              start: '2026-10-28 07:00:00 -0300',
            },
          ],
        },
      },
      wall
    );
    expect(batch.steps).toEqual([
      { count: 8421, date: '2026-10-27' },
      { count: 1200, date: '2026-10-28' },
    ]);
    // The last weight of a day wins; pounds become grams.
    expect(batch.weights).toEqual([
      { date: '2026-10-28', grams: 72_400 },
      { date: '2026-10-27', grams: 72_575 },
    ]);
    expect(batch.bodyFat).toEqual([{ date: '2026-10-28', tenths: 185 }]);
    expect(batch.sleeps).toEqual([{ bedTime: '23:10', wakeTime: '06:30', wokeOn: '2026-10-28' }]);
    expect(batch.workouts).toEqual([
      {
        distanceMeters: 4989,
        doneOn: '2026-10-28',
        durationMinutes: 30,
        kcal: 351,
        key: 'ABC-1',
        title: 'Corrida',
      },
    ]);
  });

  it('reads HC Webhook (Health Connect, Samsung Health)', () => {
    const batch = readHealthPayload(
      {
        steps: [
          { count: 3000, end_time: '2026-10-28T12:00:00Z', start_time: '2026-10-28T03:00:00Z' },
          { count: 2500, end_time: '2026-10-28T18:00:00Z', start_time: '2026-10-28T12:00:00Z' },
        ],
        timezone: 'UTC',
        weight: [{ kilograms: 80.2, time: '2026-10-28T10:00:00Z' }],
        body_fat: [{ percentage: 0.21, time: '2026-10-28T10:00:00Z' }],
        sleep: [
          {
            duration_seconds: 27_000,
            session_end_time: '2026-10-28T09:30:00Z',
            stages: [{ start_time: '2026-10-28T02:00:00Z', end_time: '2026-10-28T03:00:00Z' }],
          },
        ],
        exercise: [
          {
            distance_meters: 21_000,
            duration_seconds: 3600,
            end_time: '2026-10-28T22:00:00Z',
            start_time: '2026-10-28T21:00:00Z',
            type: 'EXERCISE_TYPE_BIKING',
          },
        ],
      },
      wall
    );
    expect(batch.steps).toEqual([{ count: 5500, date: '2026-10-28' }]);
    expect(batch.weights).toEqual([{ date: '2026-10-28', grams: 80_200 }]);
    expect(batch.bodyFat).toEqual([{ date: '2026-10-28', tenths: 210 }]);
    expect(batch.sleeps).toEqual([{ bedTime: '23:00', wakeTime: '06:30', wokeOn: '2026-10-28' }]);
    expect(batch.workouts).toEqual([
      expect.objectContaining({
        distanceMeters: 21_000,
        doneOn: '2026-10-28',
        durationMinutes: 60,
        key: '2026-10-28T21:00:00.000Z',
        title: 'Pedalada',
      }),
    ]);
  });

  it('leaves out what it does not know', () => {
    expect(readHealthPayload('nada', wall)).toEqual({
      bodyFat: [],
      sleeps: [],
      steps: [],
      weights: [],
      workouts: [],
    });
    const batch = readHealthPayload(
      { steps: [{ count: -5, start_time: 'ontem' }], weight: [{ kilograms: 'muito' }] },
      wall
    );
    expect(batch.steps).toEqual([]);
    expect(batch.weights).toEqual([]);
  });

  it('names workouts in Portuguese', () => {
    expect(workoutTitle('Traditional Strength Training')).toBe('Musculação');
    expect(workoutTitle('EXERCISE_TYPE_WALKING')).toBe('Caminhada');
    expect(workoutTitle('Badminton')).toBe('Badminton');
  });
});
