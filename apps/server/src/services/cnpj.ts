import { cnpjDigits, isValidCnpj } from '@zapbots/finance';

/**
 * A company as the Receita registers it, read from BrasilAPI (open data: no key, no personal data
 * sent; docs/adr/0024). Only reads: the Caishen never works out a company's taxes (docs/adr/0023).
 */
const BRASIL_API = 'https://brasilapi.com.br/api/cnpj/v1';
const TIMEOUT_MS = 15_000;
const USER_AGENT = 'caishen.app (+https://caishen.app)';
/** A registry changes slowly: one look a day per CNPJ is enough. */
const KEEP_MS = 24 * 60 * 60 * 1000;
const kept = new Map<string, { at: number; company: CompanyRegistry }>();

/** A refusal said to the User or the Model, in pt-BR. */
export class CnpjError extends Error {}

/** Whether the company opted into a regime, and when (`null` dates: never, or still in). */
export interface RegimeOption {
  opted: boolean;
  since: string | null;
  until: string | null;
}

export interface CompanyRegistry {
  cnae: { code: string; description: string } | null;
  city: string | null;
  cnpj: string;
  legalName: string;
  mei: RegimeOption | null;
  openedOn: string | null;
  simples: RegimeOption | null;
  /** "ATIVA", "BAIXADA", "INAPTA"… as the Receita writes it. */
  status: string;
  tradeName: string | null;
}

interface BrasilApiCnpj {
  cnae_fiscal: number | null;
  cnae_fiscal_descricao: string | null;
  cnpj: string;
  data_exclusao_do_mei: string | null;
  data_exclusao_do_simples: string | null;
  data_inicio_atividade: string | null;
  data_opcao_pelo_mei: string | null;
  data_opcao_pelo_simples: string | null;
  descricao_situacao_cadastral: string | null;
  municipio: string | null;
  nome_fantasia: string | null;
  opcao_pelo_mei: boolean | null;
  opcao_pelo_simples: boolean | null;
  razao_social: string;
  uf: string | null;
}

const blank = (value: string | null | undefined) => value?.trim() || null;

/**
 * BrasilAPI keeps the dates of a past option even when it is off, so a date only counts with the
 * option it belongs to: the exclusion when off, the start when on. A company that never opted can
 * carry the same date for both (Banco do Brasil does), which means no option at all.
 */
function regime(opted: boolean | null, since: string | null, until: string | null) {
  if (opted === null) return null;
  if (opted) return { opted, since: blank(since), until: null };
  if (!blank(until) || blank(since) === blank(until)) return { opted, since: null, until: null };
  return { opted, since: blank(since), until: blank(until) };
}

/** The company registered under `cnpj`; throws a CnpjError the User can read. */
export async function lookupCnpj(cnpj: string): Promise<CompanyRegistry> {
  const digits = cnpjDigits(cnpj);
  if (!isValidCnpj(digits)) throw new CnpjError('CNPJ inválido: confira os 14 números.');
  const hit = kept.get(digits);
  if (hit && Date.now() - hit.at < KEEP_MS) return hit.company;

  const response = await fetch(`${BRASIL_API}/${digits}`, {
    // BrasilAPI's firewall answers 403 to Node's own User-Agent.
    headers: { accept: 'application/json', 'user-agent': USER_AGENT },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  }).catch(() => null);
  if (response?.status === 404) throw new CnpjError('Esse CNPJ não está registrado na Receita.');
  if (!response?.ok) {
    throw new CnpjError('A consulta à Receita não respondeu agora. Tente de novo em instantes.');
  }
  const body = (await response.json()) as BrasilApiCnpj;
  const company: CompanyRegistry = {
    city: body.municipio ? `${body.municipio}${body.uf ? `/${body.uf}` : ''}` : null,
    cnae: body.cnae_fiscal
      ? { code: String(body.cnae_fiscal), description: body.cnae_fiscal_descricao ?? '' }
      : null,
    cnpj: digits,
    legalName: body.razao_social,
    mei: regime(body.opcao_pelo_mei, body.data_opcao_pelo_mei, body.data_exclusao_do_mei),
    openedOn: blank(body.data_inicio_atividade),
    simples: regime(
      body.opcao_pelo_simples,
      body.data_opcao_pelo_simples,
      body.data_exclusao_do_simples
    ),
    status: body.descricao_situacao_cadastral ?? 'Desconhecida',
    tradeName: blank(body.nome_fantasia),
  };
  kept.set(digits, { at: Date.now(), company });
  return company;
}

/** Forgets what was kept; for tests. */
export function forgetCnpjLookups() {
  kept.clear();
}
