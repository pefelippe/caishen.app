import { http, HttpResponse, type HttpHandler } from 'msw';

const CNPJ = 'https://brasilapi.com.br/api/cnpj/v1/:cnpj';

/** A company as BrasilAPI answers it: a Simples optant since 2021, out of the MEI in 2020. */
export const COMPANY = {
  cnae_fiscal: 6201501,
  cnae_fiscal_descricao: 'Desenvolvimento de programas de computador sob encomenda',
  cnpj: '11222333000181',
  data_exclusao_do_mei: '2020-12-31',
  data_exclusao_do_simples: null,
  data_inicio_atividade: '2019-03-15',
  data_opcao_pelo_mei: '2019-03-15',
  data_opcao_pelo_simples: '2021-01-01',
  descricao_situacao_cadastral: 'ATIVA',
  municipio: 'SAO PAULO',
  nome_fantasia: 'ANA DEV',
  opcao_pelo_mei: false,
  opcao_pelo_simples: true,
  razao_social: 'ANA DESENVOLVIMENTO LTDA',
  uf: 'SP',
};

/**
 * A company that never opted into either, as BrasilAPI really answers Banco do Brasil: the same
 * date to opt in and to leave.
 */
export const NEVER_OPTED = {
  ...COMPANY,
  cnpj: '00000000000191',
  data_exclusao_do_mei: '2009-07-01',
  data_exclusao_do_simples: '2007-07-01',
  data_opcao_pelo_mei: '2009-07-01',
  data_opcao_pelo_simples: '2007-07-01',
  opcao_pelo_simples: false,
  razao_social: 'BANCO DO BRASIL SA',
};

/** BrasilAPI knowing only `COMPANY` and `NEVER_OPTED`; any other CNPJ is a 404. Counts the requests. */
export function cnpjHandler(): { handler: HttpHandler; requests: () => number } {
  let count = 0;
  const handler = http.get(CNPJ, ({ params }) => {
    count++;
    const company = [COMPANY, NEVER_OPTED].find(known => known.cnpj === params.cnpj);
    return company
      ? HttpResponse.json(company)
      : HttpResponse.json({ message: 'CNPJ não encontrado' }, { status: 404 });
  });
  return { handler, requests: () => count };
}

/** BrasilAPI down. */
export const failingCnpjHandler = http.get(CNPJ, () => new HttpResponse(null, { status: 503 }));
