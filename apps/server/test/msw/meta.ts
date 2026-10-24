import { http, HttpResponse, type HttpHandler } from 'msw';

/** What the server asked the Cloud API to send: the recipient and the text or the buttons. */
export interface SentMessage {
  buttons?: { id: string; title: string }[];
  text: string;
  to: string;
}

/** Fakes `POST /{phone-number-id}/messages`, recording every message the server sends. */
export function metaHandler(): { handler: HttpHandler; sent: SentMessage[] } {
  const sent: SentMessage[] = [];
  const handler = http.post(
    'https://graph.facebook.com/:version/:phoneNumberId/messages',
    async ({ request }) => {
      const body = (await request.json()) as {
        interactive?: {
          action: { buttons: { reply: { id: string; title: string } }[] };
          body: { text: string };
        };
        text?: { body: string };
        to: string;
      };
      sent.push({
        buttons: body.interactive?.action.buttons.map(button => button.reply),
        text: body.text?.body ?? body.interactive?.body.text ?? '',
        to: body.to,
      });
      return HttpResponse.json({ messages: [{ id: `wamid.out-${sent.length}` }] });
    }
  );
  return { handler, sent };
}
