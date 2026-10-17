import { db, schema } from '@zapbots/database';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { organization } from 'better-auth/plugins';
import { asc, eq } from 'drizzle-orm';

import { demo } from './demo';
import { ensurePersonalOrganization } from './personal';

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
        // Land every new session in the oldest Organization the user belongs to. Users from
        // before the personal Organization existed get theirs here.
        before: async session => {
          const [user] = await db
            .select({ name: schema.user.name })
            .from(schema.user)
            .where(eq(schema.user.id, session.userId));
          await ensurePersonalOrganization(session.userId, user?.name ?? 'Pessoal');
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
      // Offline access yields the refresh token the Google Drive Connection needs.
      accessType: 'offline',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      prompt: 'select_account',
    },
  },
  trustedOrigins: [clientOrigin],
});

export type Session = typeof auth.$Infer.Session;
