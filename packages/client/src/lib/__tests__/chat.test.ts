import { afterEach, describe, expect, it, vi } from 'vitest';

import { streamChat, type ChatEvent } from '../chat';

/** A response whose body arrives in exactly these pieces, like a slow network. */
function streamed(pieces: string[], status = 200): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const piece of pieces) controller.enqueue(encoder.encode(piece));
      controller.close();
    },
  });
  return new Response(body, { status });
}

async function collect(response: Response) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => response)
  );
  const events: ChatEvent[] = [];
  await streamChat({
    content: 'Oi',
    conversationId: 'c1',
    onEvent: event => events.push(event),
    screen: '/caishen',
  });
  return events;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('streamChat', () => {
  it('rebuilds events split across pieces, even in the middle of a character', async () => {
    const delta = 'data: {"text":"Olá, já","type":"delta"}\n\n';
    const done = 'data: {"message":{"id":"m1"},"type":"done"}\n\n';
    const bytes = new TextEncoder().encode(delta);
    // Cut inside the two bytes of "á", and in the middle of the blank line between events.
    const cut = bytes.indexOf(0xc3) + 1;
    const response = new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(bytes.slice(0, cut));
          controller.enqueue(bytes.slice(cut, -1));
          controller.enqueue(new TextEncoder().encode(`\n${done}`));
          controller.close();
        },
      })
    );

    expect(await collect(response)).toEqual([
      { text: 'Olá, já', type: 'delta' },
      { message: { id: 'm1' }, type: 'done' },
    ]);
  });

  it('ignores comment lines and reports a refused request as an error event', async () => {
    expect(
      await collect(streamed([': keep-alive\n\n', 'data: {"text":"Oi","type":"delta"}\n\n']))
    ).toEqual([{ text: 'Oi', type: 'delta' }]);
    expect(await collect(streamed([], 401))).toEqual([
      { message: 'Não foi possível falar com o Bot.', type: 'error' },
    ]);
  });

  it('sends the Message and the screen to the Conversation', async () => {
    const fetch = vi.fn(async () => streamed([]));
    vi.stubGlobal('fetch', fetch);
    await streamChat({
      content: 'Quanto devo?',
      conversationId: 'c42',
      onEvent: () => undefined,
      screen: '/caishen/trabalhos',
    });
    expect(fetch).toHaveBeenCalledWith('/api/chat/c42', {
      body: JSON.stringify({ content: 'Quanto devo?', screen: '/caishen/trabalhos' }),
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
  });
});
