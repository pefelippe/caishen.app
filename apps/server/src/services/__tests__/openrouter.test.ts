import { afterEach, describe, expect, it, vi } from 'vitest';

import { OpenRouterError, streamCompletion } from '../openrouter';

/** A streamed response whose chunks split mid-line, the way the network delivers them. */
function sse(events: unknown[], chunkSize = 37): Response {
  const text = `: OPENROUTER PROCESSING\n\n${events.map(event => `data: ${JSON.stringify(event)}\n\n`).join('')}data: [DONE]\n\n`;
  const bytes = new TextEncoder().encode(text);
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (let at = 0; at < bytes.length; at += chunkSize) {
        controller.enqueue(bytes.slice(at, at + chunkSize));
      }
      controller.close();
    },
  });
  return new Response(body, { status: 200 });
}

const delta = (value: object) => ({ choices: [{ delta: value }] });

afterEach(() => vi.unstubAllGlobals());

describe('streamCompletion', () => {
  it('joins text deltas and reports each piece', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => sse([delta({ content: 'Olá, ' }), delta({ content: 'ação!' })]))
    );
    const pieces: string[] = [];
    const result = await streamCompletion({
      messages: [{ content: 'oi', role: 'user' }],
      model: 'm',
      onText: text => pieces.push(text),
    });
    expect(result).toEqual({ content: 'Olá, ação!', toolCalls: [] });
    expect(pieces).toEqual(['Olá, ', 'ação!']);
  });

  it('assembles a tool call whose arguments arrive in fragments', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        sse([
          delta({
            tool_calls: [{ function: { arguments: '', name: 'criar_tarefa' }, id: 'c1', index: 0 }],
          }),
          delta({ tool_calls: [{ function: { arguments: '{"titulo":' }, index: 0 }] }),
          delta({ tool_calls: [{ function: { arguments: '"Pagar"}' }, index: 0 }] }),
        ])
      )
    );
    const result = await streamCompletion({
      messages: [{ content: 'crie', role: 'user' }],
      model: 'm',
      onText: () => undefined,
    });
    expect(result.toolCalls).toEqual([
      {
        function: { arguments: '{"titulo":"Pagar"}', name: 'criar_tarefa' },
        id: 'c1',
        type: 'function',
      },
    ]);
  });

  it('explains a rate limit in plain words', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{}', { status: 429 }))
    );
    const attempt = streamCompletion({
      messages: [{ content: 'oi', role: 'user' }],
      model: 'm',
      onText: () => undefined,
    });
    await expect(attempt).rejects.toBeInstanceOf(OpenRouterError);
    await expect(attempt).rejects.toThrow(/limite/);
  });
});
