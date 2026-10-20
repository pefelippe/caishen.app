import { http, HttpResponse, type HttpHandler } from 'msw';

type Email = { from: string; html: string; subject: string; text: string; to: string };

/** Accepts every email sent through Resend, keeping it for the test to read. */
export function resendHandler(): { emails: Email[]; handler: HttpHandler } {
  const emails: Email[] = [];
  const handler = http.post('https://api.resend.com/emails', async ({ request }) => {
    emails.push((await request.json()) as Email);
    return HttpResponse.json({ id: crypto.randomUUID() });
  });
  return { emails, handler };
}
