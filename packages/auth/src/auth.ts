import { db, schema } from '@zapbots/database';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { magicLink, organization } from 'better-auth/plugins';
import { asc, eq } from 'drizzle-orm';

import { sendMagicLinkEmail } from './email';
import { googleEnabled, signInMethods } from './methods';
import { ensurePersonalOrganization } from './personal';

const clientOrigin = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';

export const auth = betterAuth({
  // Two ways in, neither with a password: Google, and a sign-in link sent by email. The first
  // sign-in creates the User. Linking lets someone who came in by email later use Google with the
  // same address (and pre-existing email/password Users keep their Organizations).
  account: { accountLinking: { trustedProviders: ['google'] } },
  basePath: '/api/auth',
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  databaseHooks: {
    user: {
      create: {
        // An email link brings no name: start from the address, editable on Perfil.
        before: async user => ({
          data: { ...user, name: user.name || user.email.split('@')[0] },
        }),
      },
    },
    session: {
      create: {
        // Land every new session in the oldest Organization the user belongs to. Users from
        // before the personal Organization existed get theirs here.
        before: async session => {
          const [user] = await db
            .select({ name: schema.user.name })
            .from(schema.user)
            .where(eq(schema.user.id, session.userId));
          await ensurePersonalOrganization(session.userId, user?.name || 'Pessoal');
          const [membership] = await db
            .select({ organizationId: schema.member.organizationId })
            .from(schema.member)
            .where(eq(schema.member.userId, session.userId))
            .orderBy(asc(schema.member.createdAt))
            .limit(1);
          return { data: { ...session, activeOrganizationId: membership?.organizationId ?? null } };
        },
      },
    },
  },
  plugins: [
    organization(),
    magicLink({
      expiresIn: 15 * 60,
      sendMagicLink: ({ email, url }) => sendMagicLinkEmail(email, url),
    }),
    signInMethods(),
  ],
  secret: process.env.BETTER_AUTH_SECRET,
  socialProviders: googleEnabled
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID as string,
          // Offline access yields the refresh token the Google Drive Connection needs.
          accessType: 'offline',
          clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
          prompt: 'select_account',
        },
      }
    : {},
  trustedOrigins: [clientOrigin],
  user: {
    // The app's language, kept with the User so it follows them to any browser.
    additionalFields: { language: { defaultValue: 'pt', required: false, type: 'string' } },
  },
});

export type Session = typeof auth.$Infer.Session;
