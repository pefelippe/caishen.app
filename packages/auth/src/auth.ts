import { db, schema } from '@mny/database';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { organization } from 'better-auth/plugins';
import { asc, eq } from 'drizzle-orm';

const clientOrigin = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';

export const auth = betterAuth({
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
  emailAndPassword: { enabled: true },
  plugins: [organization()],
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [clientOrigin],
});

export type Session = typeof auth.$Infer.Session;
