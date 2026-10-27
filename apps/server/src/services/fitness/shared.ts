import { addDays } from '@zapbots/finance';

import { badInput } from '../../resolvers/guards';
import { day } from '../personal/clock';

/** A whole number in bounds, or null when left empty; each throws a message the User reads. */
export function count(
  value: null | number | undefined,
  what: string,
  [min, max]: [number, number]
): null | number {
  if (value === null || value === undefined) return null;
  if (!Number.isInteger(value) || value < min || value > max)
    badInput(`${what} deve ser um número inteiro de ${min} a ${max}.`);
  return value;
}

export function requiredDay(value: null | string | undefined, what = 'A data'): string {
  return day(value, what) ?? badInput(`${what} é obrigatória.`);
}

/** The longest range a list of days covers at once. */
export const MAX_DAYS = 92;

/** A range of days given, or the last `days` up to `today`; refused past MAX_DAYS. */
export function range(
  from: null | string | undefined,
  to: null | string | undefined,
  today: string,
  days: number
): { from: string; to: string } {
  const end = day(to, 'O fim') ?? today;
  const start = day(from, 'O começo') ?? addDays(end, -(days - 1));
  if (start > end) badInput('O começo vem depois do fim.');
  if (addDays(start, MAX_DAYS * 4) < end) badInput('Escolha um período de até um ano.');
  return { from: start, to: end };
}
