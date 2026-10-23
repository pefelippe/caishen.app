import { db, schema } from '@zapbots/database';
import { addDays, Decimal, today } from '@zapbots/finance';
import { and, desc, eq, gte, lte } from 'drizzle-orm';

/**
 * The Banco Central's PTAX (Olinda open data: no key, no personal data). A salary paid in dollars
 * is sold to a bank, so the reference is the PTAX de compra. Rates are kept in `exchange_rate` once
 * fetched; a day without one (weekend, holiday) uses the last business day before it, and a day
 * still to come uses the latest rate there is.
 */
const PTAX =
  'https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)';
/** How far back a day looks for its last business day. */
const LOOKBACK_DAYS = 10;
const TIMEOUT_MS = 20_000;
/** Days still worth asking the Banco Central about when only an older rate is kept. */
const RECENT_DAYS = 4;
const LOOK_AGAIN_MS = 60 * 60 * 1000;
const lookedAt = new Map<string, number>();

/** Whether `date` was asked for within the hour; marks it as asked. */
function lookedRecently(date: string): boolean {
  const last = lookedAt.get(date);
  if (last && Date.now() - last < LOOK_AGAIN_MS) return true;
  lookedAt.set(date, Date.now());
  return false;
}

/** `2026-10-22` as Olinda wants it: `'10-22-2026'`. */
const olindaDate = (iso: string) => {
  const [year, month, day] = iso.split('-');
  return `'${month}-${day}-${year}'`;
};

interface PtaxRow {
  cotacaoCompra: number;
  dataHoraCotacao: string;
}

/** Fetches and keeps the PTAX of every business day between two dates. */
async function fetchPtax(from: string, to: string): Promise<void> {
  const url =
    `${PTAX}?@dataInicial=${olindaDate(from)}&@dataFinalCotacao=${olindaDate(to)}` +
    '&$format=json&$select=cotacaoCompra,dataHoraCotacao';
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) throw new Error(`Bacen PTAX ${response.status}`);
  const { value } = (await response.json()) as { value: PtaxRow[] };
  if (!value.length) return;
  await db
    .insert(schema.exchangeRate)
    .values(
      value.map(row => ({
        buyRate: String(row.cotacaoCompra),
        currency: 'USD' as const,
        date: row.dataHoraCotacao.slice(0, 10),
      }))
    )
    .onConflictDoNothing();
}

async function storedRate(date: string) {
  const [row] = await db
    .select()
    .from(schema.exchangeRate)
    .where(
      and(
        eq(schema.exchangeRate.currency, 'USD'),
        lte(schema.exchangeRate.date, date),
        gte(schema.exchangeRate.date, addDays(date, -LOOKBACK_DAYS))
      )
    )
    .orderBy(desc(schema.exchangeRate.date))
    .limit(1);
  return row ?? null;
}

/**
 * The dollar's PTAX de compra for a day, in reais per dollar, with the day it is from; `null` when
 * the Banco Central does not answer and nothing is kept for it.
 */
export async function dollarRate(date: string): Promise<{ date: string; rate: Decimal } | null> {
  const asOf = date > today() ? today() : date;
  let row = await storedRate(asOf);
  // A recent day may still be missing its own rate (the PTAX comes out after 1 p.m.): look again,
  // at most once an hour.
  const recent = asOf >= addDays(today(), -RECENT_DAYS);
  const stale = row && row.date !== asOf && recent && !lookedRecently(asOf);
  if (!row || stale) {
    try {
      await fetchPtax(addDays(asOf, -LOOKBACK_DAYS), asOf);
    } catch (error) {
      console.warn('[bacen] PTAX unavailable', error);
    }
    row = await storedRate(asOf);
  }
  return row ? { date: row.date, rate: new Decimal(row.buyRate) } : null;
}
