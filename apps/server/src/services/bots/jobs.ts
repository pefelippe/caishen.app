import type { Viewer } from '@zapbots/auth';
import { db, schema } from '@zapbots/database';
import { eq, inArray } from 'drizzle-orm';

import { attachmentText } from '../drive';
import { defaultModel, ModelError, streamCompletion } from '../models';
import { botPrompt } from './prompt';

const MAX_ATTACHMENTS = 5;

async function finish(jobId: string, values: { deliverable: string } | { error: string }) {
  await db
    .update(schema.job)
    .set({
      ...values,
      finishedAt: new Date(),
      status: 'deliverable' in values ? 'DONE' : 'FAILED',
    })
    .where(eq(schema.job.id, jobId));
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
  try {
    const [row] = await db
      .select({ bot: schema.bot, job: schema.job })
      .from(schema.job)
      .innerJoin(schema.bot, eq(schema.bot.id, schema.job.botId))
      .where(eq(schema.job.id, jobId));
    if (!row || row.job.status !== 'QUEUED') return;
    const { bot, job } = row;
    await db
      .update(schema.job)
      .set({ startedAt: new Date(), status: 'RUNNING' })
      .where(eq(schema.job.id, jobId));

    const model = bot.model ?? (await defaultModel());
    if (!model) {
      await finish(jobId, { error: 'Nenhum Modelo disponível para fazer o Trabalho.' });
      return;
    }
    const files = await filesOf(viewer, jobId);
    let deliverable = '';
    await streamCompletion({
      messages: [
        { content: await botPrompt(viewer, bot, { mode: 'job' }), role: 'system' },
        { content: [job.instructions, ...files].join('\n\n'), role: 'user' },
      ],
      model,
      onText: text => {
        deliverable += text;
      },
    });
    await finish(
      jobId,
      deliverable.trim()
        ? { deliverable: deliverable.trim() }
        : { error: 'O Modelo não devolveu nada. Tente de novo.' }
    );
  } catch (error) {
    if (!(error instanceof ModelError)) console.error('job failed:', error);
    await finish(jobId, {
      error: error instanceof ModelError ? error.message : 'O Trabalho falhou no servidor.',
    }).catch(() => undefined);
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
