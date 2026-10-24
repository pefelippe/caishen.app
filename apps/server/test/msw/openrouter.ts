import { http, HttpResponse, type HttpHandler } from 'msw';
import { setupServer } from 'msw/node';

const BASE_URL = 'https://openrouter.ai/api/v1';

/** One MSW server for every external API the tests fake; handlers are added per test. */
export const mswServer = setupServer();

export const MODEL_WITH_TOOLS = 'test/with-tools';
export const MODEL_WITHOUT_TOOLS = 'test/plain';

/** The public Model list: one Model that calls tools and reads images, one that does neither. */
export const modelListHandler = http.get(`${BASE_URL}/models`, () =>
  HttpResponse.json({
    data: [
      {
        architecture: { input_modalities: ['text', 'image'] },
        id: MODEL_WITH_TOOLS,
        name: 'With tools',
        pricing: { completion: '0', prompt: '0' },
        supported_parameters: ['tools'],
      },
      {
        architecture: { input_modalities: ['text'] },
        id: MODEL_WITHOUT_TOOLS,
        name: 'Plain',
        pricing: { completion: '0.01', prompt: '0.01' },
        supported_parameters: [],
      },
    ],
  })
);

export interface CompletionRequest {
  messages: { content: string | null | Record<string, unknown>[]; role: string }[];
  model: string;
  plugins?: { id: string }[];
  tools?: { function: { name: string } }[];
}

/**
 * The text of a request message, whether its content came as a string or as text parts (the AI
 * SDK sends system messages as parts).
 */
export function textOf(message: CompletionRequest['messages'][number] | undefined): string {
  const content = message?.content;
  if (typeof content === 'string') return content;
  return (content ?? []).map(part => (typeof part.text === 'string' ? part.text : '')).join('');
}

/** What a faked completion answers: text, text arriving slowly, a tool call, or an HTTP failure. */
export type Completion =
  | { text: string }
  | { delayMs: number; pieces: string[] }
  | { arguments: Record<string, unknown>; tool: string }
  | { status: number };

/** Text sent one piece at a time, `delayMs` apart, like a Model writing a long answer. */
function slowStream(pieces: string[], delayMs: number): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const [index, content] of pieces.entries()) {
        if (index > 0) await new Promise(resolve => setTimeout(resolve, delayMs));
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`)
        );
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });
  return new HttpResponse(body, { headers: { 'Content-Type': 'text/event-stream' } });
}

function stream(completion: Extract<Completion, { text: string } | { tool: string }>): Response {
  const deltas =
    'text' in completion
      ? // Split so the text arrives in more than one event, as it does for real.
        [{ content: completion.text.slice(0, 4) }, { content: completion.text.slice(4) }]
      : [
          {
            tool_calls: [
              {
                function: { arguments: '', name: completion.tool },
                id: 'call-1',
                index: 0,
                type: 'function',
              },
            ],
          },
          {
            tool_calls: [
              { function: { arguments: JSON.stringify(completion.arguments) }, index: 0 },
            ],
          },
        ];
  const body = [
    ': OPENROUTER PROCESSING\n\n',
    ...deltas.map(delta => `data: ${JSON.stringify({ choices: [{ delta }] })}\n\n`),
    'data: [DONE]\n\n',
  ].join('');
  return new HttpResponse(body, { headers: { 'Content-Type': 'text/event-stream' } });
}

/**
 * Answers chat completions with `completions`, in order, and records every request body in `log`.
 * A request beyond the scripted ones fails the test with a 500.
 */
export function completionHandler(completions: Completion[]): {
  handler: HttpHandler;
  log: CompletionRequest[];
} {
  const log: CompletionRequest[] = [];
  const handler = http.post(`${BASE_URL}/chat/completions`, async ({ request }) => {
    log.push((await request.json()) as CompletionRequest);
    const completion = completions[log.length - 1];
    if (!completion)
      return HttpResponse.json({ error: { message: 'unscripted' } }, { status: 500 });
    if ('status' in completion) return HttpResponse.json({}, { status: completion.status });
    if ('pieces' in completion) return slowStream(completion.pieces, completion.delayMs);
    return stream(completion);
  });
  return { handler, log };
}
