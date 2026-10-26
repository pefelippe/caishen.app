import { addDays, today } from '@zapbots/finance';

import { dollarRate } from './exchange';

/**
 * The market's figures for the Dashboard, all open data from the Banco Central (no key, nothing of
 * the User sent): the dollar's PTAX (`services/exchange.ts`) and, from the SGS, the Selic target,
 * the CDI and the IPCA over 12 months. Each is `null` when its source does not answer.
 */
const SGS = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs';
const TIMEOUT_MS = 15_000;
/** They change at most once a day: one look an hour is plenty. */
const KEEP_MS = 60 * 60 * 1000;

/** SGS series codes, each in % a year as published. */
const SERIES = {
  /** CDI, annualized on 252 days; one value per business day. */
  cdi: 4389,
  /** IPCA over the last 12 months; one value per month. */
  ipca12m: 13522,
  /** Selic target set by the Copom; one value per day, published ahead to the next meeting. */
  selic: 432,
} as const;

type SeriesKey = keyof typeof SERIES;

/** A published figure: `rate` a year as a fraction (0.1375 = 13,75% a.a.), from `date`. */
export interface Indicator {
  date: string;
  rate: number;
}

export interface Indicators {
  cdi: Indicator | null;
  /** The PTAX de compra, in reais per dollar, and its change since the business day before. */
  dollar: { change: number | null; date: string; rate: number } | null;
  ipca12m: Indicator | null;
  selic: Indicator | null;
}

const kept = new Map<SeriesKey, { at: number; value: Indicator }>();

/** `23/10/2026` as `2026-10-23`. */
const isoDate = (date: string) => date.split('/').reverse().join('-');

/** The latest value of a series up to today; the one kept when the SGS does not answer. */
async function latest(key: SeriesKey): Promise<Indicator | null> {
  const hit = kept.get(key);
  if (hit && Date.now() - hit.at < KEEP_MS) return hit.value;
  try {
    const response = await fetch(`${SGS}.${SERIES[key]}/dados/ultimos/20?formato=json`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`SGS ${SERIES[key]} ${response.status}`);
    const rows = (await response.json()) as { data: string; valor: string }[];
    const now = today();
    const last = rows
      .map(row => ({ date: isoDate(row.data), rate: Number(row.valor) / 100 }))
      .filter(row => row.date <= now && Number.isFinite(row.rate))
      .sort((a, b) => a.date.localeCompare(b.date))
      .at(-1);
    if (!last) throw new Error(`SGS ${SERIES[key]} empty`);
    kept.set(key, { at: Date.now(), value: last });
    return last;
  } catch (error) {
    console.warn('[bacen] SGS unavailable', error);
    return hit?.value ?? null;
  }
}

async function dollar(): Promise<Indicators['dollar']> {
  const current = await dollarRate(today());
  if (!current) return null;
  const before = await dollarRate(addDays(current.date, -1));
  return {
    change:
      before && before.date !== current.date
        ? current.rate.div(before.rate).minus(1).toNumber()
        : null,
    date: current.date,
    rate: current.rate.toNumber(),
  };
}

export async function indicators(): Promise<Indicators> {
  const [cdi, dollarNow, ipca12m, selic] = await Promise.all([
    latest('cdi'),
    dollar(),
    latest('ipca12m'),
    latest('selic'),
  ]);
  return { cdi, dollar: dollarNow, ipca12m, selic };
}

/** Forgets what was kept; for tests. */
export function forgetIndicators() {
  kept.clear();
}
