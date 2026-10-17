import type { ChatMessage, Model, ToolCall } from './openrouter';

/**
 * A stand-in Model for demo mode: no AI, no network. It answers, and delivers Jobs, with a summary
 * of the data in the system prompt, so chat and Jobs can be seen working without an OpenRouter key.
 */
export const DEMO_MODEL: Model = {
  free: true,
  id: 'demo/local',
  name: 'Demonstração (respostas prontas, sem IA)',
  supportsTools: true,
};

const WORD_DELAY_MS = 12;

/** The data lines of the system prompt, i.e. everything from the first `## ` heading on. */
function dataOf(messages: ChatMessage[]): string {
  const system = messages.find(message => message.role === 'system')?.content ?? '';
  const start = system.indexOf('## ');
  return start < 0 ? '' : system.slice(start);
}

function answer(messages: ChatMessage[]): string {
  const data = dataOf(messages).split('\n').slice(0, 14).join('\n');
  return [
    'Este é o Modelo de demonstração: não há IA respondendo, só um resumo dos seus dados.',
    '',
    data || 'Ainda não há dados.',
  ].join('\n');
}

export async function streamDemoCompletion(options: {
  messages: ChatMessage[];
  onText: (text: string) => void;
  signal?: AbortSignal;
}): Promise<{ content: string; toolCalls: ToolCall[] }> {
  const content = answer(options.messages);
  for (const piece of content.match(/\S+\s*/g) ?? []) {
    if (options.signal?.aborted) break;
    options.onText(piece);
    await new Promise(resolve => setTimeout(resolve, WORD_DELAY_MS));
  }
  return { content, toolCalls: [] };
}
