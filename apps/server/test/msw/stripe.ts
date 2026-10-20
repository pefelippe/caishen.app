import { http, HttpResponse, type HttpHandler } from 'msw';

const API = 'https://api.stripe.com/v1';

/** Stripe creating a Checkout Session, keeping the form it received. */
export function checkoutHandler(): { forms: URLSearchParams[]; handler: HttpHandler } {
  const forms: URLSearchParams[] = [];
  const handler = http.post(`${API}/checkout/sessions`, async ({ request }) => {
    forms.push(new URLSearchParams(await request.text()));
    return HttpResponse.json({
      id: 'cs_test_1',
      url: 'https://checkout.stripe.com/c/pay/cs_test_1',
    });
  });
  return { forms, handler };
}

export const portalHandler = http.post(`${API}/billing_portal/sessions`, () =>
  HttpResponse.json({ id: 'bps_1', url: 'https://billing.stripe.com/p/session/bps_1' })
);

export const failingCheckoutHandler = http.post(`${API}/checkout/sessions`, () =>
  HttpResponse.json({ error: { message: 'No such price' } }, { status: 400 })
);
