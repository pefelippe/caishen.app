import { db, schema, type CompanyRow } from '@zapbots/database';
import {
  addMonths,
  dateInMonth,
  employerPaysCpp,
  meiDas,
  presumidoMonthly,
  presumidoQuarterly,
  proLabore,
  simplesAnnexFor,
  simplesDas,
  type Cents,
  type Decimal,
} from '@zapbots/finance';
import { eq } from 'drizzle-orm';

import { incomePayments } from './income';

/** `YYYY-MM` moved by `months`. */
const shift = (month: string, months: number) => addMonths(`${month}-01`, months).slice(0, 7);

/** "09/2026". */
const competenceName = (month: string) => `${month.slice(5)}/${month.slice(0, 4)}`;

/** A guide a company pays for one competência: what it is, how much and when it is due. */
export interface TaxGuide {
  amountCents: Cents;
  /** The competência it pays, `YYYY-MM` (for a quarter, its last month). */
  competence: string;
  /** What makes up the amount, in words. */
  detail: string;
  dueDate: string;
  name: string;
}

/** Where a competência's revenue comes from: typed, the Fonte de Renda it arrives as, or none. */
export type RevenueOrigin = 'DECLARED' | 'INCOME_SOURCE' | 'NONE';

/**
 * A company's months as the taxes see them: each competência's revenue (as declared, else what its
 * Fonte de Renda brought in that month) and its RBT12, read once per call and kept.
 */
export function companyBooks(company: CompanyRow) {
  const startMonth = company.startsOn.slice(0, 7);
  let declared: Promise<Map<string, { amountCents: Cents; rbt12Cents: Cents | null }>> | null =
    null;
  let source: Promise<typeof schema.incomeSource.$inferSelect | undefined> | null = null;
  const fromSource = new Map<string, Promise<Cents>>();

  const declaredRows = () =>
    (declared ??= db
      .select()
      .from(schema.companyRevenue)
      .where(eq(schema.companyRevenue.companyId, company.id))
      .then(rows => new Map(rows.map(row => [row.month, row]))));

  const sourceRevenue = (month: string) => {
    if (!company.revenueSourceId) return Promise.resolve(0);
    let cached = fromSource.get(month);
    if (!cached) {
      cached = (async () => {
        source ??= db
          .select()
          .from(schema.incomeSource)
          .where(eq(schema.incomeSource.id, company.revenueSourceId!))
          .then(rows => rows[0]);
        const row = await source;
        if (!row) return 0;
        const payments = await incomePayments(row, month);
        return payments.reduce((total, payment) => total + payment.amountCents, 0);
      })();
      fromSource.set(month, cached);
    }
    return cached;
  };

  const revenue = async (month: string): Promise<{ amountCents: Cents; origin: RevenueOrigin }> => {
    if (month < startMonth) return { amountCents: 0, origin: 'NONE' };
    const row = (await declaredRows()).get(month);
    if (row) return { amountCents: row.amountCents, origin: 'DECLARED' };
    if (company.revenueSourceId) {
      return { amountCents: await sourceRevenue(month), origin: 'INCOME_SOURCE' };
    }
    return { amountCents: 0, origin: 'NONE' };
  };

  /**
   * The revenue of the 12 months before `month`, as typed for it, or added up. A company younger
   * than a year multiplies its average month by 12 (LC 123, art. 18, §2º); in its first month, its
   * own revenue times 12.
   */
  const rbt12 = async (month: string): Promise<{ cents: Cents; typed: boolean }> => {
    const typed = (await declaredRows()).get(month)?.rbt12Cents;
    if (typed != null) return { cents: typed, typed: true };
    const months = Array.from({ length: 12 }, (_, index) => shift(month, index - 12)).filter(
      item => item >= startMonth
    );
    if (!months.length) return { cents: (await revenue(month)).amountCents * 12, typed: false };
    const amounts = await Promise.all(months.map(item => revenue(item)));
    const total = amounts.reduce((sum, item) => sum + item.amountCents, 0);
    return {
      cents: months.length < 12 ? Math.round((total / months.length) * 12) : total,
      typed: false,
    };
  };

  return { revenue, rbt12 };
}

/** The Simples Nacional of one competência: its revenue, RBT12, Anexo, bracket, rate and DAS. */
async function simplesOf(
  company: CompanyRow,
  books: ReturnType<typeof companyBooks>,
  month: string
) {
  const [revenue, rbt12] = await Promise.all([books.revenue(month), books.rbt12(month)]);
  const annex = simplesAnnexFor(
    company.annex ?? 'III',
    company.fatorR,
    company.proLaboreCents * 12,
    rbt12.cents
  );
  const das = simplesDas({
    annex,
    exports: company.exports,
    rbt12Cents: rbt12.cents,
    revenueCents: revenue.amountCents,
  });
  return { das, rbt12, revenue };
}

/** A fraction as people read it: 0.03054 → "3,05%". */
const percent = (fraction: Decimal) => `${fraction.times(100).toFixed(2).replace('.', ',')}%`;

/**
 * Every guide a company pays for one competência (`month`), due the month after: the DAS (Simples
 * or MEI), the DARF of the pró-labore, and the Lucro Presumido's PIS, Cofins and ISS; at the end of
 * a quarter, its IRPJ and CSLL. Lucro Real is left to the accountant: none are worked out.
 */
export async function guidesForCompetence(
  company: CompanyRow,
  month: string,
  books = companyBooks(company)
): Promise<TaxGuide[]> {
  if (month < company.startsOn.slice(0, 7)) return [];
  const next = shift(month, 1);
  const due = (day: number) => dateInMonth(next, day);
  const guides: TaxGuide[] = [];
  const competence = competenceName(month);

  if (company.regime === 'MEI') {
    guides.push({
      amountCents: meiDas(company.activity),
      competence: month,
      detail: 'Valor fixo do MEI: 5% do salário mínimo para o INSS, mais ICMS e/ou ISS',
      dueDate: due(20),
      name: `DAS-MEI · ${competence}`,
    });
    return guides;
  }
  if (company.regime === 'SIMPLES') {
    const { das, revenue } = await simplesOf(company, books, month);
    if (das.dasCents > 0) {
      guides.push({
        amountCents: das.dasCents,
        competence: month,
        detail: `Anexo ${das.annex}, faixa ${das.bracket}: ${percent(das.rate)} de ${(
          revenue.amountCents / 100
        ).toLocaleString('pt-BR', { currency: 'BRL', style: 'currency' })}`,
        dueDate: due(20),
        name: `DAS · ${competence}`,
      });
    }
  }

  if (company.proLaboreCents > 0) {
    const pay = proLabore(company.proLaboreCents, employerPaysCpp(company.regime, company.annex));
    const parts = [
      `INSS 11% ${(pay.inssCents / 100).toFixed(2).replace('.', ',')}`,
      pay.irrfCents > 0 && `IRRF ${(pay.irrfCents / 100).toFixed(2).replace('.', ',')}`,
      pay.employerInssCents > 0 &&
        `INSS da empresa 20% ${(pay.employerInssCents / 100).toFixed(2).replace('.', ',')}`,
    ].filter(Boolean);
    guides.push({
      amountCents: pay.inssCents + pay.irrfCents + pay.employerInssCents,
      competence: month,
      detail: `Pró-labore: ${parts.join(' + ')}`,
      dueDate: due(20),
      name: `DARF · pró-labore ${competence}`,
    });
  }

  // Lucro Real: only the pró-labore's DARF; the rest is the accountant's.
  if (company.regime === 'PRESUMIDO') {
    const { amountCents } = await books.revenue(month);
    const monthly = presumidoMonthly({
      exports: company.exports,
      issRate: company.issRate ?? '0.05',
      revenueCents: amountCents,
    });
    if (monthly.pisCents + monthly.cofinsCents > 0) {
      guides.push({
        amountCents: monthly.pisCents + monthly.cofinsCents,
        competence: month,
        detail: 'PIS 0,65% e Cofins 3% do faturamento',
        dueDate: due(25),
        name: `DARF · PIS e Cofins ${competence}`,
      });
    }
    if (monthly.issCents > 0) {
      guides.push({
        amountCents: monthly.issCents,
        competence: month,
        detail: 'ISS do município sobre o faturamento',
        dueDate: due(10),
        name: `ISS · ${competence}`,
      });
    }
    // IRPJ and CSLL close with the quarter (March, June, September, December).
    if (Number(month.slice(5)) % 3 === 0) {
      const quarter = [shift(month, -2), shift(month, -1), month];
      const revenues = await Promise.all(quarter.map(item => books.revenue(item)));
      const total = revenues.reduce((sum, item) => sum + item.amountCents, 0);
      const { csllCents, irpjCents } = presumidoQuarterly(company.activity, total);
      const quarterName = `${Number(month.slice(5)) / 3}º trimestre de ${month.slice(0, 4)}`;
      if (irpjCents > 0) {
        guides.push({
          amountCents: irpjCents,
          competence: month,
          detail: 'IRPJ 15% (mais 10% acima de R$ 60.000) sobre o lucro presumido do trimestre',
          dueDate: dateInMonth(next, 31),
          name: `DARF · IRPJ ${quarterName}`,
        });
      }
      if (csllCents > 0) {
        guides.push({
          amountCents: csllCents,
          competence: month,
          detail: 'CSLL 9% sobre o lucro presumido do trimestre',
          dueDate: dateInMonth(next, 31),
          name: `DARF · CSLL ${quarterName}`,
        });
      }
    }
  }
  return guides;
}

/** The guides that fall due in `yearMonth`: those of the competência before it. */
export async function guidesDueIn(holderId: string, yearMonth: string): Promise<TaxGuide[]> {
  const [company] = await db
    .select()
    .from(schema.company)
    .where(eq(schema.company.holderId, holderId));
  if (!company) return [];
  return guidesForCompetence(company, shift(yearMonth, -1));
}

/** One competência of a company, for its Impostos page. */
export async function companyMonth(
  company: CompanyRow,
  month: string,
  books = companyBooks(company)
) {
  const [revenue, rbt12, guides] = await Promise.all([
    books.revenue(month),
    books.rbt12(month),
    guidesForCompetence(company, month, books),
  ]);
  const simples =
    company.regime === 'SIMPLES' ? (await simplesOf(company, books, month)).das : null;
  return {
    annex: simples?.annex ?? null,
    bracket: simples?.bracket ?? null,
    effectiveRate: simples ? simples.rate.toNumber() : null,
    guides,
    month,
    nominalRate: simples ? simples.nominalRate.toNumber() : null,
    overLimit: simples?.overLimit ?? false,
    rbt12Cents: rbt12.cents,
    rbt12Typed: rbt12.typed,
    revenueCents: revenue.amountCents,
    revenueOrigin: revenue.origin,
  };
}

/** The last `count` competências up to `upTo`, newest first. */
export async function companyMonths(company: CompanyRow, upTo: string, count: number) {
  const books = companyBooks(company);
  const months = Array.from({ length: count }, (_, index) => shift(upTo, -index)).filter(
    month => month >= company.startsOn.slice(0, 7)
  );
  return Promise.all(months.map(month => companyMonth(company, month, books)));
}
