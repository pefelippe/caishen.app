import * as Sentry from '@sentry/node';

/**
 * Error monitoring, on only when `SENTRY_DSN` is set. Imported first by `app.ts`, so it is set up
 * before anything else loads. Errors only, and none of the User's data: no cookies, bodies, query
 * strings, GraphQL variables, Model prompts, query data or local variables (they hold money and
 * Conversations).
 */
const dsn = process.env.SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
    dataCollection: {
      cookies: false,
      databaseQueryData: false,
      genAI: { inputs: false, outputs: false },
      graphQL: { document: true, variables: false },
      httpBodies: [],
      stackFrameVariables: false,
      userInfo: false,
    },
    // Query strings can carry secrets (Pluggy's webhook token), so they stay out too.
    beforeSend(event) {
      if (event.request) {
        delete event.request.query_string;
        if (event.request.url) event.request.url = event.request.url.split('?')[0];
      }
      return event;
    },
  });
}

/** Reports an error we caught and answered ourselves; a no-op without `SENTRY_DSN`. */
export function reportError(error: unknown) {
  if (dsn) Sentry.captureException(error);
}

export { Sentry };
