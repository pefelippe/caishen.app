import { closeDb } from '@zapbots/database';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createViewer, gql } from '../../test/helpers';
import { mswServer } from '../../test/msw/openrouter';
import { checkoutHandler } from '../../test/msw/stripe';

beforeAll(() => mswServer.listen());
beforeEach(() => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_1';
  process.env.STRIPE_PRICE_PRO = 'price_pro';
});
afterEach(() => {
  mswServer.resetHandlers();
  delete process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_PRICE_PRO;
});
afterAll(async () => {
  mswServer.close();
  await closeDb();
});

const START_CHECKOUT = /* GraphQL */ `
  mutation {
    startCheckout
  }
`;

describe('startCheckout', () => {
  it('sends the same Idempotency-Key to Stripe on every retry of one click', async () => {
    const stripe = checkoutHandler();
    mswServer.use(stripe.handler);
    const viewer = await createViewer();

    const first = await gql(viewer, START_CHECKOUT, {}, { idempotencyKey: 'click-0001' });
    const retry = await gql(viewer, START_CHECKOUT, {}, { idempotencyKey: 'click-0001' });

    expect(first.errors).toEqual([]);
    expect(retry.data.startCheckout).toBe(first.data.startCheckout);
    expect(stripe.keys).toEqual([
      `checkout:${viewer.organizationId}:click-0001`,
      `checkout:${viewer.organizationId}:click-0001`,
    ]);
  });

  it('sends no Idempotency-Key when the client gave none', async () => {
    const stripe = checkoutHandler();
    mswServer.use(stripe.handler);

    const result = await gql(await createViewer(), START_CHECKOUT);

    expect(result.errors).toEqual([]);
    expect(stripe.keys).toEqual([null]);
  });
});
