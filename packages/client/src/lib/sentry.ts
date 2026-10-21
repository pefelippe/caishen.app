import * as Sentry from '@sentry/react';

/**
 * Error monitoring in the browser, on only when `VITE_SENTRY_DSN` is set at build time. Errors
 * only: no traces, no session replays, and none of the User's data (cookies, bodies, user fields).
 */
const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
if (dsn) {
  Sentry.init({
    dataCollection: { cookies: false, httpBodies: [], userInfo: false },
    dsn,
    environment: import.meta.env.MODE,
  });
}

/** For `createRoot`: errors React could not recover from (or caught by a boundary) go to Sentry. */
export const rootErrorOptions = dsn
  ? {
      onCaughtError: Sentry.reactErrorHandler(),
      onRecoverableError: Sentry.reactErrorHandler(),
      onUncaughtError: Sentry.reactErrorHandler(),
    }
  : {};
