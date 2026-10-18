import { db, schema } from '@zapbots/database';
import { eq } from 'drizzle-orm';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createViewer, gql } from '../../test/helpers';
import { docExportHandler, fileDownloadHandler, pdfWithText } from '../../test/msw/google';
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
    mswServer.use(
      doc.handler,
      fileDownloadHandler(
        'pdf-1',
        pdfWithText(['Contrato de credito pessoal', 'Taxa: 3,20% a.m.'])
      ),
      fileDownloadHandler('pdf-2', 'not a pdf at all'),
      handler
    );

    const created = await handOver(viewer, {
      attachments: [
        file('Fatura', 'doc-1'),
        file('Contrato', 'pdf-1', 'application/pdf'),
        file('Escaneado', 'pdf-2', 'application/pdf'),
        // An image has no text here; no request is made (an unhandled one would fail the test).
        file('Foto', 'img-1', 'image/png'),
      ],
      botId: await caishenId(viewer),
      instructions: '  Monte um plano para a Fatura  ',
    });
    expect(created.errors).toEqual([]);
    expect(created.data.createJob.status).toBe('QUEUED');

    const job = await finished(viewer, created.data.createJob.id);
    expect(job).toMatchObject({
      attachments: [
        { name: 'Fatura' },
        { name: 'Contrato' },
        { name: 'Escaneado' },
        { name: 'Foto' },
      ],
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
    const blocks = request!.content!.split('\n\n');
    expect(blocks[0]).toBe('Monte um plano para a Fatura');
    expect(blocks[1]).toBe('Arquivo "Fatura":\nFatura de outubro: R$ 1.200,00');
    expect(blocks[2]).toMatch(
      /^Arquivo "Contrato":\nContrato de credito pessoal\s+Taxa: 3,20% a\.m\.$/
    );
    expect(blocks.slice(3)).toEqual([
      'Arquivo "Escaneado" (conteúdo não legível daqui).',
      'Arquivo "Foto" (conteúdo não legível daqui).',
    ]);
    expect(log[0]!.tools).toBeUndefined();

    const list = await gql(viewer, `query ($botId: ID!) { jobs(botId: $botId) { id } }`, {
      botId: await caishenId(viewer),
    });
    expect(list.data.jobs).toEqual([{ id: created.data.createJob.id }]);
    const team = await gql(viewer, `{ bots { recentJobs(limit: 99) { id status } } }`);
    expect(team.data.bots).toEqual([
      { recentJobs: [{ id: created.data.createJob.id, status: 'DONE' }] },
    ]);
  });

  it('shows the Deliverable as it is written, then the whole of it', async () => {
    const viewer = await createViewer();
    mswServer.use(
      completionHandler([{ delayMs: 1500, pieces: ['Primeira parte. ', 'Segunda parte.'] }]).handler
    );
    const created = await handOver(viewer, {
      botId: await caishenId(viewer),
      instructions: 'Escreva devagar',
    });
    const id: string = created.data.createJob.id;

    const partial = await vi.waitFor(
      async () => {
        const { data } = await gql(viewer, JOB, { id });
        if (!data.job.deliverable) throw new Error('nothing written yet');
        return data.job;
      },
      { interval: 50, timeout: 3000 }
    );
    expect(partial).toMatchObject({ deliverable: 'Primeira parte. ', status: 'RUNNING' });
    expect(await finished(viewer, id)).toMatchObject({
      deliverable: 'Primeira parte. Segunda parte.',
      status: 'DONE',
    });
  });

  it('retries once with the default Model when the chosen one fails on its side', async () => {
    const viewer = await createViewer();
    const botId = await caishenId(viewer);
    await gql(viewer, `mutation ($id: ID!) { setBotModel(id: $id, model: "test/plain") { id } }`, {
      id: botId,
    });
    const { handler, log } = completionHandler([{ status: 429 }, { text: 'Feito no padrão.' }]);
    mswServer.use(handler);

    const created = await handOver(viewer, { botId, instructions: 'Resuma' });
    const job = await finished(viewer, created.data.createJob.id);
    expect(job).toMatchObject({ deliverable: 'Feito no padrão.', status: 'DONE' });
    expect(log.map(request => request.model)).toEqual(['test/plain', 'test/with-tools']);
    const detail = await gql(viewer, `query ($id: ID!) { job(id: $id) { model } }`, {
      id: created.data.createJob.id,
    });
    expect(detail.data.job.model).toBe('test/with-tools');

    // A refused key is not the Model's fault: no retry.
    const refused = completionHandler([{ status: 401 }]);
    mswServer.use(refused.handler);
    const again = await handOver(viewer, { botId, instructions: 'Resuma de novo' });
    expect(await finished(viewer, again.data.createJob.id)).toMatchObject({ status: 'FAILED' });
    expect(refused.log).toHaveLength(1);
  });

  it('cancels a Job while the Model is writing, and keeps the cancellation', async () => {
    const viewer = await createViewer();
    mswServer.use(
      completionHandler([{ delayMs: 1000, pieces: ['Começando. ', 'Nunca chega.'] }]).handler
    );
    const created = await handOver(viewer, {
      botId: await caishenId(viewer),
      instructions: 'Escreva devagar',
    });
    const id: string = created.data.createJob.id;
    await vi.waitFor(
      async () => {
        const { data } = await gql(viewer, JOB, { id });
        if (!data.job.deliverable) throw new Error('nothing written yet');
      },
      { interval: 50, timeout: 3000 }
    );

    const cancel = (as: Viewer) =>
      gql(as, `mutation ($id: ID!) { cancelJob(id: $id) { status error deliverable } }`, { id });
    expect((await cancel(await createViewer('Davi'))).errors).toEqual(['NOT_FOUND']);
    expect((await cancel(viewer)).data.cancelJob).toEqual({
      deliverable: null,
      error: 'Cancelado por você.',
      status: 'FAILED',
    });
    // The stream is interrupted: it never finishes the Job over the cancellation.
    await new Promise(resolve => setTimeout(resolve, 1300));
    expect((await gql(viewer, JOB, { id })).data.job).toMatchObject({
      deliverable: null,
      error: 'Cancelado por você.',
      status: 'FAILED',
    });
    expect((await cancel(viewer)).errors).toEqual(['BAD_USER_INPUT']);
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

  it('hands a failed Job over again, with the same instructions and files, and only a failed one', async () => {
    const viewer = await createViewer();
    mswServer.use(completionHandler([{ status: 500 }, { text: 'Agora foi.' }]).handler);
    const created = await handOver(viewer, {
      attachments: [file('Foto', 'img-1', 'image/png')],
      botId: await caishenId(viewer),
      instructions: 'Resuma minhas dívidas',
    });
    const failed = await finished(viewer, created.data.createJob.id);
    expect(failed.status).toBe('FAILED');

    const retry = (as: Viewer, id: string) =>
      gql(as, `mutation ($id: ID!) { retryJob(id: $id) { id status } }`, { id });
    expect((await retry(await createViewer('Davi'), created.data.createJob.id)).errors).toEqual([
      'NOT_FOUND',
    ]);
    const retried = await retry(viewer, created.data.createJob.id);
    expect(retried.errors).toEqual([]);
    expect(retried.data.retryJob.id).not.toBe(created.data.createJob.id);

    const again = await finished(viewer, retried.data.retryJob.id);
    expect(again).toMatchObject({
      attachments: [{ name: 'Foto' }],
      deliverable: 'Agora foi.',
      instructions: 'Resuma minhas dívidas',
      status: 'DONE',
    });
    expect((await retry(viewer, retried.data.retryJob.id)).errors).toEqual(['BAD_USER_INPUT']);
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

  it('keeps at most three Jobs in progress per Organization', async () => {
    const viewer = await createViewer();
    const botId = await caishenId(viewer);
    const busy = await db
      .insert(schema.job)
      .values(
        ['QUEUED', 'RUNNING', 'RUNNING'].map(status => ({
          botId,
          instructions: 'Em andamento',
          organizationId: viewer.organizationId,
          status: status as 'QUEUED' | 'RUNNING',
        }))
      )
      .returning({ id: schema.job.id });

    expect((await handOver(viewer, { botId, instructions: 'Mais um' })).errors).toEqual([
      'BAD_USER_INPUT',
    ]);
    // Another Organization is not held back by these.
    const other = await createViewer('Davi');
    mswServer.use(completionHandler([{ text: 'Feito.' }, { text: 'Feito.' }]).handler);
    const elsewhere = await handOver(other, { botId: await caishenId(other), instructions: 'Ok' });
    expect(elsewhere.errors).toEqual([]);
    await finished(other, elsewhere.data.createJob.id);

    await db
      .update(schema.job)
      .set({ deliverable: 'Pronto.', status: 'DONE' })
      .where(eq(schema.job.id, busy[0]!.id));
    const allowed = await handOver(viewer, { botId, instructions: 'Agora vai' });
    expect(allowed.errors).toEqual([]);
    await finished(viewer, allowed.data.createJob.id);
    await db.delete(schema.job).where(eq(schema.job.organizationId, viewer.organizationId));
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
