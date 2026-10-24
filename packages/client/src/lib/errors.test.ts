import { CombinedGraphQLErrors, ServerError } from '@apollo/client/errors';
import { describe, expect, it } from 'vitest';

import { friendlyError, friendlyText } from './errors';

describe('friendlyError', () => {
  it('says what a status means without its number', () => {
    const tooLarge = new ServerError('Response not successful: Received status code 413', {
      bodyText: '',
      response: new Response(null, { status: 413 }),
    });
    const message = friendlyError(tooLarge);
    expect(message).not.toMatch(/413|status/i);
    expect(message).toMatch(/grande demais/);
  });

  it("keeps the reason a resolver wrote for people, and hides the schema's", () => {
    const ours = new CombinedGraphQLErrors({
      errors: [{ extensions: { code: 'BAD_USER_INPUT' }, message: 'Escolha um cartão.' }],
    });
    const schema = new CombinedGraphQLErrors({
      errors: [
        {
          extensions: { code: 'GRAPHQL_VALIDATION_FAILED' },
          message: 'Cannot query field "x" on type "Query".',
        },
      ],
    });
    expect(friendlyError(ours)).toBe('Escolha um cartão.');
    expect(friendlyError(schema)).toBe('Algo deu errado. Tente de novo em instantes.');
  });

  it('turns a failed fetch into a connection problem', () => {
    expect(friendlyError(new TypeError('Failed to fetch'))).toMatch(/conexão/);
  });
});

describe('friendlyText', () => {
  it('replaces developer text, even with a status inside', () => {
    expect(friendlyText('Response not successful: Received status code 500')).toMatch(/nosso lado/);
    expect(friendlyText('O link expirou.')).toBe('O link expirou.');
  });
});
