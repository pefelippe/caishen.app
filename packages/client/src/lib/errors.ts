import { CombinedGraphQLErrors, ServerError } from '@apollo/client/errors';

const GENERIC = 'Algo deu errado. Tente de novo em instantes.';
const OFFLINE = 'Não conseguimos falar com o servidor. Confira a sua conexão e tente de novo.';

/** What an HTTP status means to the User, without the number. */
function byStatus(status: number): string {
  if (status === 401) return 'Sua sessão expirou. Entre de novo para continuar.';
  if (status === 403) return 'Você não tem permissão para fazer isso.';
  if (status === 404) return 'Não encontramos o que você procurava.';
  if (status === 413)
    return 'O envio ficou grande demais. Tente com um arquivo menor ou em partes.';
  if (status === 429) return 'Muitas tentativas seguidas. Espere um pouco e tente de novo.';
  if (status >= 500) return 'Algo deu errado do nosso lado. Tente de novo em instantes.';
  return 'Não foi possível concluir o pedido. Tente de novo.';
}

/**
 * GraphQL errors the server threw on purpose carry a message for the User (resolvers write them in
 * Portuguese; anything else the server answers in general words). Those it did not, the schema
 * rejecting a value or a query, carry developer text and get a general message instead.
 */
const TECHNICAL_CODES = new Set([
  'GRAPHQL_PARSE_FAILED',
  'GRAPHQL_VALIDATION_FAILED',
  'BAD_REQUEST',
  'PERSISTED_QUERY_NOT_FOUND',
  'OPERATION_RESOLUTION_FAILURE',
]);

/** Text that only a developer should read: status codes, fetch and parser errors, schema errors. */
const TECHNICAL_TEXT =
  /status code|response not successful|failed to fetch|networkerror|load failed|unexpected token|json|variable "\$|cannot query field|graphql|econn|timeout/i;

/**
 * Any error, in the User's words: the server's own reason when it gave one for people, or what
 * went wrong said plainly. Never a status code or a stack.
 */
export function friendlyError(error: unknown, fallback = GENERIC): string {
  if (CombinedGraphQLErrors.is(error)) {
    const first = error.errors[0];
    const code = first?.extensions?.code;
    if (!first || (typeof code === 'string' && TECHNICAL_CODES.has(code))) return fallback;
    if (code === 'UNAUTHENTICATED') return byStatus(401);
    return friendlyText(first.message, fallback);
  }
  if (ServerError.is(error)) return byStatus(error.statusCode);
  if (error instanceof TypeError) return OFFLINE;
  if (error instanceof Error) return friendlyText(error.message, fallback);
  if (typeof error === 'string') return friendlyText(error, fallback);
  return fallback;
}

/** A message as it is, unless it reads like something for a developer. */
export function friendlyText(message: string | null | undefined, fallback = GENERIC): string {
  const text = message?.trim();
  if (!text || TECHNICAL_TEXT.test(text)) {
    const status = text?.match(/status code (\d{3})/i)?.[1];
    return status ? byStatus(Number(status)) : fallback;
  }
  return text;
}
