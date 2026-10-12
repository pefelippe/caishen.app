import { db, schema, type PomodoroRow } from '@mny/database';
import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { createViewer, gql } from '../../test/helpers';
import { buddyContext } from '../services/buddies/context';
import { summarizeFocus } from '../services/focus';

const FOCUS = `{ focus { todayMinutes weekCount weekMinutes today { minutes task { title } } } }`;
const LOG = `mutation ($taskId: ID, $minutes: Int!) { logPomodoro(taskId: $taskId, minutes: $minutes) { id } }`;

async function createTask(viewer: Awaited<ReturnType<typeof createViewer>>, title: string) {
  const { data } = await gql(
    viewer,
    `mutation ($title: String!) { createTask(input: { title: $title }) { id } }`,
    { title }
  );
  return data.createTask.id as string;
}

describe('pomodoro', () => {
  it('records finished Pomodoros, on a Task or on none, and adds them up', async () => {
    const viewer = await createViewer();
    const taskId = await createTask(viewer, 'Configurar o domínio');

    await gql(viewer, LOG, { minutes: 25, taskId });
    const logged = await gql(viewer, LOG, { minutes: 25 });
    expect(logged.errors).toEqual([]);

    const { data } = await gql(viewer, `${FOCUS.slice(0, -1)} tasks { title pomodoros } }`);
    expect(data).toEqual({
      focus: {
        today: [
          { minutes: 25, task: { title: 'Configurar o domínio' } },
          { minutes: 25, task: null },
        ],
        todayMinutes: 50,
        weekCount: 2,
        weekMinutes: 50,
      },
      tasks: [{ pomodoros: 1, title: 'Configurar o domínio' }],
    });
    expect(await buddyContext(viewer, 'WORK')).toContain(
      'Pomodoros: 2 hoje (50 min de foco), 2 na semana (50 min).'
    );
  });

  it('keeps Pomodoros inside their Organization', async () => {
    const ana = await createViewer('Ana');
    const bia = await createViewer('Bia');
    const anaTask = await createTask(ana, 'Tarefa da Ana');
    const mine = await gql(ana, LOG, { minutes: 25, taskId: anaTask });

    const onHerTask = await gql(bia, LOG, { minutes: 25, taskId: anaTask });
    const removed = await gql(bia, `mutation ($id: ID!) { deletePomodoro(id: $id) }`, {
      id: mine.data.logPomodoro.id,
    });
    const seen = await gql(bia, FOCUS);

    expect(onHerTask.errors).toEqual(['NOT_FOUND']);
    expect(removed.data).toEqual({ deletePomodoro: false });
    expect(seen.data.focus).toMatchObject({ today: [], weekCount: 0 });
  });

  it('refuses a length that is not a block of focus', async () => {
    const viewer = await createViewer();
    const results = await Promise.all([0, 121].map(minutes => gql(viewer, LOG, { minutes })));
    expect(results.map(result => result.errors)).toEqual([['BAD_USER_INPUT'], ['BAD_USER_INPUT']]);
  });

  it('keeps a Pomodoro when its Task is deleted', async () => {
    const viewer = await createViewer();
    const taskId = await createTask(viewer, 'Passageira');
    await gql(viewer, LOG, { minutes: 25, taskId });
    await gql(viewer, `mutation ($id: ID!) { deleteTask(id: $id) }`, { id: taskId });

    const rows = await db
      .select({ minutes: schema.pomodoro.minutes, taskId: schema.pomodoro.taskId })
      .from(schema.pomodoro)
      .where(eq(schema.pomodoro.organizationId, viewer.organizationId));
    expect(rows).toEqual([{ minutes: 25, taskId: null }]);
  });

  it('counts by the calendar of Brazil, not UTC', () => {
    const at = (instant: string) => ({ endedAt: new Date(instant), minutes: 25 }) as PomodoroRow;
    // 2026-10-11 is a Sunday. 23:30 in São Paulo is already Monday in UTC.
    const summary = summarizeFocus(
      [
        at('2026-10-09T15:00:00Z'),
        at('2026-10-12T02:30:00Z'),
        // 01:00 on Monday in São Paulo: next week.
        at('2026-10-12T04:00:00Z'),
      ],
      '2026-10-11'
    );
    expect(summary).toMatchObject({ todayMinutes: 25, weekCount: 2, weekMinutes: 50 });
    expect(summary.today).toHaveLength(1);
  });
});
