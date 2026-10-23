import Decimal from 'decimal.js';

/** Money is always an integer amount of cents (see docs/adr/0004). */
export type Cents = number;

/** A monthly effective rate as a fraction: 1.5% a.m. is `0.015`. */
export type Rate = Decimal.Value;

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_EVEN });

export function toCents(value: Decimal.Value): Cents {
  return new Decimal(value).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
}

/**
 * A pt-BR amount as a Model or a person writes it ("R$ 1.234,56", "20000,00", "1234.56", 2500) in
 * cents; `null` when it is not an amount of zero or more. With a comma, dots group thousands; without
 * one they still do when every group after the first has three digits ("25.000").
 */
export function parseMoney(input: number | string): Cents | null {
  // A number is already decimal: 1.005 is one real, not a thousand.
  if (typeof input === 'number') {
    return Number.isFinite(input) && input >= 0 ? toCents(new Decimal(input).times(100)) : null;
  }
  const bare = input.replace(/[^\d.,-]/g, '');
  if (!/\d/.test(bare)) return null;
  const groupsThousands = bare.includes(',') || /^-?\d{1,3}(\.\d{3})+$/.test(bare);
  const digits = groupsThousands ? bare.replace(/\./g, '').replace(',', '.') : bare;
  if (!/^-?\d+(\.\d+)?$/.test(digits)) return null;
  const cents = new Decimal(digits).times(100);
  return cents.isNegative() ? null : toCents(cents);
}

/** A pt-BR percentage ("1,89", "1.89%", 1.89) as a fraction (0.0189); `null` if it is none. */
export function parsePercent(input: number | string): Decimal | null {
  const text = (typeof input === 'number' ? String(input) : input).replace(/[%\s]/g, '');
  const digits = text.replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(digits)) return null;
  return new Decimal(digits).div(100);
}

export function annualToMonthlyRate(annualRate: Rate): Decimal {
  return new Decimal(1).plus(annualRate).pow(new Decimal(1).div(12)).minus(1);
}

export function monthlyToAnnualRate(monthlyRate: Rate): Decimal {
  return new Decimal(1).plus(monthlyRate).pow(12).minus(1);
}

export { Decimal };
