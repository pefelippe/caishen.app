import { db, schema } from '@mny/database';
import { and, eq } from 'drizzle-orm';

import { auth } from './auth';

/** The signed-in User acting inside their active Organization. */
export interface Viewer {
  organizationId: string;
  role: string;
  userId: string;
}

type HeaderSource = Headers | Record<string, string | string[] | undefined>;

function toHeaders(source: HeaderSource): Headers {
  if (source instanceof Headers) return source;
  const headers = new Headers();
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
  }
  return headers;
}

/**
 * Resolves the Viewer from request headers (session cookie). Returns `null` when signed out or
 * when the session has no active Organization the user is still a Member of.
 */
export async function resolveViewer(source: HeaderSource): Promise<Viewer | null> {
  const result = await auth.api.getSession({ headers: toHeaders(source) });
  const organizationId = result?.session.activeOrganizationId;
  if (!result || !organizationId) return null;

  const [membership] = await db
    .select({ role: schema.member.role })
    .from(schema.member)
    .where(
      and(
        eq(schema.member.organizationId, organizationId),
        eq(schema.member.userId, result.user.id)
      )
    )
    .limit(1);
  if (!membership) return null;

  return { organizationId, role: membership.role, userId: result.user.id };
}
