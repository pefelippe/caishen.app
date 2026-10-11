import { db, schema } from '@mny/database';
import type { BetterAuthPlugin } from 'better-auth';
import { APIError, createAuthEndpoint } from 'better-auth/api';
import { setSessionCookie } from 'better-auth/cookies';
import { eq } from 'drizzle-orm';

/** Demo mode lets anyone sign in as one shared, mocked User without Google. Never enable in production. */
export const demoEnabled = process.env.DEMO_MODE === 'true';

const DEMO_USER = { email: 'demo@mny.local', name: 'Usuário Demo' };
const DEMO_ORGANIZATION = { name: 'Organização Demo', slug: 'demo' };

/** Creates the demo User, its Organization and the owner membership on first use. */
export async function ensureDemoUser(): Promise<string> {
  const [existing] = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.email, DEMO_USER.email))
    .limit(1);
  if (existing) return existing.id;

  const userId = crypto.randomUUID();
  const organizationId = crypto.randomUUID();
  await db.transaction(async tx => {
    await tx.insert(schema.user).values({ ...DEMO_USER, emailVerified: true, id: userId });
    await tx
      .insert(schema.organization)
      .values({ ...DEMO_ORGANIZATION, id: organizationId })
      .onConflictDoNothing();
    const [organization] = await tx
      .select({ id: schema.organization.id })
      .from(schema.organization)
      .where(eq(schema.organization.slug, DEMO_ORGANIZATION.slug));
    await tx.insert(schema.member).values({
      id: crypto.randomUUID(),
      organizationId: organization!.id,
      role: 'owner',
      userId,
    });
  });
  return userId;
}

export const demo = () =>
  ({
    endpoints: {
      demoStatus: createAuthEndpoint('/demo', { method: 'GET' }, async ctx =>
        ctx.json({ enabled: demoEnabled })
      ),
      demoSignIn: createAuthEndpoint('/demo/sign-in', { method: 'POST' }, async ctx => {
        if (!demoEnabled) throw new APIError('NOT_FOUND', { message: 'Modo demo desativado' });
        const userId = await ensureDemoUser();
        const user = await ctx.context.internalAdapter.findUserById(userId);
        // Goes through the session.create hook, so the demo Organization becomes active.
        const session = await ctx.context.internalAdapter.createSession(userId);
        if (!user || !session) throw new APIError('INTERNAL_SERVER_ERROR');
        await setSessionCookie(ctx, { session, user });
        return ctx.json({ ok: true });
      }),
    },
    id: 'demo',
  }) satisfies BetterAuthPlugin;
