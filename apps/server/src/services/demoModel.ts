import type { ChatMessage, Model, ToolCall, ToolDefinition } from './openrouter';

/**
 * A stand-in Model for demo mode: no AI, no network. It answers from the data in the system
 * prompt and calls a tool when asked plainly to create something, so every part of the chat can
 * be seen working without an OpenRouter key.
 */
export const DEMO_MODEL: Model = {
  free: true,
  id: 'demo/local',
  name: 'Demonstração (respostas prontas, sem IA)',
  supportsTools: true,
};

const WORD_DELAY_MS = 12;

/** What a plainly worded request maps to: `[pattern, tool, arguments from the match]`. */
const REQUESTS: [RegExp, string, (match: RegExpMatchArray) => Record<string, unknown>][] = [
  [
    /\bcri(?:e|ar)\s+(?:uma\s+)?tarefa\s+(?:para\s+)?(.+)/i,
    'criar_tarefa',
    m => ({ titulo: tidy(m[1]!) }),
  ],
  [
    /\bregistr(?:e|ar)\s+(?:um\s+|uma\s+)?(?:treino\s+de\s+)?(.+?)\s+de\s+(\d+)\s*min/i,
    'registrar_treino',
    m => ({ minutos: Number(m[2]), tipo: tidy(m[1]!) }),
  ],
  [
    /\bcri(?:e|ar)\s+(?:uma\s+)?anota[cç][aã]o\s+(?:com\s+|sobre\s+)?(.+)/i,
    'criar_anotacao',
    m => ({ texto: tidy(m[1]!), titulo: tidy(m[1]!).slice(0, 60) }),
  ],
];

function tidy(text: string): string {
  const trimmed = text.trim().replace(/[.!?]+$/, '');
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

/** The data lines of the system prompt, i.e. everything from the first `## ` heading on. */
function dataOf(messages: ChatMessage[]): string {
  const system = messages.find(message => message.role === 'system')?.content ?? '';
  const start = system.indexOf('## ');
  return start < 0 ? '' : system.slice(start);
}

function answer(messages: ChatMessage[]): string {
  const last = messages.at(-1);
  if (last?.role === 'tool') return 'Pronto, está feito.';
  const data = dataOf(messages).split('\n').slice(0, 14).join('\n');
  return [
    'Este é o Modelo de demonstração: não há IA respondendo, só um resumo dos seus dados.',
    '',
    data || 'Ainda não há dados nesta Área.',
  ].join('\n');
}

export async function streamDemoCompletion(options: {
  messages: ChatMessage[];
  onText: (text: string) => void;
  signal?: AbortSignal;
  tools?: ToolDefinition[];
}): Promise<{ content: string; toolCalls: ToolCall[] }> {
  const last = options.messages.at(-1);
  if (last?.role === 'user') {
    for (const [pattern, name, args] of REQUESTS) {
      const match = last.content.match(pattern);
      if (match && options.tools?.some(tool => tool.function.name === name)) {
        return {
          content: '',
          toolCalls: [
            {
              function: { arguments: JSON.stringify(args(match)), name },
              id: `demo-${Date.now()}`,
              type: 'function',
            },
          ],
        };
      }
    }
  }

  const content = answer(options.messages);
  for (const piece of content.match(/\S+\s*/g) ?? []) {
    if (options.signal?.aborted) break;
    options.onText(piece);
    await new Promise(resolve => setTimeout(resolve, WORD_DELAY_MS));
  }
  return { content, toolCalls: [] };
}
