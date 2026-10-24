import { APICallError } from 'ai';

import { PROVIDERS, type ProviderName } from './providers';

/** A Model failure with a message fit to show the User, in pt-BR. */
export class ModelError extends Error {
  constructor(
    message: string,
    /** HTTP status of the failure, when there was one. */
    readonly status?: number
  ) {
    super(message);
  }

  /** True when another Model could still answer: out of credits, rate-limited or a server error. */
  get modelSpecific(): boolean {
    return this.status === 402 || this.status === 429 || (this.status ?? 0) >= 500;
  }
}

/** The ModelError for an HTTP failure of `provider`. */
export function failure(provider: ProviderName, status: number, detail: string): ModelError {
  const { envKey, label } = PROVIDERS[provider];
  if (status === 429) {
    return new ModelError(
      'O Modelo atingiu o limite de uso por agora. Modelos gratuitos têm limite diário; tente mais tarde ou escolha outro Modelo na página Equipe.',
      status
    );
  }
  if (status === 401 || status === 403) {
    return new ModelError(`A chave do ${label} foi recusada. Confira ${envKey}.`, status);
  }
  if (status === 402) {
    return new ModelError(
      `Este Modelo é pago e a conta do ${label} está sem créditos. Escolha um Modelo gratuito.`,
      status
    );
  }
  return new ModelError(`O Modelo não respondeu (${status}). ${detail}`.trim(), status);
}

/** The message a provider put in its error body, if it is JSON with one. */
function detailOf(error: APICallError): string {
  try {
    return (
      (JSON.parse(error.responseBody ?? '') as { error?: { message?: string } }).error?.message ??
      ''
    );
  } catch {
    // Not JSON; the status alone explains it.
    return '';
  }
}

/**
 * Any error out of a Model call as a ModelError, or as it was when it is not the Model's: an
 * abort, or a bug of ours.
 */
export function toModelError(provider: ProviderName, error: unknown): unknown {
  if (error instanceof ModelError) return error;
  if (APICallError.isInstance(error)) {
    return failure(
      provider,
      error.statusCode ?? 500,
      error.statusCode ? detailOf(error) : error.message
    );
  }
  // An error event in the middle of a stream, e.g. `{ code: 429, message }` from OpenRouter. A
  // plain object only: an abort's DOMException also has a `code`.
  if (
    error &&
    typeof error === 'object' &&
    !(error instanceof Error) &&
    'code' in error &&
    'message' in error
  ) {
    const { code, message } = error as { code: unknown; message: unknown };
    return failure(provider, Number(code) || 500, String(message ?? ''));
  }
  return error;
}
