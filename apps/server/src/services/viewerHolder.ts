import type { Viewer } from '@zapbots/auth';
import { db, schema, type HolderRow } from '@zapbots/database';
import { and, asc, eq } from 'drizzle-orm';

/**
 * The Holder the Viewer is (docs/adr/0007): the one linked to the User, else the oldest of the
 * Organization (adopted), else a new one named after the User.
 */
export async function viewerHolder(viewer: Viewer): Promise<HolderRow> {
  const inOrganization = eq(schema.holder.organizationId, viewer.organizationId);
  const [linked] = await db
    .select()
    .from(schema.holder)
    .where(and(inOrganization, eq(schema.holder.userId, viewer.userId)))
    .limit(1);
  if (linked) return linked;

  const [oldest] = await db
    .select()
    .from(schema.holder)
    .where(inOrganization)
    .orderBy(asc(schema.holder.createdAt))
    .limit(1);
  if (oldest) {
    const [adopted] = await db
      .update(schema.holder)
      .set({ userId: viewer.userId })
      .where(eq(schema.holder.id, oldest.id))
      .returning();
    return adopted!;
  }

  const [user] = await db
    .select({ name: schema.user.name })
    .from(schema.user)
    .where(eq(schema.user.id, viewer.userId));
  const [created] = await db
    .insert(schema.holder)
    .values({
      name: user?.name ?? 'Eu',
      organizationId: viewer.organizationId,
      userId: viewer.userId,
    })
    .returning();
  return created!;
}
