import type { BetterAuthPlugin } from 'better-auth';
import { APIError, createAuthEndpoint } from 'better-auth/api';
import * as z from 'zod';

import { emailConfigured, localLinksEnabled, takeLocalLink } from './email';

/** Google sign-in is offered only when its OAuth client is configured. */
export const googleEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
);

/**
 * Tells the sign-in page which ways in this server offers. The email link is always on; `link`
 * says where it goes: by email, or back to the page on a local server with no email set up.
 */
export const signInMethods = () =>
  ({
    endpoints: {
      signInMethods: createAuthEndpoint('/sign-in-methods', { method: 'GET' }, async ctx =>
        ctx.json({
          google: googleEnabled,
          link: emailConfigured() ? 'email' : localLinksEnabled() ? 'page' : 'console',
        })
      ),
      localSignInLink: createAuthEndpoint(
        '/sign-in/local-link',
        { body: z.object({ email: z.string() }), method: 'POST' },
        async ctx => {
          if (!localLinksEnabled()) throw new APIError('NOT_FOUND');
          return ctx.json({ url: takeLocalLink(ctx.body.email) });
        }
      ),
    },
    id: 'sign-in-methods',
  }) satisfies BetterAuthPlugin;
