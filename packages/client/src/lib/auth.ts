import { inferAdditionalFields, organizationClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  basePath: '/api/auth',
  plugins: [
    organizationClient(),
    // Mirrors `user.additionalFields` in packages/auth.
    inferAdditionalFields({ user: { language: { required: false, type: 'string' } } }),
  ],
});
