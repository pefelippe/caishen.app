import type { MeasureKind } from './units';

/** Minutes in a day; a night that crosses midnight wraps around it. */
const DAY = 24 * 60;

const minutesOf = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours! * 60 + minutes!;
};

/** How long a night lasted from bed ("23:30") to waking ("07:00"): 450. Equal times are 0. */
export function sleepMinutes(bedTime: string, wakeTime: string): number {
  return (minutesOf(wakeTime) - minutesOf(bedTime) + DAY) % DAY;
}

/** "7h30" from 450. */
export const hoursLabel = (minutes: number) =>
  `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}`;

/** The mean of some nights, rounded to the minute; null with none. */
export function averageSleep(nights: { bedTime: string; wakeTime: string }[]): null | number {
  if (nights.length === 0) return null;
  const total = nights.reduce((sum, night) => sum + sleepMinutes(night.bedTime, night.wakeTime), 0);
  return Math.round(total / nights.length);
}

export interface Macros {
  carbsG: number;
  fatG: number;
  kcal: number;
  proteinG: number;
}

export const NO_MACROS: Macros = { carbsG: 0, fatG: 0, kcal: 0, proteinG: 0 };

/** What some Refeições add up to. */
export function totalMacros(meals: Macros[]): Macros {
  return meals.reduce(
    (sum, meal) => ({
      carbsG: sum.carbsG + meal.carbsG,
      fatG: sum.fatG + meal.fatG,
      kcal: sum.kcal + meal.kcal,
      proteinG: sum.proteinG + meal.proteinG,
    }),
    NO_MACROS
  );
}

/** kcal from the macros alone: 4 per gram of protein and carbs, 9 per gram of fat. */
export const kcalOfMacros = ({ carbsG, fatG, proteinG }: Omit<Macros, 'kcal'>) =>
  4 * proteinG + 4 * carbsG + 9 * fatG;

/** How much of a target is eaten, as a whole percent (over 100 when past it); null without one. */
export function percentOfTarget(eaten: number, target: null | number | undefined): null | number {
  if (!target || target <= 0) return null;
  return Math.round((eaten / target) * 100);
}

export interface MeasurePoint {
  kind: MeasureKind;
  measuredOn: string;
  value: number;
}

export interface Trend {
  /** The last against the one taken `days` before it or earlier; null without an older one. */
  change: null | number;
  latest: MeasurePoint;
}

const dayNumber = (date: string) => Date.parse(`${date}T00:00:00Z`) / 86_400_000;

/**
 * The last value of one kind of Medida and how it moved against the newest one at least `days`
 * older (or the oldest there is, when none is that old).
 */
export function measureTrend(points: MeasurePoint[], kind: MeasureKind, days = 30): null | Trend {
  const series = points
    .filter(point => point.kind === kind)
    .sort((a, b) => a.measuredOn.localeCompare(b.measuredOn));
  const latest = series.at(-1);
  if (!latest) return null;
  const before = series.slice(0, -1);
  const reference =
    before
      .filter(point => dayNumber(latest.measuredOn) - dayNumber(point.measuredOn) >= days)
      .at(-1) ?? before[0];
  return { change: reference ? latest.value - reference.value : null, latest };
}

/** The Fichas set for a weekday (0 Sunday to 6), in their order. */
export function plansOn<T extends { weekdays: number[] }>(plans: T[], weekday: number): T[] {
  return plans.filter(plan => plan.weekdays.includes(weekday));
}
