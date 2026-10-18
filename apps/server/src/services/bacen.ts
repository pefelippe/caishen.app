/**
 * Bacen open data: no key, no personal data, so no Consent needed.
 * - SGS time series (Selic, CDI, IPCA): https://api.bcb.gov.br/dados/serie
 * - Interest rates by modality and institution: https://olinda.bcb.gov.br/olinda/servico/taxaJuros
 */
import { MODALITIES, addDays, today, type Modality } from '@zapbots/finance';

const SGS_SERIES = { cdi: 4389, ipca: 433, selic: 432 } as const;
const OLINDA = 'https://olinda.bcb.gov.br/olinda/servico/taxaJuros/versao/v2/odata';
const REAL_ESTATE_PREFIX = 'Financiamento imobiliário';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const FAILURE_TTL_MS = 5 * 60 * 1000;
const TIMEOUT_MS = 20_000;

const cache = new Map<string, { expiresAt: number; value: Promise<unknown> }>();

/**
 * Shares one load per key: concurrent callers wait on the same request. A failure is kept for a
 * few minutes too, so a slow or unavailable Bacen costs one timeout, not one per caller.
 */
function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value as Promise<T>;
  const value = load().catch(error => {
    cache.set(key, { expiresAt: Date.now() + FAILURE_TTL_MS, value });
    throw error;
  });
  // Rejections are handled by each caller; this keeps an unobserved one from crashing the process.
  value.catch(() => undefined);
  cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value });
  return value;
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) throw new Error(`Bacen ${response.status} for ${url}`);
  return (await response.json()) as T;
}

async function latestSgsValue(series: number): Promise<number | null> {
  try {
    const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${series}/dados/ultimos/1?formato=json`;
    const [point] = await cached(`sgs:${series}`, () =>
      getJson<{ data: string; valor: string }[]>(url)
    );
    return point ? Number(point.valor) : null;
  } catch (error) {
    console.warn(`[bacen] SGS ${series} unavailable`, error);
    return null;
  }
}

export async function marketIndicators() {
  const [selic, cdi, ipca] = await Promise.all([
    latestSgsValue(SGS_SERIES.selic),
    latestSgsValue(SGS_SERIES.cdi),
    latestSgsValue(SGS_SERIES.ipca),
  ]);
  return { cdi, ipca, selic };
}

interface RateRow {
  Modalidade: string;
  Segmento?: string;
  TaxaJurosAoMes: number;
}

/** Olinda rejects URLSearchParams output: `$` must stay literal and spaces must be `%20`. */
function odataUrl(resource: string, params: Record<string, string>) {
  const query = Object.entries({ $format: 'json', ...params })
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
  return `${OLINDA}/${resource}?${query}`;
}

/**
 * Rows for the most recent period of a rate resource. Sorting the whole dataset server side is
 * slow, so fetch a recent window and keep its latest period.
 */
async function latestPeriodRates(
  resource: string,
  periodField: string,
  since: string
): Promise<{ period: string; rows: RateRow[] }> {
  return cached(`olinda:${resource}`, async () => {
    const page = await getJson<{ value: (RateRow & Record<string, unknown>)[] }>(
      odataUrl(resource, { $filter: `${periodField} ge '${since}'`, $top: '20000' })
    );
    const period = page.value
      .map(row => String(row[periodField]))
      .sort()
      .at(-1);
    if (!period) throw new Error(`No ${resource} data since ${since}`);
    return { period, rows: page.value.filter(row => row[periodField] === period) };
  });
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

/** Market Rate: median monthly rate across institutions for a Modality (Pessoa Física). */
export async function marketRate(modality: Modality) {
  const bacenName = MODALITIES[modality].bacenName;
  if (!bacenName) return null;
  try {
    const isRealEstate = bacenName.startsWith(REAL_ESTATE_PREFIX);
    const { period, rows } = isRealEstate
      ? await latestPeriodRates(
          'TaxasJurosMensalPorMes',
          'anoMes',
          addDays(today(), -120).slice(0, 7)
        )
      : await latestPeriodRates(
          'TaxasJurosDiariaPorInicioPeriodo',
          'InicioPeriodo',
          addDays(today(), -30)
        );
    const rates = rows
      .filter(row => row.Modalidade === bacenName)
      .filter(row => isRealEstate || row.Segmento === 'PESSOA FÍSICA')
      .map(row => row.TaxaJurosAoMes);
    if (rates.length === 0) return null;
    return { institutions: rates.length, monthlyRate: median(rates) / 100, period };
  } catch (error) {
    console.warn(`[bacen] market rate for ${modality} unavailable`, error);
    return null;
  }
}

/** Market Rates of several Modalities at once, fetched in parallel; `null` where unavailable. */
export async function marketRates(modalities: Modality[]) {
  const distinct = [...new Set(modalities)];
  const rates = await Promise.all(distinct.map(modality => marketRate(modality)));
  return new Map(distinct.map((modality, index) => [modality, rates[index] ?? null]));
}
