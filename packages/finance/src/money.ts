import Decimal from 'decimal.js';

/** Money is always an integer amount of cents (see docs/adr/0004). */
export type Cents = number;

/** A monthly effective rate as a fraction: 1.5% a.m. is `0.015`. */
export type Rate = Decimal.Value;

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_EVEN });

export function toCents(value: Decimal.Value): Cents {
  return new Decimal(value).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
}

export function annualToMonthlyRate(annualRate: Rate): Decimal {
  return new Decimal(1).plus(annualRate).pow(new Decimal(1).div(12)).minus(1);
}

export function monthlyToAnnualRate(monthlyRate: Rate): Decimal {
  return new Decimal(1).plus(monthlyRate).pow(12).minus(1);
}

export { Decimal };
