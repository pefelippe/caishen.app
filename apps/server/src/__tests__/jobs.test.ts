import { db, schema } from '@zapbots/database';
import { eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createViewer, gql } from '../../test/helpers';
import { docExportHandler } from '../../test/msw/google';
import { completionHandler, modelListHandler, mswServer } from '../../test/msw/openrouter';
import { failInterruptedJobs } from '../services/bots/jobs';
import { DRIVE_SCOPE } from '../services/drive';

beforeAll(() => mswServer.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => mswServer.use(modelListHandler));
afterEach(() => mswServer.resetHandlers());
afterAll(() => mswServer.close());

type Viewer = Awaited<ReturnType<typeof createViewer>>;

const JOB = `query ($id: ID!) {
  job(id: $id) { status instructions deliverable error startedAt finishedAt attachments { name } }
}`;

async function caishenId(viewer: Viewer): Promise<string> {
  return (await gql(viewer, `{ bot(key: FINANCE) { id } }`)).data.bot.id;
}

function handOver(viewer: Viewer, input: Record<string, unknown>) {
  return gql(
    viewer,
    `mutation ($input: CreateJobInput!) { createJob(input: $input) { id status } }`,
    { input }
  );
}

/** The Job once the background run has finished it. */
async function finished(viewer: Viewer, id: string) {
  return vi.waitFor(
    async () => {
      const { data } = await gql(viewer, JOB, { id });
      if (data.job.status === 'QUEUED' || data.job.status === 'RUNNING') {
        throw new Error('still running');
      }
      return data.job;
    },
    { interval: 20, timeout: 3000 }
  );
}

const file = (name: string, fileId = name, mimeType = 'application/vnd.google-apps.document') => ({
  fileId,
  mimeType,
  name,
  url: `https://drive.google.com/${fileId}`,
});

describe('jobs', () => {
  it('hands a Job to Caishen, who reads the Drive files and comes back with a Deliverable', async () => {
    const viewer = await createViewer();
    await db.insert(schema.account).values({
      accessToken: 'drive-token',
      accessTokenExpiresAt: new Date(Date.now() + 3_600_000),
      accountId: 'google-user',
      id: crypto.randomUUID(),
      providerId: 'google',
      scope: `openid,${DRIVE_SCOPE}`,
      userId: viewer.userId,
    });
    const doc = docExportHandler('doc-1', '  Fatura de outubro: R$ 1.200,00  ');
    const { handler, log } = completionHandler([{ text: 'Plano pronto: pague a Fatura inteira.' }]);
    mswServer.use(doc.handler, handler);

    const created = await handOver(viewer, {
      attachments: [
        file('Fatura', 'doc-1'),
        // A PDF has no text here; no request is made (an unhandled one would fail the test).
        file('Contrato', 'pdf-1', 'application/pdf'),
      ],
      botId: await caishenId(viewer),
      instructions: '  Monte um plano para a Fatura  ',
    });
    expect(created.errors).toEqual([]);
    expect(created.data.createJob.status).toBe('QUEUED');

    const job = await finished(viewer, created.data.createJob.id);
    expect(job).toMatchObject({
      attachments: [{ name: 'Fatura' }, { name: 'Contrato' }],
      deliverable: 'Plano pronto: pague a Fatura inteira.',
      error: null,
      instructions: 'Monte um plano para a Fatura',
      status: 'DONE',
    });
    expect(job.startedAt).not.toBeNull();
    expect(job.finishedAt).not.toBeNull();

    expect(doc.tokens).toEqual(['Bearer drive-token']);
    const [system, request] = log[0]!.messages;
    expect(system!.content).toContain('Você recebeu um Trabalho.');
    expect(request!.content).toBe(
      [
        'Monte um plano para a Fatura',
        'Arquivo "Fatura":\nFatura de outubro: R$ 1.200,00',
        'Arquivo "Contrato" (conteúdo não legível daqui).',
      ].join('\n\n')
    );
    expect(log[0]!.tools).toBeUndefined();

    const list = await gql(viewer, `query ($botId: ID!) { jobs(botId: $botId) { id } }`, {
      botId: await caishenId(viewer),
    });
    expect(list.data.jobs).toEqual([{ id: created.data.createJob.id }]);
  });

  it('ends a Job as failed, with the reason, when the Model fails', async () => {
    const viewer = await createViewer();
    mswServer.use(completionHandler([{ status: 429 }]).handler);

    const created = await handOver(viewer, {
      botId: await caishenId(viewer),
      instructions: 'Resuma minhas dívidas',
    });
    const job = await finished(viewer, created.data.createJob.id);
    expect(job).toMatchObject({ deliverable: null, status: 'FAILED' });
    expect(job.error).toMatch(/limite/);
  });

  it('refuses a Job without instructions, with too many files, or without a Model provider', async () => {
    const viewer = await createViewer();
    const botId = await caishenId(viewer);

    expect((await handOver(viewer, { botId, instructions: '   ' })).errors).toEqual([
      'BAD_USER_INPUT',
    ]);
    const six = Array.from({ length: 6 }, (_, index) => file(`Arquivo ${index}`));
    expect(
      (await handOver(viewer, { attachments: six, botId, instructions: 'Leia' })).errors
    ).toEqual(['BAD_USER_INPUT']);

    const key = process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    try {
      expect((await handOver(viewer, { botId, instructions: 'Leia' })).errors).toEqual([
        'BAD_USER_INPUT',
      ]);
    } finally {
      process.env.OPENROUTER_API_KEY = key;
    }
    const list = await gql(viewer, `query ($botId: ID!) { jobs(botId: $botId) { id } }`, { botId });
    expect(list.data.jobs).toEqual([]);
  });

  it('keeps one Organization from handing work to, or reading, another one’s Bot', async () => {
    const owner = await createViewer();
    const intruder = await createViewer('Davi');
    const botId = await caishenId(owner);
    mswServer.use(completionHandler([{ text: 'Feito.' }]).handler);
    const created = await handOver(owner, { botId, instructions: 'Resuma' });
    const id: string = created.data.createJob.id;
    await finished(owner, id);

    expect((await handOver(intruder, { botId, instructions: 'Invadir' })).errors).toEqual([
      'NOT_FOUND',
    ]);
    expect((await gql(intruder, `{ jobs(botId: "${botId}") { id } }`)).errors).toEqual([
      'NOT_FOUND',
    ]);
    expect((await gql(intruder, JOB, { id })).data).toEqual({ job: null });
    expect((await gql(intruder, `mutation { deleteJob(id: "${id}") }`)).data).toEqual({
      deleteJob: false,
    });
    expect((await gql(owner, JOB, { id })).data.job.status).toBe('DONE');
  });

  it('marks Jobs a restart interrupted as failed', async () => {
    const viewer = await createViewer();
    const [job] = await db
      .insert(schema.job)
      .values({
        botId: await caishenId(viewer),
        instructions: 'Interrompido',
        organizationId: viewer.organizationId,
        startedAt: new Date(),
        status: 'RUNNING',
      })
      .returning();

    await failInterruptedJobs();

    const [row] = await db.select().from(schema.job).where(eq(schema.job.id, job!.id));
    expect(row).toMatchObject({ error: expect.stringContaining('reiniciou'), status: 'FAILED' });
    expect(row!.finishedAt).not.toBeNull();
  });
});
