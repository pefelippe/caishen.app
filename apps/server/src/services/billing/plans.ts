import type { PlanKey } from '@zapbots/graphql/server';

export interface PlanInfo {
  /** Jobs and Messages per month, before Usage code credits. */
  jobs: number;
  key: PlanKey;
  messages: number;
  name: string;
  /** What the Plan costs per month, for display; Stripe's Price is what is charged. */
  priceCents: number;
}

/** The Plans and their Limits (docs/adr/0011). The Pro Price lives in Stripe (STRIPE_PRICE_PRO). */
export const PLANS: Record<PlanKey, PlanInfo> = {
  FREE: { jobs: 30, key: 'FREE', messages: 300, name: 'Gratuito', priceCents: 0 },
  PRO: { jobs: 500, key: 'PRO', messages: 5000, name: 'Pro', priceCents: 4900 },
};

/** Stripe statuses in which a paid Plan is in force. */
const IN_FORCE = new Set(['active', 'trialing', 'past_due']);

export function planInForce(row: { plan: PlanKey; status: string } | undefined): PlanKey {
  return row && IN_FORCE.has(row.status) ? row.plan : 'FREE';
}
