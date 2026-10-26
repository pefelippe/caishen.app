import { db, schema } from '@zapbots/database';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { organization, twoFactor } from 'better-auth/plugins';
import { and, asc, eq } from 'drizzle-orm';

import { sendResetPasswordEmail } from './email';
import { googleEnabled, signInMethods } from './methods';
import { ensurePersonalOrganization } from './personal';

const clientOrigin = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';

export const auth = betterAuth({
  // Two ways in: email and password, and Google. Linking lets someone who signed up with a password
  // later use Google with the same address; Users without a password (Google, or the old email
  // links) get one through "Esqueci minha senha".
  account: { accountLinking: { trustedProviders: ['google'] } },
  basePath: '/api/auth',
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  databaseHooks: {
    account: {
      create: {
        // Google vouches for the address. If someone had signed up with it and a password without
        // owning it (nothing proves it at sign-up), that password must not survive the link.
        before: async account => {
          if (account.providerId !== 'google') return;
          const [user] = await db
            .select({ emailVerified: schema.user.emailVerified })
            .from(schema.user)
            .where(eq(schema.user.id, account.userId));
          if (user && !user.emailVerified) {
            await db
              .delete(schema.account)
              .where(
                and(
                  eq(schema.account.userId, account.userId),
                  eq(schema.account.providerId, 'credential')
                )
              );
          }
        },
      },
    },
    user: {
      create: {
        // A sign-up may bring no name: start from the address, editable on Perfil.
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
          return {
            data: {
              ...session,
              activeOrganizationId: membership?.organizationId ?? null,
            },
          };
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // Choosing a new password signs out every other browser.
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: ({ url, user }) => sendResetPasswordEmail(user.email, url),
  },
  plugins: [
    organization(),
    signInMethods(),
    // A code from an authenticator app after the password, once the User turns it on in Perfil
    // (docs/adr/0026). Google sign-in is left to Google's own verification.
    twoFactor({ issuer: 'Caishen' }),
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
  // On Vercel the same deploy also answers on its own URLs (the deploy, the branch, the project's
  // production alias); signing in from any of them must work, not only from CLIENT_ORIGIN.
  trustedOrigins: [
    clientOrigin,
    ...[
      process.env.VERCEL_URL,
      process.env.VERCEL_BRANCH_URL,
      process.env.VERCEL_PROJECT_PRODUCTION_URL,
    ]
      .filter(Boolean)
      .map(host => `https://${host}`),
  ],
  user: {
    // The app's language, kept with the User so it follows them to any browser.
    additionalFields: {
      language: { defaultValue: 'pt', required: false, type: 'string' },
    },
  },
});

export type Session = typeof auth.$Infer.Session;
