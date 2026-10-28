import { parseDecimal } from './units';

/**
 * What a phone sends of its health data (Apple Health through Health Auto Export; Health Connect,
 * which Samsung Health, Garmin and others write to, through HC Webhook), read into what Fitness
 * keeps: integers only, days and times on the User's clock.
 */
export interface HealthBatch {
  /** Tenths of a percent, one per day: the last reading of the day. */
  bodyFat: { date: string; tenths: number }[];
  sleeps: { bedTime: string; wakeTime: string; wokeOn: string }[];
  /** The day's total, added up from what came. */
  steps: { count: number; date: string }[];
  /** Grams, one per day: the last reading of the day. */
  weights: { date: string; grams: number }[];
  workouts: {
    distanceMeters: null | number;
    doneOn: string;
    durationMinutes: null | number;
    kcal: null | number;
    /** Stable across sends: the app's id, or when it started. */
    key: string;
    title: string;
  }[];
}

/** The date and "HH:MM" an instant shows on the User's clock. */
export type WallClock = (instant: Date) => { date: string; time: string };

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const list = (value: unknown): Json[] => (Array.isArray(value) ? value.filter(isObject) : []);

/** A number the app sent, as an integer at `scale` decimals, read through text like typed ones. */
function scaled(value: unknown, scale: number): null | number {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return parseDecimal(value.toFixed(scale), scale);
  }
  if (typeof value === 'string') return parseDecimal(value, scale);
  return null;
}

/**
 * An instant from either app: ISO-8601 ("2026-05-09T07:00:00Z") or Health Auto Export's
 * "2024-02-06 14:30:00 -0800". With the date as the phone wrote it, when it carries an offset.
 */
function instantOf(value: unknown): null | { at: Date; localDate: null | string } {
  if (typeof value !== 'string') return null;
  const exported = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}(?::\d{2})?) ([+-]\d{2})(\d{2})$/.exec(
    value.trim()
  );
  const iso = exported
    ? `${exported[1]}T${exported[2]}${exported[3]}:${exported[4]}`
    : value.trim();
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return null;
  const offset = exported ?? /^(\d{4}-\d{2}-\d{2})T[\d:.]+[+-]\d{2}:?\d{2}$/.exec(iso);
  return { at, localDate: offset ? offset[1]! : null };
}

/** The day a reading belongs to: as the phone wrote it, or on the User's clock. */
const dayOf = (value: unknown, wall: WallClock) => {
  const instant = instantOf(value);
  if (!instant) {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
  }
  return instant.localDate ?? wall(instant.at).date;
};

/** What the apps call a workout, in Portuguese; anything else keeps its own name. */
const WORKOUTS: [RegExp, string][] = [
  [/run|corrida/, 'Corrida'],
  [/walk|caminhada/, 'Caminhada'],
  [/hik|trilha/, 'Trilha'],
  [/cycl|bik|pedal/, 'Pedalada'],
  [/swim|nata/, 'Natação'],
  [/strength|weight|muscula/, 'Musculação'],
  [/yoga/, 'Yoga'],
  [/pilates/, 'Pilates'],
  [/hiit|interval/, 'HIIT'],
  [/elliptical/, 'Elíptico'],
  [/row/, 'Remo'],
  [/danc/, 'Dança'],
  [/soccer|football|futebol/, 'Futebol'],
  [/tennis/, 'Tênis'],
];

export function workoutTitle(name: string): string {
  const plain = name
    .replace(/^EXERCISE_TYPE_/i, '')
    .replace(/_/g, ' ')
    .trim();
  const lower = plain.toLowerCase();
  const known = WORKOUTS.find(([pattern]) => pattern.test(lower));
  if (known) return known[1];
  return plain ? plain[0]!.toUpperCase() + plain.slice(1).toLowerCase() : 'Treino';
}

function addSteps(totals: Map<string, number>, date: null | string, count: null | number) {
  if (date && count !== null) totals.set(date, (totals.get(date) ?? 0) + count);
}

function lastPerDay<T>(map: Map<string, T>, date: null | string, value: null | T) {
  if (date && value !== null) map.set(date, value);
}

/** Pounds (at scale 3) to grams, in integers. */
const poundsToGrams = (milliPounds: number) => Math.round((milliPounds * 45_359_237) / 100_000_000);

/** Body fat as a share (0.185) or a percentage (18.5), in tenths of a percent. */
function fatTenths(value: unknown): null | number {
  const thousandths = scaled(value, 3);
  if (thousandths === null) return null;
  // Below 1 it is a share: 0,185 (185 thousandths) is 18,5%, 185 tenths.
  return thousandths < 1000 ? thousandths : Math.round(thousandths / 100);
}

/** Reads what the phone sent; what it does not know is left out. */
export function readHealthPayload(body: unknown, wall: WallClock): HealthBatch {
  const steps = new Map<string, number>();
  const weights = new Map<string, number>();
  const fat = new Map<string, number>();
  const sleeps = new Map<string, { bedTime: string; wakeTime: string; wokeOn: string }>();
  const workouts: HealthBatch['workouts'] = [];
  if (!isObject(body)) return done();

  const addSleep = (start: unknown, end: unknown) => {
    const from = instantOf(start);
    const to = instantOf(end);
    if (!from || !to || to.at <= from.at) return;
    // No night is longer than a day.
    if (to.at.getTime() - from.at.getTime() > 24 * 3_600_000) return;
    const woke = wall(to.at);
    sleeps.set(woke.date, { bedTime: wall(from.at).time, wakeTime: woke.time, wokeOn: woke.date });
  };

  const addWorkout = (workout: {
    distanceMeters: null | number;
    durationSeconds: null | number;
    end: unknown;
    id: unknown;
    kcal: null | number;
    name: unknown;
    start: unknown;
  }) => {
    const start = instantOf(workout.start);
    if (!start) return;
    const end = instantOf(workout.end);
    const seconds =
      workout.durationSeconds ??
      (end ? Math.round((end.at.getTime() - start.at.getTime()) / 1000) : null);
    workouts.push({
      distanceMeters: workout.distanceMeters,
      doneOn: wall(start.at).date,
      durationMinutes: seconds !== null && seconds > 0 ? Math.round(seconds / 60) : null,
      kcal: workout.kcal,
      key: typeof workout.id === 'string' && workout.id ? workout.id : start.at.toISOString(),
      title: workoutTitle(typeof workout.name === 'string' ? workout.name : ''),
    });
  };

  // Health Auto Export: everything under `data`, metrics by name.
  const exported = isObject(body.data) ? body.data : null;
  if (exported) {
    for (const metric of list(exported.metrics)) {
      const name = String(metric.name ?? '').toLowerCase();
      const units = String(metric.units ?? '').toLowerCase();
      const data = list(metric.data);
      if (name === 'step_count') {
        for (const point of data) addSteps(steps, dayOf(point.date, wall), scaled(point.qty, 0));
      } else if (['weight_body_mass', 'body_mass', 'weight_&_body_mass'].includes(name)) {
        for (const point of data) {
          const milli = scaled(point.qty, 3);
          lastPerDay(
            weights,
            dayOf(point.date, wall),
            milli === null ? null : units.startsWith('lb') ? poundsToGrams(milli) : milli
          );
        }
      } else if (name === 'body_fat_percentage') {
        for (const point of data) lastPerDay(fat, dayOf(point.date, wall), fatTenths(point.qty));
      } else if (name === 'sleep_analysis') {
        for (const point of data) {
          addSleep(point.sleepStart ?? point.inBedStart, point.sleepEnd ?? point.inBedEnd);
        }
      }
    }
    for (const workout of list(exported.workouts)) {
      const distance = isObject(workout.distance) ? workout.distance : null;
      const energy = isObject(workout.activeEnergyBurned) ? workout.activeEnergyBurned : null;
      const distanceUnits = String(distance?.units ?? '').toLowerCase();
      const milli = distance ? scaled(distance.qty, 3) : null;
      const kcalOrKj = energy ? scaled(energy.qty, 0) : null;
      addWorkout({
        distanceMeters:
          milli === null
            ? null
            : distanceUnits === 'mi'
              ? Math.round((milli * 1_609_344) / 1_000_000)
              : distanceUnits === 'm'
                ? Math.round(milli / 1000)
                : milli,
        durationSeconds: scaled(workout.duration, 0),
        end: workout.end,
        id: workout.id,
        kcal:
          kcalOrKj === null
            ? null
            : String(energy?.units ?? '').toLowerCase() === 'kj'
              ? Math.round((kcalOrKj * 1000) / 4184)
              : kcalOrKj,
        name: workout.name,
        start: workout.start,
      });
    }
    return done();
  }

  // HC Webhook (Health Connect), and the same shape from an iPhone Shortcut.
  for (const record of list(body.steps)) {
    addSteps(steps, dayOf(record.start_time ?? record.date, wall), scaled(record.count, 0));
  }
  for (const record of list(body.weight)) {
    lastPerDay(weights, dayOf(record.time ?? record.date, wall), scaled(record.kilograms, 3));
  }
  for (const record of list(body.body_fat)) {
    lastPerDay(fat, dayOf(record.time ?? record.date, wall), fatTenths(record.percentage));
  }
  for (const record of list(body.sleep)) {
    const stages = list(record.stages);
    const firstStage = stages
      .map(stage => instantOf(stage.start_time))
      .filter(instant => instant !== null)
      .sort((a, b) => a.at.getTime() - b.at.getTime())[0];
    const end = instantOf(record.session_end_time ?? record.end_time);
    const seconds = scaled(record.duration_seconds, 0);
    const start =
      record.session_start_time ??
      record.start_time ??
      firstStage?.at.toISOString() ??
      (end && seconds !== null ? new Date(end.at.getTime() - seconds * 1000).toISOString() : null);
    addSleep(start, record.session_end_time ?? record.end_time);
  }
  for (const record of list(body.exercise)) {
    addWorkout({
      distanceMeters: scaled(record.distance_meters, 0),
      durationSeconds: scaled(record.duration_seconds, 0),
      end: record.end_time,
      id: record.id,
      kcal: scaled(record.calories ?? record.kcal, 0),
      name: record.type ?? record.title,
      start: record.start_time,
    });
  }
  return done();

  function done(): HealthBatch {
    return {
      bodyFat: [...fat].map(([date, tenths]) => ({ date, tenths })),
      sleeps: [...sleeps.values()],
      steps: [...steps].map(([date, count]) => ({ count, date })),
      weights: [...weights].map(([date, grams]) => ({ date, grams })),
      workouts,
    };
  }
}
