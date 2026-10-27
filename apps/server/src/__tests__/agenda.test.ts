import { closeDb, db, schema } from '@zapbots/database';
import { afterAll, describe, expect, it } from 'vitest';

import { createViewer, gql } from '../../test/helpers';
import { viewerHolder } from '../services/viewerHolder';

afterAll(async () => {
  await closeDb();
});

const EVENT = `mutation ($input: EventInput!) { createEvent(input: $input) { id } }`;
const AGENDA = /* GraphQL */ `
  query ($from: Date!, $to: Date!) {
    agenda(from: $from, to: $to) {
      kind
      date
      startTime
      title
      amountCents
      done
      link
    }
  }
`;

describe('Agenda', () => {
  it('puts Eventos, Tarefas due and bills on their days', async () => {
    const viewer = await createViewer();
    const holder = await viewerHolder(viewer);
    await db.insert(schema.recurringExpense).values({
      amountCents: 12_000,
      category: 'Casa',
      description: 'Internet',
      dueDay: 10,
      holderId: holder.id,
      organizationId: viewer.organizationId,
      startsOn: '2026-01-01',
    });
    await gql(viewer, EVENT, {
      input: { startTime: '19:00', startsOn: '2026-11-10', title: 'Jantar' },
    });
    await gql(viewer, EVENT, {
      input: { endsOn: '2026-11-12', startsOn: '2026-11-09', title: 'Viagem' },
    });
    await gql(viewer, EVENT, {
      input: {
        repeat: { every: 'WEEK', interval: 1, weekdays: [2] },
        startTime: '07:00',
        startsOn: '2026-11-03',
        title: 'Corrida',
      },
    });
    await gql(viewer, `mutation ($input: TaskInput!) { createTask(input: $input) { id } }`, {
      input: { dueOn: '2026-11-10', title: 'Levar o bolo' },
    });

    const { agenda } = (await gql(viewer, AGENDA, { from: '2026-11-10', to: '2026-11-11' })).data;
    expect(agenda).toEqual([
      expect.objectContaining({
        date: '2026-11-10',
        kind: 'DUE',
        amountCents: 12_000,
        link: '/caishen/fixed',
      }),
      expect.objectContaining({
        date: '2026-11-10',
        kind: 'TASK',
        done: false,
        title: 'Levar o bolo',
      }),
      expect.objectContaining({
        date: '2026-11-10',
        kind: 'EVENT',
        startTime: null,
        title: 'Viagem',
      }),
      expect.objectContaining({
        date: '2026-11-10',
        kind: 'EVENT',
        startTime: '07:00',
        title: 'Corrida',
      }),
      expect.objectContaining({
        date: '2026-11-10',
        kind: 'EVENT',
        startTime: '19:00',
        title: 'Jantar',
      }),
      expect.objectContaining({ date: '2026-11-11', kind: 'EVENT', title: 'Viagem' }),
    ]);
  });

  it('refuses windows longer than three months and Eventos ending before they start', async () => {
    const viewer = await createViewer();
    expect((await gql(viewer, AGENDA, { from: '2026-01-01', to: '2026-12-31' })).errors).toEqual([
      'BAD_USER_INPUT',
    ]);
    const backwards = await gql(viewer, EVENT, {
      input: { endsOn: '2026-11-01', startsOn: '2026-11-05', title: 'X' },
    });
    expect(backwards.errors).toEqual(['BAD_USER_INPUT']);
  });

  it("leaves another Organization's Eventos out", async () => {
    const ana = await createViewer('Ana');
    const bia = await createViewer('Bia');
    await gql(ana, EVENT, { input: { startsOn: '2026-11-10', title: 'Da Ana' } });
    expect((await gql(bia, AGENDA, { from: '2026-11-01', to: '2026-11-30' })).data.agenda).toEqual(
      []
    );
  });
});
