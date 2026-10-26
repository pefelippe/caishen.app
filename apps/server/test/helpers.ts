import { ApolloServer } from '@apollo/server';
import type { Viewer } from '@zapbots/auth';
import { db, schema } from '@zapbots/database';
import { type Context, typeDefs } from '@zapbots/graphql/server';

import { resolvers } from '../src/resolvers';
import { saveAiKey } from '../src/services/aiKeys';

const apollo = new ApolloServer<Context>({ resolvers, typeDefs });

/**
 * A new User with their own Organization, as the first sign-in leaves them, plus an OpenRouter key
 * pasted on Integrações (`aiKey: false` leaves it out).
 */
export async function createViewer(
  name = 'Ana',
  { aiKey = true }: { aiKey?: boolean } = {}
): Promise<Viewer> {
  const userId = crypto.randomUUID();
  const organizationId = crypto.randomUUID();
  await db
    .insert(schema.user)
    .values({ email: `${userId}@test.local`, emailVerified: true, id: userId, name });
  await db
    .insert(schema.organization)
    .values({ id: organizationId, name, slug: `test-${organizationId}` });
  await db
    .insert(schema.member)
    .values({ id: crypto.randomUUID(), organizationId, role: 'owner', userId });
  const viewer: Viewer = { organizationId, role: 'owner', userId };
  if (aiKey) await saveAiKey(viewer, 'openrouter', 'test-openrouter-key');
  return viewer;
}

interface Result {
  // Test queries are ad hoc, so their data is read untyped.
  // oxlint-disable-next-line typescript/no-explicit-any
  data: any;
  /** `extensions.code` of each error, e.g. `NOT_FOUND`. */
  errors: string[];
}

/**
 * Runs a GraphQL operation as `viewer` through the real schema and resolvers; `context` adds what
 * the request's headers would (e.g. `idempotencyKey`).
 */
export async function gql(
  viewer: Viewer | null,
  query: string,
  variables: Record<string, unknown> = {},
  context: Omit<Context, 'viewer'> = {}
): Promise<Result> {
  const response = await apollo.executeOperation(
    { query, variables },
    { contextValue: { ...context, viewer } }
  );
  if (response.body.kind !== 'single') throw new Error('Unexpected incremental response');
  const { data, errors } = response.body.singleResult;
  return {
    data: data ?? null,
    errors: (errors ?? []).map(error => String(error.extensions?.code ?? error.message)),
  };
}
