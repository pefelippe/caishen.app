import { closeDb } from '@zapbots/database';
import { afterAll, describe, expect, it } from 'vitest';

import { createViewer, gql } from '../../test/helpers';

afterAll(async () => {
  await closeDb();
});

const GOAL =
  'id title kind target unit progress archivedAt entries { amount note } openTasks { title }';
const CREATE = `mutation ($input: GoalInput!) { createGoal(input: $input) { ${GOAL} } }`;
const PROGRESS = `mutation ($goalId: ID!, $amount: Cents!, $note: String) { addGoalProgress(goalId: $goalId, amount: $amount, note: $note) { ${GOAL} } }`;
const GOALS = `query ($archived: Boolean) { goals(archived: $archived) { ${GOAL} } }`;

describe('Metas', () => {
  it('adds up Progresso in cents for a money Meta', async () => {
    const viewer = await createViewer();
    const goal = (
      await gql(viewer, CREATE, {
        input: { area: 'FINANCE', kind: 'MONEY', target: 1_000_000, title: 'Reserva' },
      })
    ).data.createGoal;
    await gql(viewer, PROGRESS, { amount: 150_050, goalId: goal.id, note: 'Outubro' });
    const after = await gql(viewer, PROGRESS, { amount: -50, goalId: goal.id });
    expect(after.data.addGoalProgress).toMatchObject({
      entries: [{ amount: -50 }, { amount: 150_050, note: 'Outubro' }],
      progress: 150_000,
      target: 1_000_000,
    });
  });

  it('counts units, makes a CHECK Meta a single step, and lists its open Tarefas', async () => {
    const viewer = await createViewer();
    const books = (
      await gql(viewer, CREATE, {
        input: { kind: 'COUNT', target: 12, title: 'Ler', unit: 'livros' },
      })
    ).data.createGoal;
    expect(books.unit).toBe('livros');
    await gql(viewer, `mutation ($input: TaskInput!) { createTask(input: $input) { id } }`, {
      input: { goalId: books.id, title: 'Comprar Dom Casmurro' },
    });
    const check = (
      await gql(viewer, CREATE, {
        input: { kind: 'CHECK', target: 99, title: 'Tirar o passaporte' },
      })
    ).data.createGoal;
    expect(check.target).toBe(1);
    const goals = (await gql(viewer, GOALS)).data.goals;
    expect(goals.find((goal: { id: string }) => goal.id === books.id).openTasks).toEqual([
      { title: 'Comprar Dom Casmurro' },
    ]);
    expect(
      (await gql(viewer, CREATE, { input: { kind: 'MONEY', title: 'Sem alvo' } })).errors
    ).toEqual(['BAD_USER_INPUT']);
  });

  it('archives and brings back', async () => {
    const viewer = await createViewer();
    const goal = (await gql(viewer, CREATE, { input: { kind: 'CHECK', title: 'Mudar' } })).data
      .createGoal;
    await gql(viewer, `mutation ($id: ID!) { archiveGoal(id: $id, archived: true) { id } }`, {
      id: goal.id,
    });
    expect((await gql(viewer, GOALS)).data.goals).toEqual([]);
    expect((await gql(viewer, GOALS, { archived: true })).data.goals).toHaveLength(1);
  });

  it("keeps another Organization's Metas out of reach", async () => {
    const ana = await createViewer('Ana');
    const bia = await createViewer('Bia');
    const goal = (await gql(ana, CREATE, { input: { kind: 'CHECK', title: 'Da Ana' } })).data
      .createGoal;
    expect((await gql(bia, PROGRESS, { amount: 1, goalId: goal.id })).errors).toEqual([
      'NOT_FOUND',
    ]);
    expect((await gql(bia, GOALS)).data.goals).toEqual([]);
  });
});
