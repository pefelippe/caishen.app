import { closeDb } from '@zapbots/database';
import { afterAll, describe, expect, it } from 'vitest';

import { createViewer, gql } from '../../test/helpers';

afterAll(async () => {
  await closeDb();
});

const TASK = 'id title dueOn dueTime priority doneAt listId repeat { every interval weekdays }';
const CREATE = `mutation ($input: TaskInput!) { createTask(input: $input) { ${TASK} } }`;
const TASKS = `query ($done: Boolean, $listId: ID) { tasks(done: $done, listId: $listId) { ${TASK} } }`;
const DONE = `mutation ($id: ID!, $done: Boolean!) { setTaskDone(id: $id, done: $done) { ${TASK} } }`;

describe('Tarefas', () => {
  it('lists open ones with a day first, soonest first, then the rest', async () => {
    const viewer = await createViewer();
    for (const input of [
      { title: 'Sem dia' },
      { dueOn: '2026-11-03', title: 'Depois' },
      { dueOn: '2026-11-01', dueTime: '9h', priority: 'HIGH', title: 'Antes' },
    ]) {
      expect((await gql(viewer, CREATE, { input })).errors).toEqual([]);
    }
    const { tasks } = (await gql(viewer, TASKS)).data;
    expect(tasks.map((task: { title: string }) => task.title)).toEqual([
      'Antes',
      'Depois',
      'Sem dia',
    ]);
    expect(tasks[0].dueTime).toBe('09:00');
  });

  it('refuses an hour without a day and a repeat without a start', async () => {
    const viewer = await createViewer();
    const hourOnly = await gql(viewer, CREATE, { input: { dueTime: '10:00', title: 'X' } });
    expect(hourOnly.errors).toEqual(['BAD_USER_INPUT']);
    const repeatOnly = await gql(viewer, CREATE, {
      input: { repeat: { every: 'DAY', interval: 1 }, title: 'X' },
    });
    expect(repeatOnly.errors).toEqual(['BAD_USER_INPUT']);
  });

  it('moves a repeating one to its next date once done', async () => {
    const viewer = await createViewer();
    const created = await gql(viewer, CREATE, {
      input: { dueOn: '2026-10-05', repeat: { every: 'MONTH', interval: 1 }, title: 'Pagar a luz' },
    });
    const id = created.data.createTask.id;
    const done = await gql(viewer, DONE, { done: true, id });
    expect(done.data.setTaskDone.doneAt).not.toBeNull();

    const open = (await gql(viewer, TASKS)).data.tasks;
    expect(open).toHaveLength(1);
    expect(open[0]).toMatchObject({ dueOn: '2026-11-05', doneAt: null, title: 'Pagar a luz' });
    expect(
      (await gql(viewer, TASKS, { done: true })).data.tasks.map((t: { id: string }) => t.id)
    ).toEqual([id]);

    // Done twice changes nothing: no second copy.
    await gql(viewer, DONE, { done: true, id });
    expect((await gql(viewer, TASKS)).data.tasks).toHaveLength(1);
  });

  it('keeps Lists, counts their open Tarefas and frees them when a List goes', async () => {
    const viewer = await createViewer();
    const list = (
      await gql(viewer, `mutation { createTaskList(name: "Mercado") { id name openCount } }`)
    ).data.createTaskList;
    await gql(viewer, CREATE, { input: { listId: list.id, title: 'Leite' } });
    const lists = (await gql(viewer, `query { taskLists { id openCount } }`)).data.taskLists;
    expect(lists).toEqual([{ id: list.id, openCount: 1 }]);
    expect((await gql(viewer, TASKS, { listId: list.id })).data.tasks).toHaveLength(1);

    await gql(viewer, `mutation ($id: ID!) { deleteTaskList(id: $id) }`, { id: list.id });
    expect((await gql(viewer, TASKS)).data.tasks[0].listId).toBeNull();
  });

  it("never shows nor touches another Organization's", async () => {
    const ana = await createViewer('Ana');
    const bia = await createViewer('Bia');
    const id = (await gql(ana, CREATE, { input: { title: 'Da Ana' } })).data.createTask.id;
    expect((await gql(bia, TASKS)).data.tasks).toEqual([]);
    expect((await gql(bia, DONE, { done: true, id })).errors).toEqual(['NOT_FOUND']);
    const list = (await gql(bia, `mutation { createTaskList(name: "Bia") { id } }`)).data
      .createTaskList;
    const borrowed = await gql(ana, CREATE, { input: { listId: list.id, title: 'X' } });
    expect(borrowed.errors).toEqual(['NOT_FOUND']);
  });
});
