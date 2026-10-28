import { closeDb, db, schema } from '@zapbots/database';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createViewer, gql } from '../../test/helpers';
import { googleTasksHandlers } from '../../test/msw/google';
import { mswServer } from '../../test/msw/openrouter';
import { TASKS_SCOPE } from '../services/personal/googleTasks';

beforeAll(() => mswServer.listen());
afterEach(() => mswServer.resetHandlers());
afterAll(async () => {
  mswServer.close();
  await closeDb();
});

const SYNC = `mutation { syncGoogleTasks { added done removed } }`;
const TASKS = `{ tasks { title dueOn notes doneAt } }`;

/** A Google account linked with `scope`, its token still fresh. */
async function linkGoogle(userId: string, scope: string) {
  await db.insert(schema.account).values({
    accessToken: 'google-token',
    accessTokenExpiresAt: new Date(Date.now() + 3_600_000),
    accountId: `g-${userId}`,
    id: crypto.randomUUID(),
    providerId: 'google',
    refreshToken: 'google-refresh',
    scope: `openid,email,profile,${scope}`,
    userId,
  });
}

describe('Google Tarefas', () => {
  it('copies the open tasks into Tarefas one way, a Lista per Google list', async () => {
    const viewer = await createViewer();
    expect((await gql(viewer, SYNC)).errors).toEqual(['BAD_USER_INPUT']);
    await linkGoogle(viewer.userId, TASKS_SCOPE);
    const connections = (await gql(viewer, `{ connections { kind connected } }`)).data.connections;
    expect(connections).toContainEqual({ connected: true, kind: 'GOOGLE_TASKS' });

    const lists: { id: string; tasks: Record<string, unknown>[]; title: string }[] = [
      {
        id: 'L1',
        tasks: [
          {
            due: '2026-11-10T00:00:00.000Z',
            id: 't1',
            notes: 'Leite',
            status: 'needsAction',
            title: 'Mercado',
          },
          { id: 't2', status: 'needsAction', title: 'Ligar para a Bia' },
          { completed: '2026-10-01T10:00:00.000Z', id: 't3', status: 'completed', title: 'Velha' },
        ],
        title: 'Casa',
      },
    ];
    const google = googleTasksHandlers(lists);
    mswServer.use(...google.handlers);
    expect((await gql(viewer, SYNC)).data.syncGoogleTasks).toEqual({
      added: 2,
      done: 0,
      removed: 0,
    });
    expect(google.tokens.every(token => token === 'Bearer google-token')).toBe(true);
    const tasks = (await gql(viewer, TASKS)).data.tasks;
    expect(tasks).toEqual([
      { doneAt: null, dueOn: '2026-11-10', notes: 'Leite', title: 'Mercado' },
      { doneAt: null, dueOn: null, notes: '', title: 'Ligar para a Bia' },
    ]);

    const taskLists = (await gql(viewer, `{ taskLists { name } }`)).data.taskLists;
    expect(taskLists).toEqual([expect.objectContaining({ name: 'Casa' })]);

    // There: one renamed, one done, one deleted. A second read changes them here, adds nothing.
    lists[0]!.tasks = [
      {
        due: '2026-11-11T00:00:00.000Z',
        id: 't1',
        status: 'needsAction',
        title: 'Mercado e farmácia',
      },
      {
        completed: '2026-10-28T10:00:00.000Z',
        id: 't2',
        status: 'completed',
        title: 'Ligar para a Bia',
      },
      { deleted: true, id: 't3', status: 'completed', title: 'Velha' },
    ];
    expect((await gql(viewer, SYNC)).data.syncGoogleTasks).toEqual({
      added: 0,
      done: 1,
      removed: 0,
    });
    const open = (await gql(viewer, TASKS)).data.tasks;
    expect(open).toEqual([
      expect.objectContaining({ dueOn: '2026-11-11', title: 'Mercado e farmácia' }),
    ]);
    lists[0]!.tasks = [];
    expect((await gql(viewer, SYNC)).data.syncGoogleTasks.added).toBe(0);
  });

  it('says when Google takes the access back, and keeps it on the Connection', async () => {
    const viewer = await createViewer();
    await linkGoogle(viewer.userId, TASKS_SCOPE);
    mswServer.use(
      http.get('https://tasks.googleapis.com/tasks/v1/users/@me/lists', () =>
        HttpResponse.json({ error: 'revoked' }, { status: 401 })
      )
    );
    expect((await gql(viewer, SYNC)).errors).toEqual(['BAD_USER_INPUT']);
    expect(
      (await gql(viewer, `{ googleTasksSync { error lastSyncedAt } }`)).data.googleTasksSync
    ).toEqual({
      error: 'O Google não liberou as Tarefas. Conecte de novo.',
      lastSyncedAt: null,
    });
  });

  it('needs the Tarefas scope, not only a Google sign-in', async () => {
    const viewer = await createViewer();
    await linkGoogle(viewer.userId, 'https://www.googleapis.com/auth/drive.file');
    expect((await gql(viewer, SYNC)).errors).toEqual(['BAD_USER_INPUT']);
  });
});
