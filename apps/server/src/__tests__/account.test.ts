import { db, closeDb, schema } from '@zapbots/database';
import { eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createViewer, gql } from '../../test/helpers';
import { mswServer } from '../../test/msw/openrouter';
import { cancelHandler } from '../../test/msw/stripe';

beforeAll(() => mswServer.listen());
beforeEach(() => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_1';
});
afterEach(() => {
  mswServer.resetHandlers();
  delete process.env.STRIPE_SECRET_KEY;
});
afterAll(async () => {
  mswServer.close();
  await closeDb();
});

const DELETE_ACCOUNT = /* GraphQL */ `
  mutation ($confirm: String!) {
    deleteAccount(confirm: $confirm)
  }
`;

const userExists = async (id: string) =>
  (await db.select().from(schema.user).where(eq(schema.user.id, id))).length > 0;
const organizationExists = async (id: string) =>
  (await db.select().from(schema.organization).where(eq(schema.organization.id, id))).length > 0;

describe('deleteAccount', () => {
  it('asks for the account e-mail before deleting anything', async () => {
    const viewer = await createViewer();

    const result = await gql(viewer, DELETE_ACCOUNT, { confirm: 'outro@test.local' });

    expect(result.errors).toEqual(['BAD_USER_INPUT']);
    expect(await userExists(viewer.userId)).toBe(true);
  });

  it('ends the paid plan and deletes the User with their own Organization and its data', async () => {
    const stripe = cancelHandler();
    mswServer.use(stripe.handler);
    const viewer = await createViewer();
    await db.insert(schema.subscription).values({
      organizationId: viewer.organizationId,
      plan: 'PRO',
      status: 'active',
      stripeSubscriptionId: `sub_${viewer.userId}`,
    });
    const [holder] = await db
      .insert(schema.holder)
      .values({ name: 'Ana', organizationId: viewer.organizationId })
      .returning();
    await db
      .insert(schema.consent)
      .values({ grantedById: viewer.userId, holderId: holder!.id, source: 'OPEN_FINANCE' });

    const result = await gql(viewer, DELETE_ACCOUNT, {
      confirm: ` ${viewer.userId.toUpperCase()}@TEST.LOCAL `,
    });

    expect(result.errors).toEqual([]);
    expect(stripe.cancelled).toEqual([`sub_${viewer.userId}`]);
    expect(await userExists(viewer.userId)).toBe(false);
    expect(await organizationExists(viewer.organizationId)).toBe(false);
    expect(await db.select().from(schema.holder).where(eq(schema.holder.id, holder!.id))).toEqual(
      []
    );
  });

  it('leaves an Organization shared with others, taking only their membership and consents', async () => {
    const owner = await createViewer('Bia');
    const leaving = await createViewer('Caio');
    await db.insert(schema.member).values({
      id: crypto.randomUUID(),
      organizationId: owner.organizationId,
      role: 'member',
      userId: leaving.userId,
    });
    const [holder] = await db
      .insert(schema.holder)
      .values({ name: 'Bia', organizationId: owner.organizationId })
      .returning();
    await db
      .insert(schema.consent)
      .values({ grantedById: leaving.userId, holderId: holder!.id, source: 'OPEN_FINANCE' });

    const result = await gql(leaving, DELETE_ACCOUNT, { confirm: `${leaving.userId}@test.local` });

    expect(result.errors).toEqual([]);
    expect(await userExists(leaving.userId)).toBe(false);
    expect(await organizationExists(leaving.organizationId)).toBe(false);
    expect(await organizationExists(owner.organizationId)).toBe(true);
    expect(
      await db.select().from(schema.consent).where(eq(schema.consent.holderId, holder!.id))
    ).toEqual([]);
  });
});
