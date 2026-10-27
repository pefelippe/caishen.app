import { closeDb, db, schema } from '@zapbots/database';
import { afterAll, describe, expect, it } from 'vitest';

import { createViewer, gql } from '../../test/helpers';

afterAll(async () => {
  await closeDb();
});

const LAYOUT = /* GraphQL */ `
  query {
    homeLayout {
      key
      hidden
    }
  }
`;
const SAVE = /* GraphQL */ `
  mutation ($cards: [HomeCardSettingInput!]) {
    saveHomeLayout(cards: $cards) {
      key
      hidden
    }
  }
`;

describe('Página inicial', () => {
  it('keeps the default until the User arranges it, and goes back to it on null', async () => {
    const viewer = await createViewer();
    expect((await gql(viewer, LAYOUT)).data.homeLayout).toBeNull();

    const cards = [
      { hidden: false, key: 'DUES' },
      { hidden: true, key: 'MARKET' },
      { hidden: false, key: 'DUES' },
    ];
    const saved = await gql(viewer, SAVE, { cards });
    expect(saved.errors).toEqual([]);
    expect(saved.data.saveHomeLayout).toEqual([
      { hidden: false, key: 'DUES' },
      { hidden: true, key: 'MARKET' },
    ]);
    expect((await gql(viewer, LAYOUT)).data.homeLayout).toEqual(saved.data.saveHomeLayout);

    await gql(viewer, SAVE, { cards: null });
    expect((await gql(viewer, LAYOUT)).data.homeLayout).toBeNull();
  });

  it('leaves out cards the app no longer has', async () => {
    const viewer = await createViewer();
    await db.insert(schema.homeLayout).values({
      cards: [
        { hidden: false, key: 'GONE' },
        { hidden: true, key: 'CHATS' },
      ],
      organizationId: viewer.organizationId,
      userId: viewer.userId,
    });
    expect((await gql(viewer, LAYOUT)).data.homeLayout).toEqual([{ hidden: true, key: 'CHATS' }]);
  });

  it("is each User's own", async () => {
    const ana = await createViewer('Ana');
    const bia = await createViewer('Bia');
    await gql(ana, SAVE, { cards: [{ hidden: true, key: 'OVERVIEW' }] });
    expect((await gql(bia, LAYOUT)).data.homeLayout).toBeNull();
    expect((await gql(null, LAYOUT)).errors).toEqual(['UNAUTHENTICATED']);
  });
});
