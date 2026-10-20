import { db, schema } from '@zapbots/database';
import { eq } from 'drizzle-orm';

/**
 * Gives a User their personal Organization (docs/adr/0007) unless they already belong to one.
 * Writes the rows directly: the organization plugin's API needs a session,
 * which does not exist yet when the User is being created.
 */
export async function ensurePersonalOrganization(userId: string, name: string): Promise<void> {
  const [membership] = await db
    .select({ id: schema.member.id })
    .from(schema.member)
    .where(eq(schema.member.userId, userId))
    .limit(1);
  if (membership) return;

  const organizationId = crypto.randomUUID();
  await db.transaction(async tx => {
    await tx
      .insert(schema.organization)
      .values({ id: organizationId, name, slug: `pessoal-${organizationId}` });
    await tx
      .insert(schema.member)
      .values({ id: crypto.randomUUID(), organizationId, role: 'owner', userId });
  });
}
