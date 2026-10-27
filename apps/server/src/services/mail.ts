import { reportError } from '../sentry';

/** Where links in e-mails lead. */
export const clientOrigin = () => process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';

const escape = (text: string) => text.replace(/[&<>"']/g, char => `&#${char.charCodeAt(0)};`);

/**
 * Sends a short e-mail of plain paragraphs, with an optional link, through Resend when
 * RESEND_API_KEY is set; otherwise it is printed on the server console. Never throws: a notice that
 * does not go out is reported, and what caused it still happened.
 */
export async function sendEmail({
  link,
  paragraphs,
  subject,
  to,
}: {
  link?: { label: string; url: string };
  paragraphs: string[];
  subject: string;
  to: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const text = [...paragraphs, ...(link ? [`${link.label}: ${link.url}`] : [])].join('\n\n');
  if (!apiKey) {
    console.log(`✉️  to ${to}: ${subject}\n${text}`);
    return;
  }
  const html = [
    ...paragraphs.map(paragraph => `<p>${escape(paragraph)}</p>`),
    ...(link ? [`<p><a href="${escape(link.url)}">${escape(link.label)}</a></p>`] : []),
  ].join('');
  try {
    const response = await fetch('https://api.resend.com/emails', {
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? 'Caishen <onboarding@resend.dev>',
        html,
        subject,
        text,
        to,
      }),
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      method: 'POST',
    });
    if (!response.ok)
      throw new Error(`Resend answered ${response.status}: ${await response.text()}`);
  } catch (error) {
    reportError(error);
  }
}
