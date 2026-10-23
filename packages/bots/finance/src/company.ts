import Decimal from 'decimal.js';

import { toCents, type Cents } from './money';

/**
 * The taxes of a Titular's company (docs/adr/0016): the Simples Nacional DAS, the MEI's fixed DAS,
 * the Lucro Presumido's guides and the pró-labore's INSS and IRRF. Rates are the law's for 2026;
 * a new year with new tables means new constants here, with their source.
 */
export type TaxRegime = 'MEI' | 'PRESUMIDO' | 'REAL' | 'SIMPLES';
export type SimplesAnnex = 'I' | 'II' | 'III' | 'IV' | 'V';
export type CompanyActivity = 'COMMERCE' | 'COMMERCE_SERVICES' | 'INDUSTRY' | 'SERVICES';

/** Salário mínimo 2026 (Decreto 12.797/2025). */
export const MINIMUM_WAGE_CENTS = 162_100;
/** Teto do INSS 2026 (Portaria Interministerial MPS/MF, janeiro de 2026). */
export const INSS_CEILING_CENTS = 847_555;
/** The most a company may bill a year in the Simples Nacional (LC 123/2006, art. 3º). */
export const SIMPLES_LIMIT_CENTS = 480_000_000;
/** The most an MEI may bill a year (LC 123/2006, art. 18-A). */
export const MEI_LIMIT_CENTS = 8_100_000;

/** The share of a DAS each tax takes, in percent, for what exports leave out (LC 123, art. 18, §14). */
interface Shares {
  cofins: number;
  icms?: number;
  ipi?: number;
  iss?: number;
  pis: number;
}

interface Bracket {
  /** Parcela a deduzir, in cents. */
  deductionCents: Cents;
  /** Alíquota nominal, as a fraction. */
  rate: string;
  shares: Shares;
  /** The RBT12 up to which this bracket applies, in cents. */
  upToCents: Cents;
}

const LIMITS = [18_000_000, 36_000_000, 72_000_000, 180_000_000, 360_000_000, 480_000_000];

/** Each Anexo's brackets (LC 123/2006, Anexos I to V, as of LC 155/2016). */
const brackets = (rows: [string, Cents, Shares][]): Bracket[] =>
  rows.map(([rate, deductionCents, shares], index) => ({
    deductionCents,
    rate,
    shares,
    upToCents: LIMITS[index]!,
  }));

const COMMERCE: Shares = { cofins: 12.74, icms: 34, pis: 2.76 };
const INDUSTRY: Shares = { cofins: 11.51, icms: 32, ipi: 7.5, pis: 2.49 };

export const SIMPLES_TABLES: Record<SimplesAnnex, Bracket[]> = {
  I: brackets([
    ['0.04', 0, COMMERCE],
    ['0.073', 594_000, COMMERCE],
    ['0.095', 1_386_000, COMMERCE],
    ['0.107', 2_250_000, COMMERCE],
    ['0.143', 8_730_000, COMMERCE],
    ['0.19', 37_800_000, { cofins: 28.27, pis: 6.13 }],
  ]),
  II: brackets([
    ['0.045', 0, INDUSTRY],
    ['0.078', 594_000, INDUSTRY],
    ['0.10', 1_386_000, INDUSTRY],
    ['0.112', 2_250_000, INDUSTRY],
    ['0.147', 8_550_000, INDUSTRY],
    ['0.30', 72_000_000, { cofins: 20.96, ipi: 35, pis: 4.54 }],
  ]),
  III: brackets([
    ['0.06', 0, { cofins: 12.82, iss: 33.5, pis: 2.78 }],
    ['0.112', 936_000, { cofins: 14.05, iss: 32, pis: 3.05 }],
    ['0.135', 1_764_000, { cofins: 13.64, iss: 32.5, pis: 2.96 }],
    ['0.16', 3_564_000, { cofins: 13.64, iss: 32.5, pis: 2.96 }],
    ['0.21', 12_564_000, { cofins: 12.82, iss: 33.5, pis: 2.78 }],
    ['0.33', 64_800_000, { cofins: 16.03, pis: 3.47 }],
  ]),
  IV: brackets([
    ['0.045', 0, { cofins: 17.67, iss: 44.5, pis: 3.83 }],
    ['0.09', 810_000, { cofins: 20.55, iss: 40, pis: 4.45 }],
    ['0.102', 1_242_000, { cofins: 19.73, iss: 40, pis: 4.27 }],
    ['0.14', 3_978_000, { cofins: 18.9, iss: 40, pis: 4.1 }],
    ['0.22', 18_378_000, { cofins: 18.08, iss: 40, pis: 3.92 }],
    ['0.33', 82_800_000, { cofins: 20.55, pis: 4.45 }],
  ]),
  V: brackets([
    ['0.155', 0, { cofins: 14.1, iss: 14, pis: 3.05 }],
    ['0.18', 450_000, { cofins: 14.1, iss: 17, pis: 3.05 }],
    ['0.195', 990_000, { cofins: 14.92, iss: 19, pis: 3.23 }],
    ['0.205', 1_710_000, { cofins: 15.74, iss: 21, pis: 3.41 }],
    ['0.23', 6_210_000, { cofins: 14.1, iss: 23.5, pis: 3.05 }],
    ['0.305', 54_000_000, { cofins: 16.44, pis: 3.56 }],
  ]),
};

/**
 * The Anexo a company falls in: the one it registered, unless it is under the Fator R, when payroll
 * of 28% or more of the RBT12 takes it to Anexo III and less to Anexo V.
 */
export function simplesAnnexFor(
  annex: SimplesAnnex,
  fatorR: boolean,
  payroll12Cents: Cents,
  rbt12Cents: Cents
): SimplesAnnex {
  if (!fatorR) return annex;
  if (rbt12Cents <= 0) return 'III';
  return new Decimal(payroll12Cents).div(rbt12Cents).gte('0.28') ? 'III' : 'V';
}

/**
 * The Simples Nacional on a month's revenue: the bracket of the RBT12, its effective rate
 * ((RBT12 × alíquota − parcela a deduzir) ÷ RBT12) and the DAS. Exported revenue leaves out the
 * share of PIS, Cofins, ISS, ICMS and IPI.
 */
export function simplesDas({
  annex,
  exports,
  rbt12Cents,
  revenueCents,
}: {
  annex: SimplesAnnex;
  exports: boolean;
  rbt12Cents: Cents;
  revenueCents: Cents;
}) {
  const table = SIMPLES_TABLES[annex];
  const index = table.findIndex(bracket => rbt12Cents <= bracket.upToCents);
  // Over the limit the last bracket still applies until the company leaves the Simples.
  const bracket = table[index === -1 ? table.length - 1 : index]!;
  const effectiveRate =
    rbt12Cents > 0
      ? Decimal.max(
          0,
          new Decimal(rbt12Cents).times(bracket.rate).minus(bracket.deductionCents).div(rbt12Cents)
        )
      : new Decimal(bracket.rate);
  const excludedShare = exports
    ? Object.entries(bracket.shares).reduce(
        (total, [, share]) => total.plus(share ?? 0),
        new Decimal(0)
      )
    : new Decimal(0);
  const rate = effectiveRate.times(new Decimal(100).minus(excludedShare).div(100));
  return {
    annex,
    bracket: table.indexOf(bracket) + 1,
    dasCents: toCents(new Decimal(revenueCents).times(rate)),
    /** The effective rate on this month's revenue, after what exports leave out. */
    rate,
    effectiveRate,
    nominalRate: new Decimal(bracket.rate),
    overLimit: rbt12Cents > SIMPLES_LIMIT_CENTS,
  };
}

/** The MEI's fixed DAS: 5% of the minimum wage for the INSS, plus R$ 1 of ICMS and R$ 5 of ISS. */
export function meiDas(activity: CompanyActivity): Cents {
  const inss = toCents(new Decimal(MINIMUM_WAGE_CENTS).times('0.05'));
  const icms = activity === 'SERVICES' ? 0 : 100;
  const iss = activity === 'COMMERCE' || activity === 'INDUSTRY' ? 0 : 500;
  return inss + icms + iss;
}

/** Tabela progressiva mensal do IRRF (unchanged since May 2025): up to, rate, parcela a deduzir. */
const IRRF_TABLE: [Cents, string, Cents][] = [
  [242_880, '0', 0],
  [282_665, '0.075', 18_216],
  [375_105, '0.15', 39_416],
  [466_468, '0.225', 67_549],
  [Number.POSITIVE_INFINITY, '0.275', 90_873],
];
/** Desconto simplificado mensal, used when it beats the INSS as a deduction. */
const SIMPLIFIED_DEDUCTION_CENTS = 60_720;

/**
 * IRRF on a month's taxable income, with the 2026 reduction (Lei 15.270/2025): none due up to
 * R$ 5.000 (a reduction of up to R$ 312,89), a shrinking one up to R$ 7.350.
 */
export function irrf(grossCents: Cents, inssCents: Cents): Cents {
  const base = grossCents - Math.max(inssCents, SIMPLIFIED_DEDUCTION_CENTS);
  const [, rate, deduction] = IRRF_TABLE.find(([upTo]) => base <= upTo)!;
  const tax = Decimal.max(0, new Decimal(base).times(rate).minus(deduction));
  const reduction =
    grossCents <= 500_000
      ? Decimal.min(tax, 31_289)
      : grossCents <= 735_000
        ? Decimal.min(
            tax,
            Decimal.max(0, new Decimal(97_862).minus(new Decimal(grossCents).times('0.133145')))
          )
        : new Decimal(0);
  return toCents(Decimal.max(0, tax.minus(reduction)));
}

/**
 * What a pró-labore costs and pays: the partner's INSS (11%, up to the ceiling) and IRRF, both kept
 * by the company, what reaches the partner, and the company's own 20% when its regime does not
 * already pay it inside the DAS (Anexo IV, Lucro Presumido and Real).
 */
export function proLabore(grossCents: Cents, employerPays: boolean) {
  const inssCents = toCents(new Decimal(Math.min(grossCents, INSS_CEILING_CENTS)).times('0.11'));
  const irrfCents = irrf(grossCents, inssCents);
  return {
    employerInssCents: employerPays ? toCents(new Decimal(grossCents).times('0.2')) : 0,
    grossCents,
    inssCents,
    irrfCents,
    netCents: grossCents - inssCents - irrfCents,
  };
}

/** Whether a company pays the 20% on pró-labore apart from the DAS. */
export function employerPaysCpp(regime: TaxRegime, annex: SimplesAnnex | null): boolean {
  return regime === 'PRESUMIDO' || regime === 'REAL' || (regime === 'SIMPLES' && annex === 'IV');
}

/** Lucro Presumido, monthly: PIS and Cofins (cumulative) and ISS; exports pay none of them. */
export function presumidoMonthly({
  exports,
  issRate,
  revenueCents,
}: {
  exports: boolean;
  issRate: Decimal.Value;
  revenueCents: Cents;
}) {
  if (exports) return { cofinsCents: 0, issCents: 0, pisCents: 0 };
  const revenue = new Decimal(revenueCents);
  return {
    cofinsCents: toCents(revenue.times('0.03')),
    issCents: toCents(revenue.times(issRate)),
    pisCents: toCents(revenue.times('0.0065')),
  };
}

/**
 * Lucro Presumido, per quarter: IRPJ (15%, plus 10% of the presumed profit over R$ 60.000) and
 * CSLL (9%) on the presumed profit, 8% and 12% of the revenue in commerce, 32% in services.
 */
export function presumidoQuarterly(activity: CompanyActivity, revenueCents: Cents) {
  const services = activity === 'SERVICES' || activity === 'COMMERCE_SERVICES';
  const revenue = new Decimal(revenueCents);
  const irpjBase = revenue.times(services ? '0.32' : '0.08');
  const csllBase = revenue.times(services ? '0.32' : '0.12');
  return {
    csllCents: toCents(csllBase.times('0.09')),
    irpjCents: toCents(
      irpjBase.times('0.15').plus(Decimal.max(0, irpjBase.minus(6_000_000)).times('0.1'))
    ),
  };
}

/**
 * A CNPJ as the Receita writes it, without punctuation and in capitals, when its check digits hold;
 * `null` otherwise. From July 2026 the first 12 characters may be letters (IN RFB 2.229/2024): each
 * counts as its ASCII code minus 48, so digits keep their value.
 */
export function normalizeCnpj(input: string): string | null {
  const cnpj = input.toUpperCase().replace(/[^0-9A-Z]/g, '');
  if (!/^[0-9A-Z]{12}\d{2}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return null;
  const digit = (body: string) => {
    const weights = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2].slice(13 - body.length);
    const sum = [...body].reduce(
      (total, char, index) => total + (char.charCodeAt(0) - 48) * weights[index]!,
      0
    );
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  const first = digit(cnpj.slice(0, 12));
  const second = digit(cnpj.slice(0, 12) + first);
  return cnpj.endsWith(`${first}${second}`) ? cnpj : null;
}
