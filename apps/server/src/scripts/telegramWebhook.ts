/**
 * Points the Caishen's Telegram bot at this server (docs/adr/0031):
 * `pnpm telegram:webhook https://caishen.app`. Run once per address; Telegram keeps it.
 */
const origin = process.argv[2]?.replace(/\/$/, '');
const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

if (!origin || !/^https:\/\//.test(origin)) {
  console.error('Usage: pnpm telegram:webhook https://<the app’s public address>');
  process.exit(1);
}
if (!token || !secret) {
  console.error('Set TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET in .env first.');
  process.exit(1);
}

const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  body: JSON.stringify({
    allowed_updates: ['message', 'callback_query'],
    secret_token: secret,
    url: `${origin}/api/telegram/webhook`,
  }),
  headers: { 'Content-Type': 'application/json' },
  method: 'POST',
});
console.log(response.status, await response.text());
