import { http, HttpResponse, type HttpHandler } from 'msw';

const API = 'https://api.stripe.com/v1';

/** Stripe creating a Checkout Session, keeping the form and the Idempotency-Key it received. */
export function checkoutHandler(): {
  forms: URLSearchParams[];
  handler: HttpHandler;
  keys: (string | null)[];
} {
  const forms: URLSearchParams[] = [];
  const keys: (string | null)[] = [];
  const handler = http.post(`${API}/checkout/sessions`, async ({ request }) => {
    forms.push(new URLSearchParams(await request.text()));
    keys.push(request.headers.get('idempotency-key'));
    return HttpResponse.json({
      id: 'cs_test_1',
      url: 'https://checkout.stripe.com/c/pay/cs_test_1',
    });
  });
  return { forms, handler, keys };
}

export const portalHandler = http.post(`${API}/billing_portal/sessions`, () =>
  HttpResponse.json({ id: 'bps_1', url: 'https://billing.stripe.com/p/session/bps_1' })
);

export const failingCheckoutHandler = http.post(`${API}/checkout/sessions`, () =>
  HttpResponse.json({ error: { message: 'No such price' } }, { status: 400 })
);

/** Stripe ending a subscription now, keeping the ids it was asked to end. */
export function cancelHandler(): { cancelled: string[]; handler: HttpHandler } {
  const cancelled: string[] = [];
  const handler = http.delete(`${API}/subscriptions/:id`, ({ params }) => {
    cancelled.push(String(params.id));
    return HttpResponse.json({ id: params.id, status: 'canceled' });
  });
  return { cancelled, handler };
}
