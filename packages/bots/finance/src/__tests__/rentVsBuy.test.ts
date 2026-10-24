import { describe, expect, it } from 'vitest';

import { rentVsBuy, type RentVsBuyInput } from '../rentVsBuy';

const base: RentVsBuyInput = {
  appreciationRate: 0.05,
  closingCostsCents: 2_000_000,
  downPaymentCents: 10_000_000,
  financingRate: 0.115,
  investmentRate: 0.1,
  propertyCents: 50_000_000,
  rentCents: 250_000,
  rentAdjustmentRate: 0.04,
  system: 'PRICE',
  termMonths: 360,
};

describe('rentVsBuy', () => {
  it('turns down figures it cannot work out', () => {
    expect(rentVsBuy({ ...base, propertyCents: 0 })).toBeNull();
    expect(rentVsBuy({ ...base, termMonths: 0 })).toBeNull();
    expect(rentVsBuy({ ...base, termMonths: 601 })).toBeNull();
    expect(rentVsBuy({ ...base, rentCents: -1 })).toBeNull();
  });

  it('with nothing growing, the renter keeps the gap and the buyer the home', () => {
    const result = rentVsBuy({
      ...base,
      appreciationRate: 0,
      closingCostsCents: 0,
      downPaymentCents: 0,
      financingRate: 0,
      investmentRate: 0,
      propertyCents: 1_200_000,
      rentAdjustmentRate: 0,
      rentCents: 50_000,
      termMonths: 12,
    })!;
    // 1.200.000 over 12 months is 100.000 a month, 50.000 more than the rent.
    const last = result.points.at(-1)!;
    expect(last.installmentCents).toBe(100_000);
    expect(last.renterWealthCents).toBe(600_000);
    expect(last.buyerWealthCents).toBe(1_200_000);
    expect(result.totalRentCents).toBe(600_000);
    expect(result.totalInstallmentsCents).toBe(1_200_000);
    expect(result.totalInterestCents).toBe(0);
    expect(result.buyerAheadFrom).toBe(1);
  });

  it('adjusts the rent once a year', () => {
    const result = rentVsBuy({ ...base, rentAdjustmentRate: 0.1, termMonths: 25 })!;
    expect(result.points[11]!.rentCents).toBe(250_000);
    expect(result.points[12]!.rentCents).toBe(275_000);
    expect(result.points[24]!.rentCents).toBe(302_500);
  });

  it('has the buyer invest when the rent costs more than the installment', () => {
    const result = rentVsBuy({
      ...base,
      appreciationRate: 0,
      downPaymentCents: 50_000_000,
      investmentRate: 0,
      termMonths: 12,
    })!;
    // Paid in cash: no installments, so the buyer sets the whole rent aside every month.
    expect(result.totalInstallmentsCents).toBe(0);
    expect(result.points.at(-1)!.buyerWealthCents).toBe(50_000_000 + 12 * 250_000);
    expect(result.points.at(-1)!.renterWealthCents).toBe(52_000_000);
  });

  it('favors renting when money earns more than the home and the loan cost', () => {
    const result = rentVsBuy({ ...base, appreciationRate: 0.02, investmentRate: 0.14 })!;
    expect(result.buyerAheadFrom).toBeNull();
  });

  it('favors buying when the home rises fast and money earns little', () => {
    const result = rentVsBuy({ ...base, appreciationRate: 0.1, investmentRate: 0.04 })!;
    expect(result.buyerAheadFrom).not.toBeNull();
    const last = result.points.at(-1)!;
    expect(last.buyerWealthCents).toBeGreaterThan(last.renterWealthCents);
  });
});
