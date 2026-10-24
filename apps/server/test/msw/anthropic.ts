import { http, HttpResponse, type HttpHandler } from 'msw';

export interface AnthropicRequest {
  messages: { content: string | { text?: string; type: string }[]; role: string }[];
  model: string;
  system?: { text: string; type: 'text' }[] | string;
  tools?: { name: string }[];
}

/**
 * Answers Anthropic's Messages API with `text`, streamed as its server-sent events, and records
 * each request body and its key in `log`.
 */
export function anthropicHandler(text: string): {
  handler: HttpHandler;
  log: { apiKey: string | null; body: AnthropicRequest }[];
} {
  const log: { apiKey: string | null; body: AnthropicRequest }[] = [];
  const handler = http.post('https://api.anthropic.com/v1/messages', async ({ request }) => {
    log.push({
      apiKey: request.headers.get('x-api-key'),
      body: (await request.json()) as AnthropicRequest,
    });
    const events: [string, unknown][] = [
      [
        'message_start',
        {
          message: {
            content: [],
            id: 'msg_1',
            model: 'claude-haiku-5-5',
            role: 'assistant',
            stop_reason: null,
            type: 'message',
            usage: { input_tokens: 10, output_tokens: 1 },
          },
          type: 'message_start',
        },
      ],
      [
        'content_block_start',
        { content_block: { text: '', type: 'text' }, index: 0, type: 'content_block_start' },
      ],
      [
        'content_block_delta',
        { delta: { text, type: 'text_delta' }, index: 0, type: 'content_block_delta' },
      ],
      ['content_block_stop', { index: 0, type: 'content_block_stop' }],
      [
        'message_delta',
        { delta: { stop_reason: 'end_turn' }, type: 'message_delta', usage: { output_tokens: 5 } },
      ],
      ['message_stop', { type: 'message_stop' }],
    ];
    const body = events
      .map(([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
      .join('');
    return new HttpResponse(body, { headers: { 'Content-Type': 'text/event-stream' } });
  });
  return { handler, log };
}
