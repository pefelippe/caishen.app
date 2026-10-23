import { Decimal, toCents, type Cents, type Rate } from './money';

/** IOF on foreign currency coming in to a person in Brazil (câmbio de ingresso): 0,38%. */
export const INCOMING_IOF = new Decimal('0.0038');

/**
 * What a payment in a foreign currency comes to in reais, in whole cents: the amount at the
 * exchange rate (reais per unit, e.g. the PTAX), less the bank's or the app's spread on the rate,
 * less the IOF on the reais. `iof` and `spread` are fractions (0,38% is `0.0038`).
 */
export function foreignToBrlCents(
  amountCents: Cents,
  rate: Rate,
  { iof = INCOMING_IOF, spread = 0 }: { iof?: Rate; spread?: Rate } = {}
): Cents {
  const reais = new Decimal(amountCents)
    .times(rate)
    .times(new Decimal(1).minus(spread))
    .times(new Decimal(1).minus(iof));
  return toCents(reais);
}
