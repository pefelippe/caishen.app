import { createHmac, timingSafeEqual } from 'node:crypto';

const API = 'https://api.stripe.com/v1';
/** Stripe's own default: a signed event older than this is refused. */
const TOLERANCE_S = 300;

export class StripeError extends Error {}

export const stripeConfigured = () =>
  Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_PRO);

/** Stripe's form encoding, nested keys as `a[b][0]=c`. */
export function formEncode(params: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(params).flatMap(([key, value]) => {
    const name = prefix ? `${prefix}[${key}]` : key;
    if (value === undefined || value === null) return [];
    if (Array.isArray(value)) {
      return value.flatMap((item, index) =>
        typeof item === 'object'
          ? formEncode(item as Record<string, unknown>, `${name}[${index}]`)
          : [`${encodeURIComponent(`${name}[${index}]`)}=${encodeURIComponent(String(item))}`]
      );
    }
    if (typeof value === 'object') return formEncode(value as Record<string, unknown>, name);
    return [`${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`];
  });
}

/** POSTs to the Stripe API; throws a StripeError in pt-BR when Stripe refuses. */
async function post<T>(path: string, params: Record<string, unknown>): Promise<T> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new StripeError('A cobrança não está configurada no servidor.');
  const response = await fetch(`${API}${path}`, {
    body: formEncode(params).join('&'),
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    method: 'POST',
  });
  const body = (await response.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!response.ok) {
    console.error('stripe refused:', response.status, body.error?.message);
    throw new StripeError('O Stripe recusou o pedido. Tente de novo em instantes.');
  }
  return body;
}

/** A Checkout page for the Pro Plan; the Organization rides along to the webhook. */
export async function createCheckoutSession(input: {
  customerId: string | null;
  email: string;
  organizationId: string;
  returnUrl: string;
}): Promise<string> {
  const session = await post<{ url: string }>('/checkout/sessions', {
    allow_promotion_codes: true,
    cancel_url: `${input.returnUrl}?checkout=cancelado`,
    client_reference_id: input.organizationId,
    customer: input.customerId ?? undefined,
    customer_email: input.customerId ? undefined : input.email,
    line_items: [{ price: process.env.STRIPE_PRICE_PRO, quantity: 1 }],
    metadata: { organizationId: input.organizationId },
    mode: 'subscription',
    subscription_data: { metadata: { organizationId: input.organizationId } },
    success_url: `${input.returnUrl}?checkout=ok`,
  });
  return session.url;
}

/** Stripe's own page to change the card, see invoices or cancel. */
export async function createPortalSession(customerId: string, returnUrl: string) {
  const session = await post<{ url: string }>('/billing_portal/sessions', {
    customer: customerId,
    return_url: returnUrl,
  });
  return session.url;
}

export interface StripeEvent {
  data: { object: Record<string, unknown> };
  id: string;
  type: string;
}

/**
 * Checks the `Stripe-Signature` header against the raw body, the way Stripe signs webhooks
 * (HMAC-SHA256 of `timestamp.body`), and parses the event. Returns null when it does not match.
 */
export function verifyWebhook(
  rawBody: string,
  header: string | undefined,
  secret = process.env.STRIPE_WEBHOOK_SECRET,
  now = Date.now()
): StripeEvent | null {
  if (!secret || !header) return null;
  const parts = header.split(',').map(part => part.split('=') as [string, string]);
  const timestamp = Number(parts.find(([key]) => key === 't')?.[1]);
  const signatures = parts.filter(([key]) => key === 'v1').map(([, value]) => value);
  if (!timestamp || !signatures.length) return null;
  if (Math.abs(now / 1000 - timestamp) > TOLERANCE_S) return null;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest();
  const valid = signatures.some(signature => {
    const given = Buffer.from(signature, 'hex');
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
  if (!valid) return null;
  try {
    return JSON.parse(rawBody) as StripeEvent;
  } catch {
    return null;
  }
}

/** Signs a body as Stripe would; used by the tests to deliver fake webhooks. */
export function signWebhook(rawBody: string, secret: string, now = Date.now()): string {
  const timestamp = Math.floor(now / 1000);
  const signature = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  return `t=${timestamp},v1=${signature}`;
}
