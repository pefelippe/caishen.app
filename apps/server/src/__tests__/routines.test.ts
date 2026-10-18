import { db, schema } from '@zapbots/database';
import { eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createViewer, gql } from '../../test/helpers';
import { completionHandler, modelListHandler, mswServer } from '../../test/msw/openrouter';
import { nextRunAfter, runDueRoutines } from '../services/bots/routines';

beforeAll(() => mswServer.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => mswServer.use(modelListHandler));
afterEach(() => mswServer.resetHandlers());
afterAll(() => mswServer.close());

type Viewer = Awaited<ReturnType<typeof createViewer>>;

async function caishenId(viewer: Viewer): Promise<string> {
  return (await gql(viewer, `{ bot(key: FINANCE) { id } }`)).data.bot.id;
}

function setUp(viewer: Viewer, input: Record<string, unknown>) {
  return gql(
    viewer,
    `mutation ($input: CreateRoutineInput!) { createRoutine(input: $input) { id cadence nextRunAt } }`,
    { input }
  );
}

/** The Viewer's Jobs once none is still running, newest first. */
async function settledJobs(viewer: Viewer, botId: string) {
  return vi.waitFor(
    async () => {
      const { data } = await gql(
        viewer,
        `query ($botId: ID!) { jobs(botId: $botId) { id status deliverable } }`,
        { botId }
      );
      if (data.jobs.some((job: { status: string }) => ['QUEUED', 'RUNNING'].includes(job.status))) {
        throw new Error('still running');
      }
      return data.jobs;
    },
    { interval: 20, timeout: 3000 }
  );
}

describe('routines', () => {
  it('runs a week or a month later, keeping the day or ending on the last one', () => {
    const at = (iso: string) => new Date(iso);
    expect(nextRunAfter('WEEKLY', at('2026-10-17T12:00:00Z'))).toEqual(at('2026-10-24T12:00:00Z'));
    expect(nextRunAfter('MONTHLY', at('2026-10-17T12:00:00Z'))).toEqual(at('2026-11-17T12:00:00Z'));
    expect(nextRunAfter('MONTHLY', at('2027-01-31T09:00:00Z'))).toEqual(at('2027-02-28T09:00:00Z'));
    expect(nextRunAfter('MONTHLY', at('2026-12-15T09:00:00Z'))).toEqual(at('2027-01-15T09:00:00Z'));
  });

  it('hands the first Job over right away and the next ones when they are due, once each', async () => {
    // Routines left by earlier runs of the suite would also come due below.
    await db.delete(schema.routine);
    const viewer = await createViewer();
    const botId = await caishenId(viewer);
    mswServer.use(
      completionHandler([{ text: 'Resumo de outubro.' }, { text: 'Resumo de novembro.' }]).handler
    );

    const created = await setUp(viewer, {
      botId,
      cadence: 'MONTHLY',
      instructions: '  Resuma meu mês  ',
    });
    expect(created.errors).toEqual([]);
    const firstRun = await settledJobs(viewer, botId);
    expect(firstRun).toMatchObject([{ deliverable: 'Resumo de outubro.', status: 'DONE' }]);

    const nextRunAt = new Date(created.data.createRoutine.nextRunAt);
    expect(await runDueRoutines(new Date(nextRunAt.getTime() - 1000))).toBe(0);
    const due = new Date(nextRunAt.getTime() + 1000);
    expect(await runDueRoutines(due)).toBe(1);
    expect(await runDueRoutines(due)).toBe(0);

    const jobs = await settledJobs(viewer, botId);
    expect(jobs).toHaveLength(2);
    expect(jobs[0]).toMatchObject({ deliverable: 'Resumo de novembro.', status: 'DONE' });
    const detail = await gql(
      viewer,
      `query ($id: ID!) { job(id: $id) { instructions routine { id cadence } } }`,
      { id: jobs[0].id }
    );
    expect(detail.data.job).toEqual({
      instructions: 'Resuma meu mês',
      routine: { cadence: 'MONTHLY', id: created.data.createRoutine.id },
    });
    const [routine] = await db
      .select()
      .from(schema.routine)
      .where(eq(schema.routine.id, created.data.createRoutine.id));
    expect(routine!.nextRunAt).toEqual(nextRunAfter('MONTHLY', due));
  });

  it('skips a paused Routine and runs a missed one once after it is resumed', async () => {
    await db.delete(schema.routine);
    const viewer = await createViewer();
    const botId = await caishenId(viewer);
    mswServer.use(completionHandler([{ text: 'Primeira.' }, { text: 'Depois.' }]).handler);
    const created = await setUp(viewer, { botId, cadence: 'WEEKLY', instructions: 'Semana' });
    await settledJobs(viewer, botId);
    const id: string = created.data.createRoutine.id;
    const pause = (paused: boolean) =>
      gql(
        viewer,
        `mutation ($id: ID!, $paused: Boolean!) { setRoutinePaused(id: $id, paused: $paused) { paused } }`,
        { id, paused }
      );

    expect((await pause(true)).data.setRoutinePaused).toEqual({ paused: true });
    const late = new Date(new Date(created.data.createRoutine.nextRunAt).getTime() + 60_000);
    expect(await runDueRoutines(late)).toBe(0);

    expect((await pause(false)).data.setRoutinePaused).toEqual({ paused: false });
    expect(await runDueRoutines(late)).toBe(1);
    expect(await settledJobs(viewer, botId)).toHaveLength(2);

    const other = await createViewer('Davi');
    const refused = await gql(
      other,
      `mutation ($id: ID!) { setRoutinePaused(id: $id, paused: true) { paused } }`,
      { id }
    );
    expect(refused.errors).toEqual(['NOT_FOUND']);
  });

  it('keeps Routines inside their Organization, caps them and stops one when deleted', async () => {
    const owner = await createViewer();
    const intruder = await createViewer('Davi');
    const botId = await caishenId(owner);
    mswServer.use(
      completionHandler(Array.from({ length: 10 }, () => ({ text: 'Feito.' }))).handler
    );

    expect(
      (await setUp(intruder, { botId, cadence: 'WEEKLY', instructions: 'Invadir' })).errors
    ).toEqual(['NOT_FOUND']);
    expect((await setUp(owner, { botId, cadence: 'WEEKLY', instructions: ' ' })).errors).toEqual([
      'BAD_USER_INPUT',
    ]);
    const ids: string[] = [];
    for (let index = 0; index < 10; index += 1) {
      const { data } = await setUp(owner, {
        botId,
        cadence: 'WEEKLY',
        instructions: `Rotina ${index}`,
      });
      ids.push(data.createRoutine.id);
      // Each first run must finish: an Organization keeps at most three Jobs in progress.
      await settledJobs(owner, botId);
    }
    expect(
      (await setUp(owner, { botId, cadence: 'WEEKLY', instructions: 'Demais' })).errors
    ).toEqual(['BAD_USER_INPUT']);
    await settledJobs(owner, botId);

    expect((await gql(intruder, `{ routines(botId: "${botId}") { id } }`)).errors).toEqual([
      'NOT_FOUND',
    ]);
    expect((await gql(intruder, `mutation { deleteRoutine(id: "${ids[0]}") }`)).data).toEqual({
      deleteRoutine: false,
    });
    expect((await gql(owner, `mutation { deleteRoutine(id: "${ids[0]}") }`)).data).toEqual({
      deleteRoutine: true,
    });
    const left = await gql(owner, `{ routines(botId: "${botId}") { id } }`);
    expect(left.data.routines).toHaveLength(9);
    // The Job the deleted Routine handed over stays, now without a Routine.
    expect(await settledJobs(owner, botId)).toHaveLength(10);
  });
});
