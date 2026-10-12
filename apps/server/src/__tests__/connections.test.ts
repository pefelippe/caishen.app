import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createViewer, gql } from '../../test/helpers';
import { modelListHandler, mswServer } from '../../test/msw/openrouter';

beforeAll(() => mswServer.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => mswServer.use(modelListHandler));
afterEach(() => mswServer.resetHandlers());
afterAll(() => mswServer.close());

const QUERY = `{ connections { kind category available connected detail unavailableReason } }`;

describe('connections', () => {
  it('lists one Connection per category: the Model provider, file storage and music', async () => {
    const { data, errors } = await gql(await createViewer(), QUERY);

    expect(errors).toEqual([]);
    expect(data.connections).toEqual([
      {
        available: true,
        category: 'AI',
        connected: true,
        detail: '2 Modelos, 1 gratuitos. Padrão: test/with-tools.',
        kind: 'OPENROUTER',
        unavailableReason: null,
      },
      {
        available: true,
        category: 'FILE_STORAGE',
        connected: false,
        detail: null,
        kind: 'GOOGLE_DRIVE',
        // The test User never signed in with Google.
        unavailableReason: expect.stringContaining('Entre com sua conta Google'),
      },
      {
        available: false,
        category: 'MUSIC',
        connected: false,
        detail: null,
        kind: 'SPOTIFY',
        unavailableReason: 'Em breve.',
      },
    ]);
  });

  it('says what is missing when the server has no OpenRouter key', async () => {
    const key = process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    try {
      const { data } = await gql(await createViewer(), QUERY);
      expect(data.connections[0]).toMatchObject({
        connected: false,
        kind: 'OPENROUTER',
        unavailableReason: expect.stringContaining('OPENROUTER_API_KEY'),
      });
    } finally {
      process.env.OPENROUTER_API_KEY = key;
    }
  });

  it('refuses a visitor who is not signed in', async () => {
    expect((await gql(null, QUERY)).errors).toEqual(['UNAUTHENTICATED']);
  });
});
