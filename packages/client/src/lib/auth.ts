import {
  inferAdditionalFields,
  organizationClient,
  twoFactorClient,
} from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  basePath: '/api/auth',
  plugins: [
    organizationClient(),
    // The sign-in page reads `twoFactorRedirect` itself and asks for the code in place.
    twoFactorClient(),
    // Mirrors `user.additionalFields` in packages/auth.
    inferAdditionalFields({ user: { language: { required: false, type: 'string' } } }),
  ],
});
