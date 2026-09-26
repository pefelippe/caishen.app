import type { AmortizationSystem } from './amortization';
import { Decimal, type Cents } from './money';

const MAX_MONTHLY_RATE = new Decimal(1);
const TOLERANCE = new Decimal('1e-12');

export class ImpliedRateError extends Error {}

/**
 * The Implied Rate: the monthly rate that turns `principalCents` into installments of
 * `installmentCents` over `termMonths`. For SAC, `installmentCents` is the first installment.
 */
export function impliedMonthlyRate(
  system: AmortizationSystem,
  principalCents: Cents,
  installmentCents: Cents,
  termMonths: number
): Decimal {
  const principal = new Decimal(principalCents);
  const installment = new Decimal(installmentCents);

  if (system === 'SAC') {
    const rate = installment.minus(principal.div(termMonths)).div(principal);
    if (rate.isNegative()) throw new ImpliedRateError('Parcela menor que a amortização mínima');
    return rate;
  }

  const totalPaid = installment.times(termMonths);
  if (totalPaid.lessThan(principal)) {
    throw new ImpliedRateError('Parcelas somam menos que o valor financiado');
  }
  if (totalPaid.equals(principal)) return new Decimal(0);

  // The Price installment grows monotonically with the rate, so bisection always converges.
  const installmentAt = (rate: Decimal) =>
    principal.times(rate).div(new Decimal(1).minus(rate.plus(1).pow(-termMonths)));

  let low = new Decimal(0);
  let high = MAX_MONTHLY_RATE;
  if (installmentAt(high).lessThan(installment)) {
    throw new ImpliedRateError('Taxa implícita acima de 100% a.m.');
  }
  while (high.minus(low).greaterThan(TOLERANCE)) {
    const mid = low.plus(high).div(2);
    if (installmentAt(mid).lessThan(installment)) low = mid;
    else high = mid;
  }
  return low.plus(high).div(2);
}
