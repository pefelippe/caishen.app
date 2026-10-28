import { http, HttpResponse, type HttpHandler } from 'msw';

/** What the server asked the Bot API to send: the chat, the text and any buttons. */
export interface SentTelegram {
  buttons?: { id: string; title: string }[];
  chatId: string;
  text: string;
}

/** Fakes `sendMessage` and `answerCallbackQuery`, recording every message the server sends. */
export function telegramHandler(): { handler: HttpHandler; sent: SentTelegram[] } {
  const sent: SentTelegram[] = [];
  const handler = http.post(
    'https://api.telegram.org/:bot/:method',
    async ({ params, request }) => {
      if (params.method === 'answerCallbackQuery') {
        return HttpResponse.json({ ok: true, result: true });
      }
      const body = (await request.json()) as {
        chat_id: string;
        reply_markup?: { inline_keyboard: { callback_data: string; text: string }[][] };
        text: string;
      };
      sent.push({
        buttons: body.reply_markup?.inline_keyboard[0]?.map(button => ({
          id: button.callback_data,
          title: button.text,
        })),
        chatId: String(body.chat_id),
        text: body.text,
      });
      return HttpResponse.json({ ok: true, result: { message_id: sent.length } });
    }
  );
  return { handler, sent };
}
