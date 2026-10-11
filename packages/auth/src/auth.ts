import { db, schema } from '@mny/database';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { organization } from 'better-auth/plugins';
import { asc, eq } from 'drizzle-orm';

import { demo } from './demo';

const clientOrigin = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';

export const auth = betterAuth({
  // Google is the only way in: no password, no manual sign-up. Linking lets pre-existing
  // email/password Users sign in with the same address and keep their Organizations.
  account: { accountLinking: { trustedProviders: ['google'] } },
  basePath: '/api/auth',
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  databaseHooks: {
    session: {
      create: {
        // Land every new session in the oldest Organization the user belongs to.
        before: async session => {
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
  plugins: [organization(), demo()],
  secret: process.env.BETTER_AUTH_SECRET,
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      prompt: 'select_account',
    },
  },
  trustedOrigins: [clientOrigin],
});

export type Session = typeof auth.$Infer.Session;
