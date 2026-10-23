import { describe, expect, it } from 'vitest';

import {
  irrf,
  meiDas,
  normalizeCnpj,
  presumidoQuarterly,
  proLabore,
  simplesAnnexFor,
  simplesDas,
} from './company';

describe('Simples Nacional', () => {
  it('matches a real DAS: Anexo III, first bracket, exported services', () => {
    // R$ 23.489,10 declared for September 2026, DAS of R$ 717,36 paid on 20/10/2026.
    const das = simplesDas({
      annex: 'III',
      exports: true,
      rbt12Cents: 15_000_000,
      revenueCents: 2_348_910,
    });
    expect(das.bracket).toBe(1);
    expect(das.dasCents).toBe(71_736);
    expect(das.rate.toFixed(5)).toBe('0.03054');
  });

  it('charges the whole rate on revenue sold in Brazil', () => {
    const das = simplesDas({
      annex: 'III',
      exports: false,
      rbt12Cents: 0,
      revenueCents: 1_000_000,
    });
    expect(das.dasCents).toBe(60_000);
  });

  it('lowers the rate by the parcela a deduzir from the second bracket on', () => {
    // RBT12 R$ 300.000: (300.000 × 11,2% − 9.360) ÷ 300.000 = 8,08%.
    const das = simplesDas({
      annex: 'III',
      exports: false,
      rbt12Cents: 30_000_000,
      revenueCents: 2_500_000,
    });
    expect(das.bracket).toBe(2);
    expect(das.effectiveRate.toFixed(4)).toBe('0.0808');
    expect(das.dasCents).toBe(202_000);
  });

  it('takes the Fator R to Anexo III at 28% of payroll and to Anexo V below it', () => {
    expect(simplesAnnexFor('V', true, 2_800_000, 10_000_000)).toBe('III');
    expect(simplesAnnexFor('V', true, 2_799_999, 10_000_000)).toBe('V');
    expect(simplesAnnexFor('III', false, 0, 10_000_000)).toBe('III');
  });
});

describe('Pró-labore', () => {
  it('matches a real one: R$ 1.621,00 keeps R$ 178,31 of INSS and no IRRF', () => {
    expect(proLabore(162_100, false)).toEqual({
      employerInssCents: 0,
      grossCents: 162_100,
      inssCents: 17_831,
      irrfCents: 0,
      netCents: 144_269,
    });
  });

  it('caps the INSS at the ceiling and adds the company 20% outside the DAS', () => {
    const result = proLabore(1_000_000, true);
    expect(result.inssCents).toBe(93_231);
    expect(result.employerInssCents).toBe(200_000);
  });

  it('applies the 2026 reduction: nothing up to R$ 5.000, part of it up to R$ 7.350', () => {
    expect(irrf(500_000, 55_000)).toBe(0);
    // R$ 6.500 less the R$ 607,20 simplified deduction: R$ 711,79 of tax less R$ 113,18 of reduction.
    expect(irrf(650_000, 0)).toBe(59_861);
  });
});

describe('MEI and Lucro Presumido', () => {
  it('fixes the MEI DAS by activity', () => {
    expect(meiDas('SERVICES')).toBe(8_605);
    expect(meiDas('COMMERCE')).toBe(8_205);
    expect(meiDas('COMMERCE_SERVICES')).toBe(8_705);
  });

  it('presumes 32% of a service company revenue for IRPJ and CSLL', () => {
    expect(presumidoQuarterly('SERVICES', 9_000_000)).toEqual({
      csllCents: 259_200,
      irpjCents: 432_000,
    });
  });
});

describe('CNPJ', () => {
  it('checks the digits, numeric or alphanumeric', () => {
    expect(normalizeCnpj('11.222.333/0001-81')).toBe('11222333000181');
    expect(normalizeCnpj('12.abc.345/01de-35')).toBe('12ABC34501DE35');
    expect(normalizeCnpj('11.222.333/0001-82')).toBeNull();
    expect(normalizeCnpj('11111111111111')).toBeNull();
  });
});
