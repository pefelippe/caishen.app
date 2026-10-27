/**
 * Fitness keeps integers only, like money in cents (docs/adr/0004): body weight in grams, lengths
 * in millimetres, body fat in tenths of a percent, food in whole grams and kcal. What people type
 * ("72,5") is read as text, never through a float.
 */

/**
 * "72,5" or "72.5" at scale 3 is 72500. Null when it is not a number, has more decimals than the
 * scale holds, or is negative.
 */
export function parseDecimal(text: string, scale: number): null | number {
  const match = /^\s*(\d{1,7})(?:[.,](\d*))?\s*$/.exec(text);
  if (!match) return null;
  const decimals = match[2] ?? '';
  if (decimals.length > scale) return null;
  return Number(match[1]) * 10 ** scale + Number(decimals.padEnd(scale, '0') || '0');
}

/** 72500 at scale 3 is "72,5" in pt-BR: at most `shown` decimals, none trailing. */
export function formatDecimal(
  value: number,
  scale: number,
  locale = 'pt-BR',
  shown = scale
): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: shown }).format(
    value / 10 ** scale
  );
}

export type MeasureKind = 'ARM' | 'BODY_FAT' | 'CHEST' | 'HIP' | 'THIGH' | 'WAIST' | 'WEIGHT';

/** How each Medida is kept: its scale against what people type, and the unit they type it in. */
export const MEASURE_UNITS: Record<MeasureKind, { scale: number; shown: number; unit: string }> = {
  ARM: { scale: 1, shown: 1, unit: 'cm' },
  BODY_FAT: { scale: 1, shown: 1, unit: '%' },
  CHEST: { scale: 1, shown: 1, unit: 'cm' },
  HIP: { scale: 1, shown: 1, unit: 'cm' },
  THIGH: { scale: 1, shown: 1, unit: 'cm' },
  WAIST: { scale: 1, shown: 1, unit: 'cm' },
  // Grams, typed to the gram and shown to 100 g.
  WEIGHT: { scale: 3, shown: 1, unit: 'kg' },
};

/** In the order the Medidas page lists them. */
export const MEASURE_KINDS: MeasureKind[] = [
  'WEIGHT',
  'BODY_FAT',
  'WAIST',
  'HIP',
  'CHEST',
  'ARM',
  'THIGH',
];

export const isMeasureKind = (kind: string): kind is MeasureKind =>
  Object.hasOwn(MEASURE_UNITS, kind);

/** A Medida as people read it: "72,5 kg", "18,2 %". */
export function formatMeasure(kind: MeasureKind, value: number, locale = 'pt-BR'): string {
  const { scale, shown, unit } = MEASURE_UNITS[kind];
  return `${formatDecimal(value, scale, locale, shown)} ${unit}`;
}

/** Bounds no body passes, in each kind's integer unit, to catch a slip of the keyboard. */
export const MEASURE_LIMITS: Record<MeasureKind, [number, number]> = {
  ARM: [50, 1_000],
  BODY_FAT: [1, 800],
  CHEST: [300, 2_500],
  HIP: [300, 2_500],
  THIGH: [100, 1_500],
  WAIST: [300, 2_500],
  WEIGHT: [2_000, 400_000],
};
