import { http, HttpResponse, type HttpHandler } from 'msw';

const OLINDA = 'https://olinda.bcb.gov.br/olinda/servico/taxaJuros/versao/v2/odata';

/**
 * Daily rates by modality, as Olinda publishes them: one row per institution, rates in % a.m.
 * Every row is in the same period, for Pessoa Física.
 */
export function marketRatesHandler(
  rates: Record<string, number[]>,
  period = '2026-10-01'
): HttpHandler {
  return http.get(`${OLINDA}/TaxasJurosDiariaPorInicioPeriodo`, () =>
    HttpResponse.json({
      value: Object.entries(rates).flatMap(([modality, values]) =>
        values.map(TaxaJurosAoMes => ({
          InicioPeriodo: period,
          Modalidade: modality,
          Segmento: 'PESSOA FÍSICA',
          TaxaJurosAoMes,
        }))
      ),
    })
  );
}

/** Olinda failing with a 500, counting the requests it gets. */
export function failingMarketRatesHandler(): { handler: HttpHandler; requests: () => number } {
  let count = 0;
  const handler = http.get(`${OLINDA}/TaxasJurosDiariaPorInicioPeriodo`, () => {
    count += 1;
    return HttpResponse.json({}, { status: 500 });
  });
  return { handler, requests: () => count };
}

/** Olinda's PTAX by period; matched by a pattern, as its address carries parentheses. */
const PTAX = /olinda\.bcb\.gov\.br\/olinda\/servico\/PTAX\/versao\/v1\/odata\/CotacaoDolarPeriodo/;

/** `'11-14-2025'` from Olinda's parameters back to `2025-11-14`. */
const isoOf = (olinda: string | null) => {
  const [month, day, year] = (olinda ?? '').replace(/'/g, '').split('-');
  return `${year}-${month}-${day}`;
};

/**
 * The dollar's PTAX by day, as Olinda publishes it: only the business days given in `buyRates`
 * (date → PTAX de compra) between the dates asked for. Counts the requests.
 */
export function ptaxHandler(buyRates: Record<string, number>): {
  handler: HttpHandler;
  requests: () => number;
} {
  let count = 0;
  const handler = http.get(PTAX, ({ request }) => {
    count += 1;
    const url = new URL(request.url);
    const from = isoOf(url.searchParams.get('@dataInicial'));
    const to = isoOf(url.searchParams.get('@dataFinalCotacao'));
    return HttpResponse.json({
      value: Object.entries(buyRates)
        .filter(([date]) => date >= from && date <= to)
        .map(([date, cotacaoCompra]) => ({
          cotacaoCompra,
          dataHoraCotacao: `${date} 13:04:29.519`,
        })),
    });
  });
  return { handler, requests: () => count };
}
