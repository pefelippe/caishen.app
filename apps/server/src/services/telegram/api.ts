import { timingSafeEqual } from 'node:crypto';

import { splitText } from '../whatsapp/meta';

/** Telegram's limit for one message's text. */
const TEXT_LIMIT = 4096;

/** The bot, from @BotFather: its token, its @name and the secret Telegram sends on each update. */
export const telegramConfigured = () =>
  Boolean(
    process.env.TELEGRAM_BOT_TOKEN &&
    process.env.TELEGRAM_BOT_USERNAME &&
    process.env.TELEGRAM_WEBHOOK_SECRET
  );

/** Whether an update carries our secret (`X-Telegram-Bot-Api-Secret-Token`). */
export function verifySecret(header: string | undefined): boolean {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || !header) return false;
  const [a, b] = [Buffer.from(header), Buffer.from(secret)];
  return a.length === b.length && timingSafeEqual(a, b);
}

async function call(method: string, body: Record<string, unknown>): Promise<void> {
  const response = await fetch(
    `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`,
    {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      signal: AbortSignal.timeout(15_000),
    }
  );
  if (!response.ok) {
    throw new Error(`Telegram ${method} failed: ${response.status} ${await response.text()}`);
  }
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** The Caishen's **bold** as Telegram's HTML; everything else as plain text. */
export const toTelegram = (text: string) => escapeHtml(text).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');

/** A text reply, in as many messages as it needs. */
export async function sendText(chatId: string, text: string): Promise<void> {
  // Cut before escaping, a little short, so the HTML never grows past the limit mid-tag.
  for (const part of splitText(text, TEXT_LIMIT - 400)) {
    await call('sendMessage', { chat_id: chatId, parse_mode: 'HTML', text: toTelegram(part) });
  }
}

/** A message with buttons under it; pressing one comes back as a `callback_query`. */
export async function sendButtons(
  chatId: string,
  text: string,
  buttons: { id: string; title: string }[]
): Promise<void> {
  await call('sendMessage', {
    chat_id: chatId,
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [buttons.map(button => ({ callback_data: button.id, text: button.title }))],
    },
    text: toTelegram(text),
  });
}

/** Tells Telegram a button press was seen, so its spinner stops. */
export async function answerCallback(callbackId: string): Promise<void> {
  await call('answerCallbackQuery', { callback_query_id: callbackId });
}
