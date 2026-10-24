import { amortizationSchedule, type AmortizationSystem } from './amortization';
import { Decimal, annualToMonthlyRate, toCents, type Cents, type Rate } from './money';

export interface RentVsBuyInput {
  /** Yearly rise of the home's price, as a fraction. */
  appreciationRate: Rate;
  /** Paid in cash when buying, besides the down payment: ITBI, registry, bank fees. */
  closingCostsCents: Cents;
  downPaymentCents: Cents;
  /** Yearly effective rate of the financing, as a fraction. */
  financingRate: Rate;
  /** Yearly net return of the money set aside, as a fraction. */
  investmentRate: Rate;
  propertyCents: Cents;
  rentCents: Cents;
  /** Yearly adjustment of the rent (IGP-M or IPCA), applied every 12 months. */
  rentAdjustmentRate: Rate;
  system: AmortizationSystem;
  termMonths: number;
}

export interface RentVsBuyPoint {
  /** The home's price, less what is still owed, plus what the buyer set aside. */
  buyerWealthCents: Cents;
  installmentCents: Cents;
  month: number;
  rentCents: Cents;
  /** What the renter set aside, with its returns. */
  renterWealthCents: Cents;
}

export interface RentVsBuyOutcome {
  /** From which month buying stays ahead to the end; `null` when it never does. */
  buyerAheadFrom: number | null;
  /** Month by month, from 1 to the term. */
  points: RentVsBuyPoint[];
  totalInstallmentsCents: Cents;
  totalInterestCents: Cents;
  totalRentCents: Cents;
}

/**
 * Renting against financing a home, the way the AUVP's calculator puts it: both people spend the
 * same each month. The buyer pays the down payment, the closing costs and the installments; the
 * renter invests that down payment and those costs instead, pays the rent, and invests whatever the
 * installment costs more than the rent (or the buyer invests what the rent costs more). At each
 * month, the buyer has the home (at its price then) less what is still owed, plus anything set
 * aside; the renter has what was invested. `null` when a figure cannot be worked out.
 */
export function rentVsBuy(input: RentVsBuyInput): RentVsBuyOutcome | null {
  const { downPaymentCents, propertyCents, termMonths } = input;
  if (propertyCents <= 0 || termMonths <= 0 || termMonths > 600) return null;
  if (downPaymentCents < 0 || input.closingCostsCents < 0 || input.rentCents < 0) return null;

  const principal = Math.max(0, propertyCents - downPaymentCents);
  const schedule =
    principal > 0
      ? amortizationSchedule({
          // Dates do not matter here; only the order of the installments does.
          firstDueDate: '2000-02-01',
          monthlyRate: annualToMonthlyRate(input.financingRate),
          principalCents: principal,
          system: input.system,
          termMonths,
        })
      : [];

  const appreciation = annualToMonthlyRate(input.appreciationRate).plus(1);
  const returns = annualToMonthlyRate(input.investmentRate).plus(1);
  const property = new Decimal(propertyCents);

  let renter = new Decimal(Math.min(downPaymentCents, propertyCents) + input.closingCostsCents);
  let buyer = new Decimal(0);
  let rent = new Decimal(input.rentCents);
  let totalRent = 0;
  const points: RentVsBuyPoint[] = [];

  for (let month = 1; month <= termMonths; month++) {
    if (month > 1 && (month - 1) % 12 === 0)
      rent = rent.times(new Decimal(input.rentAdjustmentRate).plus(1));
    const row = schedule[month - 1];
    const installment = row?.installmentCents ?? 0;
    const rentCents = toCents(rent);
    totalRent += rentCents;

    renter = renter.times(returns);
    buyer = buyer.times(returns);
    const gap = installment - rentCents;
    if (gap > 0) renter = renter.plus(gap);
    else buyer = buyer.minus(gap);

    const balance = row?.balanceCents ?? 0;
    points.push({
      buyerWealthCents: toCents(property.times(appreciation.pow(month)).minus(balance).plus(buyer)),
      installmentCents: installment,
      month,
      rentCents,
      renterWealthCents: toCents(renter),
    });
  }

  let buyerAheadFrom: number | null = null;
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i]!.buyerWealthCents < points[i]!.renterWealthCents) break;
    buyerAheadFrom = points[i]!.month;
  }

  return {
    buyerAheadFrom,
    points,
    totalInstallmentsCents: schedule.reduce((sum, row) => sum + row.installmentCents, 0),
    totalInterestCents: schedule.reduce((sum, row) => sum + row.interestCents, 0),
    totalRentCents: totalRent,
  };
}
