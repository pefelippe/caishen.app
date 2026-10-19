import { APIError } from 'better-auth/api';

const clientOrigin = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';

/** Sign-in links go out by email only with a Resend key. */
export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY);

/**
 * Without a way to send email, a server on this machine hands the link back to the sign-in page,
 * so it works locally with no setup. Never on a public origin: the link signs anyone in.
 */
export const localLinksEnabled = () =>
  !emailConfigured() &&
  ['localhost', '127.0.0.1', '[::1]'].includes(new URL(clientOrigin).hostname);

/** The last link asked for each address, while `localLinksEnabled`. Read once. */
const localLinks = new Map<string, string>();

export function takeLocalLink(email: string): string | null {
  const key = email.trim().toLowerCase();
  const url = localLinks.get(key) ?? null;
  localLinks.delete(key);
  return url;
}

/**
 * Sends the sign-in link. With RESEND_API_KEY it goes out through Resend's REST API; without it
 * the link is printed on the server console and, locally, kept for the sign-in page.
 */
export async function sendMagicLinkEmail(email: string, url: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`✉️  sign-in link for ${email}: ${url}`);
    if (localLinksEnabled()) localLinks.set(email.trim().toLowerCase(), url);
    return;
  }

  const response = await fetch('https://api.resend.com/emails', {
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? 'Caishen <onboarding@resend.dev>',
      html: `<p>Use o link abaixo para entrar no Caishen. Ele vale por 15 minutos e só pode ser usado uma vez.</p><p><a href="${url}">Entrar no Caishen</a></p><p>Se você não pediu este link, ignore este e-mail.</p>`,
      subject: 'Seu link para entrar no Caishen',
      text: `Use o link abaixo para entrar no Caishen. Ele vale por 15 minutos e só pode ser usado uma vez.\n\n${url}\n\nSe você não pediu este link, ignore este e-mail.`,
      to: email,
    }),
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    method: 'POST',
  });
  if (!response.ok) {
    const detail = await response.text();
    console.error(`Resend answered ${response.status}: ${detail}`);
    // Without a verified domain Resend only delivers to its account's own address.
    throw new APIError('BAD_REQUEST', {
      message: detail.includes('only send testing emails')
        ? 'Este servidor ainda só envia o link para o e-mail da conta do Resend. Confira o endereço ou verifique um domínio no Resend.'
        : 'O serviço de e-mail recusou o envio. Tente de novo em instantes.',
    });
  }
}
