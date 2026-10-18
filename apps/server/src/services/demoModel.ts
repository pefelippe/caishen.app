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

/** The `## ` sections of the system prompt, by heading, each with its lines. */
function sectionsOf(messages: ChatMessage[]): Map<string, string[]> {
  const system = messages.find(message => message.role === 'system')?.content ?? '';
  const sections = new Map<string, string[]>();
  let current: string[] | null = null;
  for (const line of system.split('\n')) {
    if (line.startsWith('## ')) sections.set(line.slice(3), (current = []));
    else if (current && line.trim()) current.push(line);
  }
  return sections;
}

const DATA_LINES = 12;

/** The Bot's Alerts first, what is urgent; then the start of its data. */
function answer(messages: ChatMessage[]): string {
  const sections = sectionsOf(messages);
  const alerts = (sections.get('Avisos') ?? []).filter(line => line.startsWith('- '));
  const [heading, lines] = [...sections].find(([name]) => name !== 'Avisos') ?? [];
  return [
    'Este é o Modelo de demonstração: não há IA respondendo, só um resumo dos seus dados.',
    ...(alerts.length ? ['', 'O que merece atenção agora:', ...alerts] : []),
    '',
    ...(heading && lines?.length
      ? [`${heading}:`, ...lines.slice(0, DATA_LINES)]
      : ['Ainda não há dados.']),
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
