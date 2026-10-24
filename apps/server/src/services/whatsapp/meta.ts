import { db, schema } from '@zapbots/database';
import { today } from '@zapbots/finance';
import { eq, sql } from 'drizzle-orm';
import { createHmac, timingSafeEqual } from 'node:crypto';

/** The WhatsApp Cloud API, spoken over REST without an SDK, like Stripe (docs/adr/0019). */
const GRAPH = 'https://graph.facebook.com';
const VERSION = 'v23.0';
/** The longest text WhatsApp takes in one message. */
export const TEXT_LIMIT = 4096;
/** Interactive bodies are shorter; a button's title shorter still. */
const BUTTON_BODY_LIMIT = 1024;
const BUTTON_TITLE_LIMIT = 20;
const DEFAULT_CAP = 1000;
const cap = () => Number(process.env.WHATSAPP_MONTHLY_CAP) || DEFAULT_CAP;

/** The last message of the month, once the cap is reached. */
export const capReached = () =>
  `Chegamos ao limite de mensagens do WhatsApp deste mês. Continue pelo app${
    process.env.CLIENT_ORIGIN ? `: ${process.env.CLIENT_ORIGIN}/chat` : '.'
  }`;

export class MetaError extends Error {}

export const whatsappConfigured = () =>
  Boolean(
    process.env.WHATSAPP_TOKEN &&
    process.env.WHATSAPP_PHONE_NUMBER_ID &&
    process.env.WHATSAPP_APP_SECRET &&
    process.env.WHATSAPP_VERIFY_TOKEN &&
    process.env.WHATSAPP_NUMBER
  );

/** Meta's `X-Hub-Signature-256`: an HMAC-SHA256 of the raw body with the App Secret. */
export function verifySignature(raw: Buffer, header: string | undefined): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !header?.startsWith('sha256=')) return false;
  const expected = createHmac('sha256', secret).update(raw).digest();
  const given = Buffer.from(header.slice('sha256='.length), 'hex');
  // timingSafeEqual throws on buffers of different lengths.
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** The answer to Meta's subscription check (`GET` with `hub.*`), or null to refuse it. */
export function verifyChallenge(query: Record<string, unknown>): string | null {
  const token = process.env.WHATSAPP_VERIFY_TOKEN;
  return token &&
    query['hub.mode'] === 'subscribe' &&
    query['hub.verify_token'] === token &&
    typeof query['hub.challenge'] === 'string'
    ? query['hub.challenge']
    : null;
}

/**
 * Takes one message out of the month's free cap: `ok` to send it, `last` when only the closing
 * notice still fits, `over` once even that went out. One upsert, so concurrent replies cannot both
 * take the last slot.
 */
async function reserve(): Promise<'last' | 'ok' | 'over'> {
  const [row] = await db
    .insert(schema.whatsappUsage)
    .values({ month: today().slice(0, 7), sent: 1 })
    .onConflictDoUpdate({
      set: { sent: sql`${schema.whatsappUsage.sent} + 1` },
      target: schema.whatsappUsage.month,
    })
    .returning({ sent: schema.whatsappUsage.sent });
  return row!.sent < cap() ? 'ok' : row!.sent === cap() ? 'last' : 'over';
}

/** True once the month's cap is used up, notice included: nothing more goes out, so nothing is worked out. */
export async function capUsedUp(): Promise<boolean> {
  const [row] = await db
    .select({ sent: schema.whatsappUsage.sent })
    .from(schema.whatsappUsage)
    .where(eq(schema.whatsappUsage.month, today().slice(0, 7)));
  return (row?.sent ?? 0) >= cap();
}

async function post(body: Record<string, unknown>): Promise<void> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) throw new MetaError('O WhatsApp não está configurado.');
  const response = await fetch(`${GRAPH}/${VERSION}/${phoneNumberId}/messages`, {
    body: JSON.stringify({ messaging_product: 'whatsapp', ...body }),
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    method: 'POST',
  });
  if (!response.ok) {
    const refused = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
    console.error('whatsapp refused:', response.status, refused.error?.message);
    throw new MetaError('O WhatsApp recusou a mensagem.');
  }
}

/** Sends one message if the cap lets it; at the cap, the closing notice goes instead. */
async function sendCounted(to: string, body: Record<string, unknown>): Promise<boolean> {
  const room = await reserve();
  if (room === 'over') return false;
  if (room === 'last') {
    await post({ text: { body: capReached() }, to, type: 'text' });
    return false;
  }
  await post({ to, ...body });
  return true;
}

/** The chat's markdown as WhatsApp writes it: `**bold**` is `*bold*` there. */
export const toWhatsapp = (text: string) => text.replace(/\*\*(.+?)\*\*/g, '*$1*');

/** `text` in parts of at most `limit` characters, cut at a paragraph, a line or a space. */
export function splitText(text: string, limit = TEXT_LIMIT): string[] {
  const parts: string[] = [];
  let rest = text.trim();
  while (rest.length > limit) {
    const window = rest.slice(0, limit);
    const cut = Math.max(
      window.lastIndexOf('\n\n'),
      window.lastIndexOf('\n'),
      window.lastIndexOf(' ')
    );
    const at = cut > limit / 2 ? cut : limit;
    parts.push(rest.slice(0, at).trim());
    rest = rest.slice(at).trim();
  }
  if (rest) parts.push(rest);
  return parts;
}

/** A text reply, in as many parts as it needs; each part counts against the cap. */
export async function sendText(to: string, text: string): Promise<void> {
  for (const part of splitText(toWhatsapp(text))) {
    if (!(await sendCounted(to, { text: { body: part }, type: 'text' }))) return;
  }
}

/**
 * A message with up to three reply buttons. Inside the window the User opened it is a service
 * message like any other, not a paid template.
 */
export async function sendButtons(
  to: string,
  text: string,
  buttons: { id: string; title: string }[]
): Promise<void> {
  const body = toWhatsapp(text);
  await sendCounted(to, {
    interactive: {
      action: {
        buttons: buttons.slice(0, 3).map(button => ({
          reply: { id: button.id, title: button.title.slice(0, BUTTON_TITLE_LIMIT) },
          type: 'reply',
        })),
      },
      body: {
        text: body.length > BUTTON_BODY_LIMIT ? `${body.slice(0, BUTTON_BODY_LIMIT - 1)}…` : body,
      },
      type: 'button',
    },
    type: 'interactive',
  });
}
