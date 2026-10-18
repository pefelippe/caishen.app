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
