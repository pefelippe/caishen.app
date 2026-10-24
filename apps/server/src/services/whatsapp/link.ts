import type { Viewer } from '@zapbots/auth';
import { db, schema } from '@zapbots/database';
import { and, eq, gt, isNull, or } from 'drizzle-orm';
import { randomInt } from 'node:crypto';

/** Letters and digits that cannot be mistaken for one another (no 0/O, 1/I/L). */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const CODE_MINUTES = 15;

/** A code as it can appear in a message: six of the alphabet, at least one a digit. */
const CODE_IN_TEXT = /\b[A-HJKMNP-Z2-9]{6}\b/g;

function newCode(): string {
  for (;;) {
    const code = Array.from(
      { length: CODE_LENGTH },
      () => ALPHABET[randomInt(ALPHABET.length)]
    ).join('');
    // A digit sets it apart from a word the User might write ("QUANTO").
    if (/\d/.test(code)) return code;
  }
}

/** The codes a message might carry, upper case. */
export const codesIn = (text: string) =>
  [...text.toUpperCase().matchAll(CODE_IN_TEXT)]
    .map(match => match[0])
    .filter(code => /\d/.test(code));

/**
 * A one-time code for the Viewer to send from WhatsApp, and the `wa.me` link that writes it. A new
 * code replaces the Viewer's earlier unused ones.
 */
export async function startWhatsappLink(viewer: Viewer) {
  const number = process.env.WHATSAPP_NUMBER?.replace(/\D/g, '');
  if (!number) throw new Error('WHATSAPP_NUMBER is not set');
  await db
    .delete(schema.whatsappLinkCode)
    .where(
      and(eq(schema.whatsappLinkCode.userId, viewer.userId), isNull(schema.whatsappLinkCode.usedAt))
    );
  const expiresAt = new Date(Date.now() + CODE_MINUTES * 60_000);
  for (;;) {
    const code = newCode();
    const [row] = await db
      .insert(schema.whatsappLinkCode)
      .values({ code, expiresAt, organizationId: viewer.organizationId, userId: viewer.userId })
      .onConflictDoNothing()
      .returning();
    if (row) {
      const text = `Conectar ao Caishen: ${code}`;
      return { code, expiresAt, url: `https://wa.me/${number}?text=${encodeURIComponent(text)}` };
    }
  }
}

/**
 * Links `phone` to the User whose code it sent, if the code is still good. The code is spent in
 * the same statement that checks it, so a message delivered twice links once.
 */
export async function redeemLinkCode(phone: string, code: string): Promise<boolean> {
  const [used] = await db
    .update(schema.whatsappLinkCode)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(schema.whatsappLinkCode.code, code),
        isNull(schema.whatsappLinkCode.usedAt),
        gt(schema.whatsappLinkCode.expiresAt, new Date())
      )
    )
    .returning();
  if (!used) return false;
  await db.transaction(async tx => {
    // The number leaves any User it was with, and the User any number they had.
    await tx
      .update(schema.whatsappLink)
      .set({ unlinkedAt: new Date() })
      .where(
        and(
          isNull(schema.whatsappLink.unlinkedAt),
          or(eq(schema.whatsappLink.phone, phone), eq(schema.whatsappLink.userId, used.userId))
        )
      );
    await tx
      .insert(schema.whatsappLink)
      .values({ organizationId: used.organizationId, phone, userId: used.userId });
  });
  return true;
}

/**
 * The Viewer a number speaks as: its active link, while the User is still a Member of that
 * Organization. Otherwise the number counts as unknown.
 */
export async function viewerOfPhone(phone: string): Promise<Viewer | null> {
  const [row] = await db
    .select({
      organizationId: schema.whatsappLink.organizationId,
      role: schema.member.role,
      userId: schema.whatsappLink.userId,
    })
    .from(schema.whatsappLink)
    .innerJoin(
      schema.member,
      and(
        eq(schema.member.userId, schema.whatsappLink.userId),
        eq(schema.member.organizationId, schema.whatsappLink.organizationId)
      )
    )
    .where(and(eq(schema.whatsappLink.phone, phone), isNull(schema.whatsappLink.unlinkedAt)));
  return row ?? null;
}

/** The Viewer's active link, if any. */
export async function whatsappLinkOf(viewer: Viewer) {
  const [row] = await db
    .select()
    .from(schema.whatsappLink)
    .where(
      and(eq(schema.whatsappLink.userId, viewer.userId), isNull(schema.whatsappLink.unlinkedAt))
    );
  return row ?? null;
}

export async function unlinkWhatsapp(viewer: Viewer): Promise<void> {
  await db
    .update(schema.whatsappLink)
    .set({ unlinkedAt: new Date() })
    .where(
      and(eq(schema.whatsappLink.userId, viewer.userId), isNull(schema.whatsappLink.unlinkedAt))
    );
}

/** "…1234": enough to recognize the number, not enough to read it off the screen. */
export const maskPhone = (phone: string) => `…${phone.slice(-4)}`;
