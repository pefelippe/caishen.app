import { closeDb, db, schema } from '@zapbots/database';
import { afterAll, describe, expect, it } from 'vitest';

import { createViewer, gql } from '../../test/helpers';
import { viewerHolder } from '../services/viewerHolder';

afterAll(async () => {
  await closeDb();
});

const ALERTS = /* GraphQL */ `
  query {
    bot(key: FINANCE) {
      alerts {
        id
        kind
        read
      }
    }
  }
`;
const READ = /* GraphQL */ `
  mutation ($ids: [ID!]!) {
    markAlertsRead(bot: FINANCE, ids: $ids) {
      alerts {
        id
        read
      }
    }
  }
`;
const DISMISS = /* GraphQL */ `
  mutation ($id: ID!) {
    dismissAlert(bot: FINANCE, id: $id) {
      alerts {
        id
      }
    }
  }
`;

/** A Viewer with a Cartão and no Avaliação yet, so the Caishen has one Alert for them. */
async function viewerWithAlert() {
  const viewer = await createViewer();
  const holder = await viewerHolder(viewer);
  await db.insert(schema.creditCard).values({
    closingDay: 1,
    dueDay: 10,
    holderId: holder.id,
    limitCents: 500_000,
    name: 'Visa',
    organizationId: viewer.organizationId,
  });
  const { data } = await gql(viewer, ALERTS);
  const [alert] = data.bot.alerts;
  expect(alert).toMatchObject({ kind: 'STALE_ASSESSMENT', read: false });
  return { alert, viewer };
}

describe('Avisos', () => {
  it('stay read once marked, for that User only', async () => {
    const { alert, viewer } = await viewerWithAlert();

    const marked = await gql(viewer, READ, { ids: [alert.id] });
    expect(marked.errors).toEqual([]);
    expect(marked.data.markAlertsRead.alerts).toEqual([{ id: alert.id, read: true }]);
    expect((await gql(viewer, ALERTS)).data.bot.alerts[0].read).toBe(true);

    // Marking again keeps it read.
    await gql(viewer, READ, { ids: [alert.id] });
    expect((await gql(viewer, ALERTS)).data.bot.alerts[0].read).toBe(true);
  });

  it('leave the bell once removed', async () => {
    const { alert, viewer } = await viewerWithAlert();

    const removed = await gql(viewer, DISMISS, { id: alert.id });
    expect(removed.errors).toEqual([]);
    expect(removed.data.dismissAlert.alerts).toEqual([]);
    expect((await gql(viewer, ALERTS)).data.bot.alerts).toEqual([]);
  });

  it('ignore ids of Alerts the Viewer does not have', async () => {
    const { alert, viewer } = await viewerWithAlert();
    const other = await createViewer('Bia');

    // Another User's Alert, and one that never existed, change nothing.
    expect((await gql(other, DISMISS, { id: alert.id })).errors).toEqual([]);
    await gql(viewer, READ, { ids: ['OVERDUE:nothing:1'] });

    expect((await gql(viewer, ALERTS)).data.bot.alerts).toEqual([
      { id: alert.id, kind: 'STALE_ASSESSMENT', read: false },
    ]);
  });
});
