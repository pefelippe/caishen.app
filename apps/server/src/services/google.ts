import { auth } from '@zapbots/auth';
import { db, schema } from '@zapbots/database';
import { and, eq } from 'drizzle-orm';

/**
 * The User's Google account, as Better Auth keeps it: signing in with Google, or linking it later
 * from Integrações with more scopes (Drive, Tarefas). Each Connection checks its own scope.
 */
export const googleConfigured = () =>
  Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export async function googleAccount(userId: string) {
  const [account] = await db
    .select({ id: schema.account.id, scope: schema.account.scope })
    .from(schema.account)
    .where(and(eq(schema.account.userId, userId), eq(schema.account.providerId, 'google')));
  return account ?? null;
}

/** True when the User's Google account granted `scope`. */
export async function googleGranted(userId: string, scope: string): Promise<boolean> {
  return (await googleAccount(userId))?.scope?.split(/[\s,]+/).includes(scope) ?? false;
}

/** A fresh Google access token; Better Auth refreshes it when it has expired. */
export async function googleAccessToken(userId: string): Promise<null | string> {
  const account = await googleAccount(userId);
  if (!account) return null;
  try {
    const result = await auth.api.getAccessToken({ body: { accountId: account.id, userId } });
    return result?.accessToken ?? null;
  } catch {
    return null;
  }
}
