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

/** At least this long between two refreshes on coming back, so switching windows stays cheap. */
const REFRESH_GAP = 30_000;
let refreshedAt = Date.now();

/**
 * What is on screen was shown from the cache; when the User comes back to the tab or the network
 * returns, it is read again in the background and changes in place, without a skeleton.
 */
export function refreshOnReturn(): () => void {
  const refresh = (force: boolean) => {
    if (!force && Date.now() - refreshedAt < REFRESH_GAP) return;
    refreshedAt = Date.now();
    void apolloClient.refetchQueries({ include: 'active' }).catch(() => undefined);
  };
  const onVisible = () => document.visibilityState === 'visible' && refresh(false);
  const onOnline = () => refresh(true);
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('focus', onVisible);
  window.addEventListener('online', onOnline);
  return () => {
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('focus', onVisible);
    window.removeEventListener('online', onOnline);
  };
}
