import type { Viewer } from '@zapbots/auth';
import { db, schema } from '@zapbots/database';
import { and, count, eq, inArray, isNotNull } from 'drizzle-orm';

import { cancelSubscriptionNow } from './billing/stripe';

/** A refusal said to the User, in pt-BR. */
export class AccountError extends Error {}

/** Stripe statuses that still charge, or will. */
const CHARGING = ['active', 'trialing', 'past_due', 'unpaid', 'incomplete'];

/**
 * Deletes the User and everything that is only theirs (docs/adr/0027): each Organization where they
 * are the only Member goes with all its data (every domain table cascades from it), its Stripe
 * subscription ended first so nothing is charged again. In an Organization shared with others only
 * their membership goes. `confirm` is the account's e-mail, typed by the User.
 */
export async function deleteAccount(viewer: Viewer, confirm: string): Promise<void> {
  const [user] = await db
    .select({ email: schema.user.email })
    .from(schema.user)
    .where(eq(schema.user.id, viewer.userId));
  if (!user) throw new AccountError('Conta não encontrada.');
  if (confirm.trim().toLowerCase() !== user.email.toLowerCase()) {
    throw new AccountError('Digite o e-mail da conta, igual ao de cima, para confirmar.');
  }

  const memberships = await db
    .select({ organizationId: schema.member.organizationId })
    .from(schema.member)
    .where(eq(schema.member.userId, viewer.userId));
  const ids = memberships.map(row => row.organizationId);
  const shared = ids.length
    ? await db
        .select({ organizationId: schema.member.organizationId, members: count() })
        .from(schema.member)
        .where(inArray(schema.member.organizationId, ids))
        .groupBy(schema.member.organizationId)
    : [];
  const alone = shared.filter(row => row.members === 1).map(row => row.organizationId);

  if (alone.length) {
    const subscriptions = await db
      .select()
      .from(schema.subscription)
      .where(
        and(
          inArray(schema.subscription.organizationId, alone),
          isNotNull(schema.subscription.stripeSubscriptionId)
        )
      );
    for (const subscription of subscriptions) {
      if (CHARGING.includes(subscription.status)) {
        await cancelSubscriptionNow(subscription.stripeSubscriptionId!);
      }
    }
  }

  await db.transaction(async tx => {
    if (alone.length) {
      await tx.delete(schema.organization).where(inArray(schema.organization.id, alone));
    }
    // Consents they gave in Organizations that stay (the rest went with their Holders).
    await tx.delete(schema.consent).where(eq(schema.consent.grantedById, viewer.userId));
    // Sessions, sign-in accounts, two-step secrets and memberships go with the user.
    await tx.delete(schema.user).where(eq(schema.user.id, viewer.userId));
  });
}
