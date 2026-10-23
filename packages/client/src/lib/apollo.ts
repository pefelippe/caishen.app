import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from '@apollo/client';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { RetryLink } from '@apollo/client/link/retry';

/**
 * Queries that fail to reach the server (the connection drops, the server restarts) are tried
 * again a few times before the page shows an error. Mutations are never retried: one could be
 * written twice. Errors the server gives on purpose (GraphQL errors) are not retried either.
 */
const retry = new RetryLink({
  attempts: {
    max: 4,
    retryIf: (error, operation) =>
      !CombinedGraphQLErrors.is(error) &&
      operation.query.definitions.some(
        definition => definition.kind === 'OperationDefinition' && definition.operation === 'query'
      ),
  },
  delay: { initial: 400, jitter: true, max: 3000 },
});

export const apolloClient = new ApolloClient({
  cache: new InMemoryCache({
    typePolicies: {
      // A month's line carries the id of what it comes from (a Fonte de Renda paid on the 15th and
      // the 30th is two lines with one id), so lines are kept as they come, never merged by id.
      MonthLine: { keyFields: false },
    },
  }),
  link: ApolloLink.from([retry, new HttpLink({ credentials: 'same-origin', uri: '/graphql' })]),
});
