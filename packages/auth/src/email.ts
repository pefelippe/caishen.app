import { APIError } from 'better-auth/api';

const clientOrigin = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';

/** Password reset links go out by email only with a Resend key. */
export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY);

/**
 * Without a way to send email, a server on this machine hands the reset link back to the page that
 * asked for it, so it works locally with no setup. Never on a public origin: the link lets anyone
 * set the account's password.
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
 * Sends the link to choose a new password. With RESEND_API_KEY it goes out through Resend's REST
 * API; without it the link is printed on the server console and, locally, kept for the page.
 */
export async function sendResetPasswordEmail(email: string, url: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`✉️  password reset link for ${email}: ${url}`);
    if (localLinksEnabled()) localLinks.set(email.trim().toLowerCase(), url);
    return;
  }

  const intro =
    'Recebemos um pedido para trocar a senha da sua conta no Caishen. O link abaixo vale por 1 hora e só pode ser usado uma vez.';
  const outro = 'Se você não pediu a troca, ignore este e-mail: sua senha continua a mesma.';
  const response = await fetch('https://api.resend.com/emails', {
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? 'Caishen <onboarding@resend.dev>',
      html: `<p>${intro}</p><p><a href="${url}">Escolher uma nova senha</a></p><p>${outro}</p>`,
      subject: 'Troque sua senha do Caishen',
      text: `${intro}\n\n${url}\n\n${outro}`,
      to: email,
    }),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });
  if (!response.ok) {
    const detail = await response.text();
    console.error(`Resend answered ${response.status}: ${detail}`);
    // Without a verified domain Resend only delivers to its account's own address.
    const testingOnly = detail.includes('only send testing emails');
    // The page shows its own words for each `code` (LoginPage's AUTH_ERRORS).
    throw new APIError('BAD_REQUEST', {
      code: testingOnly ? 'EMAIL_TESTING_ONLY' : 'EMAIL_REFUSED',
      message: testingOnly
        ? 'Este servidor ainda só envia e-mails para o endereço da conta do Resend. Confira o endereço ou verifique um domínio no Resend.'
        : 'O serviço de e-mail recusou o envio. Tente de novo em instantes.',
    });
  }
}
