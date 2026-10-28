import type { Viewer } from '@zapbots/auth';
import { db, schema, type ProposalRow } from '@zapbots/database';
import { and, desc, eq, sql } from 'drizzle-orm';

import { ensureBots } from './catalog';

/** Channels outside the app the Caishen answers in: one Conversation each per Organization. */
export type OutsideChannel = 'TELEGRAM' | 'WHATSAPP';

const TITLES: Record<OutsideChannel, string> = { TELEGRAM: 'Telegram', WHATSAPP: 'WhatsApp' };

/** The Organization's Conversation on `channel`, created on its first message. */
export async function channelConversation(
  viewer: Viewer,
  channel: OutsideChannel
): Promise<string> {
  const find = async () => {
    const [row] = await db
      .select({ id: schema.conversation.id })
      .from(schema.conversation)
      .where(
        and(
          eq(schema.conversation.organizationId, viewer.organizationId),
          eq(schema.conversation.channel, channel)
        )
      );
    return row?.id;
  };
  const found = await find();
  if (found) return found;
  const [bot] = await ensureBots(viewer.organizationId);
  // Two first messages at once: the lock lets one create it, and the other finds it.
  return db.transaction(async tx => {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtext(${`channel:${viewer.organizationId}:${channel}`}))`
    );
    const [row] = await tx
      .select({ id: schema.conversation.id })
      .from(schema.conversation)
      .where(
        and(
          eq(schema.conversation.organizationId, viewer.organizationId),
          eq(schema.conversation.channel, channel)
        )
      );
    if (row) return row.id;
    const [created] = await tx
      .insert(schema.conversation)
      .values({
        botId: bot!.id,
        channel,
        organizationId: viewer.organizationId,
        // Not the default title, so the first message does not rename it.
        title: TITLES[channel],
      })
      .returning({ id: schema.conversation.id });
    return created!.id;
  });
}

/** The newest Proposal still waiting in a Conversation, for a "sim" or "não" typed back. */
export async function latestPending(conversationId: string): Promise<ProposalRow | undefined> {
  const [row] = await db
    .select()
    .from(schema.proposal)
    .where(
      and(eq(schema.proposal.conversationId, conversationId), eq(schema.proposal.status, 'PENDING'))
    )
    .orderBy(desc(schema.proposal.createdAt))
    .limit(1);
  return row;
}

// Only a clear yes writes: an "ok" in passing must not confirm a record (docs/adr/0013).
export const YES = new Set(['sim', 's', 'confirmar', 'confirmo']);
export const NO = new Set(['não', 'nao', 'n', 'cancelar', 'cancelo']);

export const HEADINGS = { CREATE: 'Adicionar', DELETE: 'Apagar', UPDATE: 'Corrigir' } as const;
