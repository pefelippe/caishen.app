import type { Viewer } from '@zapbots/auth';
import { db, schema, type AttachmentRow } from '@zapbots/database';
import { waitUntil } from '@vercel/functions';
import { and, eq, inArray, lt } from 'drizzle-orm';

import { attachmentText } from '../drive';
import { defaultModel, ModelError, streamCompletion } from '../models';
import { botPrompt } from './prompt';

const MAX_ATTACHMENTS = 5;
const PROGRESS_MS = 1000;
const IN_PROGRESS: ('QUEUED' | 'RUNNING')[] = ['QUEUED', 'RUNNING'];
/** Past this a Job on Vercel is dead: its function's `maxDuration` (vercel.json) is 5 minutes. */
const STALE_MS = 10 * 60_000;

/** Jobs this process is running, so a cancellation can interrupt the Model. */
const running = new Map<string, AbortController>();

export type JobFile = Pick<AttachmentRow, 'fileId' | 'mimeType' | 'name' | 'url'>;

/**
 * Saves a Job with its files and starts it in the background (docs/adr/0010); the client polls
 * `job` until it is DONE or FAILED. Callers validate the input first.
 */
export async function handOverJob(
  viewer: Viewer,
  input: { botId: string; files: JobFile[]; instructions: string; routineId?: string }
) {
  const job = await db.transaction(async tx => {
    const [row] = await tx
      .insert(schema.job)
      .values({
        botId: input.botId,
        createdById: viewer.userId,
        instructions: input.instructions,
        organizationId: viewer.organizationId,
        routineId: input.routineId ?? null,
      })
      .returning();
    if (input.files.length) {
      await tx.insert(schema.attachment).values(
        input.files.map(file => ({
          fileId: file.fileId,
          jobId: row!.id,
          mimeType: file.mimeType,
          name: file.name,
          organizationId: viewer.organizationId,
          url: file.url,
        }))
      );
    }
    return row!;
  });
  // On Vercel the function stays alive until the Job ends; elsewhere this is a no-op.
  waitUntil(runJob(viewer, job.id));
  return job;
}

async function finish(
  jobId: string,
  values: { deliverable: string; model: string } | { error: string }
) {
  await db
    .update(schema.job)
    .set({
      // A failed Job drops the partial text it was writing.
      deliverable: null,
      ...values,
      finishedAt: new Date(),
      status: 'deliverable' in values ? 'DONE' : 'FAILED',
    })
    // A Job cancelled meanwhile keeps its cancellation.
    .where(and(eq(schema.job.id, jobId), inArray(schema.job.status, IN_PROGRESS)));
}

/** Stops a Job in progress: the Model is interrupted and the Job ends as failed. */
export async function cancelJob(jobId: string): Promise<boolean> {
  const cancelled = await db
    .update(schema.job)
    .set({
      deliverable: null,
      error: 'Cancelado por você.',
      finishedAt: new Date(),
      status: 'FAILED',
    })
    .where(and(eq(schema.job.id, jobId), inArray(schema.job.status, IN_PROGRESS)))
    .returning({ id: schema.job.id });
  running.get(jobId)?.abort();
  return cancelled.length > 0;
}

/** The text of the Job's files the Bot can read, from the Viewer's own Connection. */
async function filesOf(viewer: Viewer, jobId: string): Promise<string[]> {
  const rows = await db.select().from(schema.attachment).where(eq(schema.attachment.jobId, jobId));
  const blocks: string[] = [];
  for (const row of rows.slice(0, MAX_ATTACHMENTS)) {
    const text = await attachmentText(viewer.userId, row);
    blocks.push(
      text
        ? `Arquivo "${row.name}":\n${text}`
        : `Arquivo "${row.name}" (conteúdo não legível daqui).`
    );
  }
  return blocks;
}

/**
 * Does a queued Job: the Bot reads the Viewer's data and the Job's files, writes the Deliverable
 * and the Job ends `DONE`, or `FAILED` with a reason in pt-BR. Never throws.
 */
export async function runJob(viewer: Viewer, jobId: string): Promise<void> {
  const abort = new AbortController();
  running.set(jobId, abort);
  try {
    const [row] = await db
      .select({ bot: schema.bot, job: schema.job })
      .from(schema.job)
      .innerJoin(schema.bot, eq(schema.bot.id, schema.job.botId))
      .where(eq(schema.job.id, jobId));
    if (!row || row.job.status !== 'QUEUED') return;
    const { bot, job } = row;
    // Only a Job still queued starts: one cancelled in the meantime stays cancelled.
    const [started] = await db
      .update(schema.job)
      .set({ startedAt: new Date(), status: 'RUNNING' })
      .where(and(eq(schema.job.id, jobId), eq(schema.job.status, 'QUEUED')))
      .returning({ id: schema.job.id });
    if (!started) return;

    const fallback = await defaultModel();
    // A Model chosen for the Bot that fails on its side gets one retry with the server default.
    const models = [...new Set([bot.model ?? fallback, fallback].filter(Boolean))];
    if (!models.length) {
      await finish(jobId, { error: 'Nenhum Modelo disponível para fazer o Workflow.' });
      return;
    }
    const files = await filesOf(viewer, jobId);
    let deliverable = '';
    // The text written so far is saved at once and then every second, so the Job page shows it growing.
    let savedAt = 0;
    let saving: Promise<unknown> = Promise.resolve();
    const saveProgress = () => {
      savedAt = Date.now();
      const text = deliverable;
      saving = saving
        .then(() =>
          db
            .update(schema.job)
            .set({ deliverable: text })
            .where(and(eq(schema.job.id, jobId), eq(schema.job.status, 'RUNNING')))
        )
        .catch(() => undefined);
    };
    const messages = [
      { content: await botPrompt(viewer, bot, { mode: 'job' }), role: 'system' as const },
      { content: [job.instructions, ...files].join('\n\n'), role: 'user' as const },
    ];
    let model = models[0]!;
    for (const [index, candidate] of models.entries()) {
      model = candidate;
      try {
        await streamCompletion({
          messages,
          model,
          onText: text => {
            deliverable += text;
            if (Date.now() - savedAt >= PROGRESS_MS) saveProgress();
          },
          signal: abort.signal,
        });
        break;
      } catch (error) {
        const retry =
          error instanceof ModelError &&
          error.modelSpecific &&
          !deliverable &&
          index < models.length - 1;
        if (!retry) throw error;
      }
    }
    await saving;
    await finish(
      jobId,
      deliverable.trim()
        ? { deliverable: deliverable.trim(), model }
        : { error: 'O Modelo não devolveu nada. Tente de novo.' }
    );
  } catch (error) {
    if (!(error instanceof ModelError) && !abort.signal.aborted)
      console.error('job failed:', error);
    await finish(jobId, {
      error: error instanceof ModelError ? error.message : 'O Workflow falhou no servidor.',
    }).catch(() => undefined);
  } finally {
    running.delete(jobId);
  }
}

/**
 * Jobs run inside the server process, so a restart leaves the unfinished ones behind. On boot they
 * are marked failed, to be handed over again.
 */
export async function failInterruptedJobs(): Promise<void> {
  await db
    .update(schema.job)
    .set({
      error: 'O servidor reiniciou antes do fim. Peça de novo.',
      finishedAt: new Date(),
      status: 'FAILED',
    })
    .where(inArray(schema.job.status, ['QUEUED', 'RUNNING']));
}

/**
 * On Vercel a Job dies with its function, and no boot comes after to sweep it (docs/adr/0012):
 * one still in progress long after its function's time limit is marked failed.
 */
export async function failStaleJobs(): Promise<void> {
  await db
    .update(schema.job)
    .set({
      error: 'O Workflow passou do tempo limite. Peça de novo.',
      finishedAt: new Date(),
      status: 'FAILED',
    })
    .where(
      and(
        inArray(schema.job.status, IN_PROGRESS),
        lt(schema.job.createdAt, new Date(Date.now() - STALE_MS))
      )
    );
}
