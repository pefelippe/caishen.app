import type { Viewer } from '@zapbots/auth';
import { db, schema } from '@zapbots/database';
import { and, count, eq, gte, sum } from 'drizzle-orm';

import { monthStart, monthUsage } from '../usage';
import { PLANS, planInForce } from './plans';
import type { StripeEvent } from './stripe';

export class PlanLimitError extends Error {}

/** The Organization's Subscription row, if it ever started one. */
export async function subscriptionOf(organizationId: string) {
  const [row] = await db
    .select()
    .from(schema.subscription)
    .where(eq(schema.subscription.organizationId, organizationId));
  return row;
}

/** Jobs and Messages added by the Usage codes redeemed this month. */
async function monthCredits(organizationId: string) {
  const [row] = await db
    .select({ jobs: sum(schema.usageCode.jobs), messages: sum(schema.usageCode.messages) })
    .from(schema.usageCodeRedemption)
    .innerJoin(schema.usageCode, eq(schema.usageCode.id, schema.usageCodeRedemption.codeId))
    .where(
      and(
        eq(schema.usageCodeRedemption.organizationId, organizationId),
        gte(schema.usageCodeRedemption.redeemedAt, monthStart().since)
      )
    );
  return { jobs: Number(row?.jobs ?? 0), messages: Number(row?.messages ?? 0) };
}

/** Where the Organization stands this month: its Plan, Limits, credits and what it used. */
export async function billingState(viewer: Viewer) {
  const [subscription, credits, used] = await Promise.all([
    subscriptionOf(viewer.organizationId),
    monthCredits(viewer.organizationId),
    monthUsage(viewer),
  ]);
  const plan = PLANS[planInForce(subscription)];
  return {
    cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
    credits,
    currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
    hasCustomer: Boolean(subscription?.stripeCustomerId),
    limits: { jobs: plan.jobs + credits.jobs, messages: plan.messages + credits.messages },
    plan,
    status: subscription?.status ?? null,
    used: { jobs: used.jobs, messages: used.messages },
  };
}

const LIMIT_MESSAGE = {
  jobs: 'A Organização usou todos os Workflows do Plano neste mês. Mude de Plano ou resgate um Código de uso em Configurações › Faturamento.',
  messages:
    'A Organização usou todas as Mensagens do Plano neste mês. Mude de Plano ou resgate um Código de uso em Configurações › Faturamento.',
};

/** Throws a PlanLimitError when one more Job or Message would pass the month's Limit. */
export async function requireWithinLimit(viewer: Viewer, kind: 'jobs' | 'messages') {
  const state = await billingState(viewer);
  if (state.used[kind] >= state.limits[kind]) throw new PlanLimitError(LIMIT_MESSAGE[kind]);
}

export class UsageCodeError extends Error {}

/** Redeems a Usage code for the Viewer's Organization: once per Organization, within its cap. */
export async function redeemUsageCode(viewer: Viewer, typed: string) {
  const code = typed.trim().toUpperCase();
  if (!code) throw new UsageCodeError('Digite um código.');
  await db.transaction(async tx => {
    const [row] = await tx
      .select()
      .from(schema.usageCode)
      .where(eq(schema.usageCode.code, code))
      .for('update');
    if (!row || (row.expiresAt && row.expiresAt < new Date())) {
      throw new UsageCodeError('Código inválido ou expirado.');
    }
    const [already] = await tx
      .select({ id: schema.usageCodeRedemption.id })
      .from(schema.usageCodeRedemption)
      .where(
        and(
          eq(schema.usageCodeRedemption.codeId, row.id),
          eq(schema.usageCodeRedemption.organizationId, viewer.organizationId)
        )
      );
    if (already) throw new UsageCodeError('A Organização já resgatou este código.');
    if (row.maxRedemptions !== null) {
      const [used] = await tx
        .select({ total: count() })
        .from(schema.usageCodeRedemption)
        .where(eq(schema.usageCodeRedemption.codeId, row.id));
      if ((used?.total ?? 0) >= row.maxRedemptions) {
        throw new UsageCodeError('Este código já foi usado o máximo de vezes.');
      }
    }
    await tx.insert(schema.usageCodeRedemption).values({
      codeId: row.id,
      organizationId: viewer.organizationId,
      redeemedById: viewer.userId,
    });
  });
}

const str = (value: unknown) => (typeof value === 'string' ? value : null);

/** `current_period_end` moved from the Subscription to its items in Stripe's 2025 API. */
function periodEnd(object: Record<string, unknown>): Date | null {
  const items = (object.items as { data?: { current_period_end?: number }[] } | undefined)?.data;
  const seconds =
    (object.current_period_end as number | undefined) ?? items?.[0]?.current_period_end;
  return typeof seconds === 'number' ? new Date(seconds * 1000) : null;
}

async function upsertSubscription(
  organizationId: string,
  values: Partial<typeof schema.subscription.$inferInsert>
) {
  await db
    .insert(schema.subscription)
    .values({ organizationId, ...values })
    .onConflictDoUpdate({ set: values, target: schema.subscription.organizationId });
}

/**
 * Applies a verified Stripe event to the Organization's Subscription, once per event id. Unknown
 * event types and Organizations are ignored.
 */
export async function handleStripeEvent(event: StripeEvent): Promise<void> {
  const [fresh] = await db
    .insert(schema.stripeEvent)
    .values({ id: event.id, type: event.type })
    .onConflictDoNothing()
    .returning({ id: schema.stripeEvent.id });
  if (!fresh) return;

  const object = event.data.object;
  const metadata = (object.metadata ?? {}) as Record<string, unknown>;
  const organizationId = str(metadata.organizationId) ?? str(object.client_reference_id);
  if (!organizationId) return;
  const [organization] = await db
    .select({ id: schema.organization.id })
    .from(schema.organization)
    .where(eq(schema.organization.id, organizationId));
  if (!organization) return;

  if (event.type === 'checkout.session.completed') {
    await upsertSubscription(organizationId, {
      stripeCustomerId: str(object.customer),
      stripeSubscriptionId: str(object.subscription),
    });
    return;
  }
  if (
    event.type === 'customer.subscription.created' ||
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    await upsertSubscription(organizationId, {
      cancelAtPeriodEnd: object.cancel_at_period_end === true,
      currentPeriodEnd: periodEnd(object),
      plan: 'PRO',
      status:
        event.type === 'customer.subscription.deleted'
          ? 'canceled'
          : (str(object.status) ?? 'incomplete'),
      stripeCustomerId: str(object.customer),
      stripeSubscriptionId: str(object.id),
    });
  }
}
