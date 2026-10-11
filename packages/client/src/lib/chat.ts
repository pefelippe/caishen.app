import type { MessageFieldsFragment } from '@mny/graphql/client';

export type BuddyAction = MessageFieldsFragment['actions'][number];

/** Events of `POST /api/chat/:conversationId`, in the order the server sends them. */
export type ChatEvent =
  | { text: string; type: 'delta' }
  | { action: BuddyAction; type: 'action' }
  | { message: { id: string }; type: 'done' }
  | { message: string; type: 'error' };

/** Sends one Message and reads the Buddy's reply as it is written. */
export async function streamChat(options: {
  content: string;
  conversationId: string;
  onEvent: (event: ChatEvent) => void;
  /** Path of the screen the User is on, so the Buddy knows the context. */
  screen: string;
}): Promise<void> {
  const response = await fetch(`/api/chat/${options.conversationId}`, {
    body: JSON.stringify({ content: options.content, screen: options.screen }),
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });
  if (!response.ok || !response.body) {
    options.onEvent({ message: 'Não foi possível falar com o Buddy.', type: 'error' });
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';
    for (const event of events) {
      if (event.startsWith('data: ')) options.onEvent(JSON.parse(event.slice(6)) as ChatEvent);
    }
  }
}
