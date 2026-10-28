import { randomBytes } from 'node:crypto';

import type { Viewer } from '@zapbots/auth';
import { db, schema } from '@zapbots/database';
import { and, eq, gt, isNull, or } from 'drizzle-orm';

const CODE_MINUTES = 15;

/**
 * A one-time link for the Viewer to open in Telegram: `t.me/<bot>?start=<code>`. Tapping Iniciar
 * sends `/start <code>` from their chat. A new code replaces the Viewer's earlier unused ones.
 */
export async function startTelegramLink(viewer: Viewer) {
  const bot = process.env.TELEGRAM_BOT_USERNAME?.replace(/^@/, '');
  if (!bot) throw new Error('TELEGRAM_BOT_USERNAME is not set');
  await db
    .delete(schema.telegramLinkCode)
    .where(
      and(eq(schema.telegramLinkCode.userId, viewer.userId), isNull(schema.telegramLinkCode.usedAt))
    );
  const expiresAt = new Date(Date.now() + CODE_MINUTES * 60_000);
  // Telegram's start parameter takes up to 64 of A-Z, a-z, 0-9, _ and -.
  const code = randomBytes(18).toString('base64url');
  await db
    .insert(schema.telegramLinkCode)
    .values({ code, expiresAt, organizationId: viewer.organizationId, userId: viewer.userId });
  return { expiresAt, url: `https://t.me/${bot}?start=${code}` };
}

/**
 * Links `chatId` to the User whose code it sent, if the code is still good. The code is spent in
 * the same statement that checks it, so an update delivered twice links once.
 */
export async function redeemTelegramCode(chatId: string, code: string): Promise<boolean> {
  const [used] = await db
    .update(schema.telegramLinkCode)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(schema.telegramLinkCode.code, code),
        isNull(schema.telegramLinkCode.usedAt),
        gt(schema.telegramLinkCode.expiresAt, new Date())
      )
    )
    .returning();
  if (!used) return false;
  await db.transaction(async tx => {
    // The chat leaves any User it was with, and the User any chat they had.
    await tx
      .update(schema.telegramLink)
      .set({ unlinkedAt: new Date() })
      .where(
        and(
          isNull(schema.telegramLink.unlinkedAt),
          or(eq(schema.telegramLink.chatId, chatId), eq(schema.telegramLink.userId, used.userId))
        )
      );
    await tx
      .insert(schema.telegramLink)
      .values({ chatId, organizationId: used.organizationId, userId: used.userId });
  });
  return true;
}

/** The Viewer a chat speaks as: its active link, while the User is still a Member there. */
export async function viewerOfChat(chatId: string): Promise<null | Viewer> {
  const [row] = await db
    .select({
      organizationId: schema.telegramLink.organizationId,
      role: schema.member.role,
      userId: schema.telegramLink.userId,
    })
    .from(schema.telegramLink)
    .innerJoin(
      schema.member,
      and(
        eq(schema.member.userId, schema.telegramLink.userId),
        eq(schema.member.organizationId, schema.telegramLink.organizationId)
      )
    )
    .where(and(eq(schema.telegramLink.chatId, chatId), isNull(schema.telegramLink.unlinkedAt)));
  return row ?? null;
}

export async function telegramLinkOf(viewer: Viewer) {
  const [row] = await db
    .select()
    .from(schema.telegramLink)
    .where(
      and(eq(schema.telegramLink.userId, viewer.userId), isNull(schema.telegramLink.unlinkedAt))
    );
  return row ?? null;
}

export async function unlinkTelegram(viewer: Viewer): Promise<void> {
  await db
    .update(schema.telegramLink)
    .set({ unlinkedAt: new Date() })
    .where(
      and(eq(schema.telegramLink.userId, viewer.userId), isNull(schema.telegramLink.unlinkedAt))
    );
}
