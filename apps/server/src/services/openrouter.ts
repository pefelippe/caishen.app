/** OpenRouter: one server key, many Models (docs/adr/0009). OpenAI-compatible API. */
const BASE_URL = 'https://openrouter.ai/api/v1';
const MODELS_TTL_MS = 60 * 60 * 1000;

export interface Model {
  free: boolean;
  id: string;
  name: string;
  supportsTools: boolean;
}

export interface ToolDefinition {
  function: { description: string; name: string; parameters: Record<string, unknown> };
  type: 'function';
}

export interface ToolCall {
  function: { arguments: string; name: string };
  id: string;
  type: 'function';
}

export type ChatMessage =
  | { content: string; role: 'system' | 'user' }
  | { content: string | null; role: 'assistant'; tool_calls?: ToolCall[] }
  | { content: string; role: 'tool'; tool_call_id: string };

/** An OpenRouter failure with a message fit to show the User, in pt-BR. */
export class OpenRouterError extends Error {
  constructor(
    message: string,
    /** HTTP status of the failure, when there was one. */
    readonly status?: number
  ) {
    super(message);
  }

  /** True when another Model could still answer: out of credits, rate-limited or a server error. */
  get modelSpecific(): boolean {
    return this.status === 402 || this.status === 429 || (this.status ?? 0) >= 500;
  }
}

export const aiConfigured = () => Boolean(process.env.OPENROUTER_API_KEY);

interface RawModel {
  id: string;
  name: string;
  pricing?: { completion?: string; prompt?: string };
  supported_parameters?: string[];
}

let cache: { at: number; models: Model[] } | null = null;

/** Models OpenRouter offers, free ones first. The list is public; cached for an hour. */
export async function listModels(): Promise<Model[]> {
  if (cache && Date.now() - cache.at < MODELS_TTL_MS) return cache.models;
  try {
    const response = await fetch(`${BASE_URL}/models`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const { data } = (await response.json()) as { data: RawModel[] };
    const models = data
      .map(model => ({
        free: Number(model.pricing?.prompt) === 0 && Number(model.pricing?.completion) === 0,
        id: model.id,
        name: model.name,
        supportsTools: model.supported_parameters?.includes('tools') ?? false,
      }))
      .sort((a, b) => Number(b.free) - Number(a.free) || a.name.localeCompare(b.name));
    cache = { at: Date.now(), models };
    return models;
  } catch (error) {
    console.warn('OpenRouter model list unavailable:', error);
    return cache?.models ?? [];
  }
}

/** OpenRouter's own router across whatever free Models are up at the moment. */
const FREE_ROUTER = 'openrouter/free';

/** `OPENROUTER_DEFAULT_MODEL`, else the free router, else the first free Model with tools. */
export async function defaultModel(): Promise<string> {
  if (process.env.OPENROUTER_DEFAULT_MODEL) return process.env.OPENROUTER_DEFAULT_MODEL;
  const models = await listModels();
  const pick =
    models.find(model => model.id === FREE_ROUTER) ??
    models.find(model => model.free && model.supportsTools) ??
    models[0];
  return pick?.id ?? '';
}

function failure(status: number, detail: string): OpenRouterError {
  if (status === 429) {
    return new OpenRouterError(
      'O Modelo atingiu o limite de uso por agora. Modelos gratuitos têm limite diário; tente mais tarde ou escolha outro Modelo na página Equipe.',
      status
    );
  }
  if (status === 401 || status === 403) {
    return new OpenRouterError(
      'A chave do OpenRouter foi recusada. Confira OPENROUTER_API_KEY.',
      status
    );
  }
  if (status === 402) {
    return new OpenRouterError(
      'Este Modelo é pago e a conta do OpenRouter está sem créditos. Escolha um Modelo gratuito.',
      status
    );
  }
  return new OpenRouterError(`O Modelo não respondeu (${status}). ${detail}`.trim(), status);
}

interface StreamDelta {
  content?: string | null;
  tool_calls?: {
    function?: { arguments?: string; name?: string };
    id?: string;
    index: number;
  }[];
}

/**
 * One streamed completion. Calls `onText` for each piece of text and resolves with the full text
 * plus any tool calls the Model asked for.
 */
export async function streamCompletion(options: {
  messages: ChatMessage[];
  model: string;
  onText: (text: string) => void;
  signal?: AbortSignal;
  tools?: ToolDefinition[];
}): Promise<{ content: string; toolCalls: ToolCall[] }> {
  const response = await fetch(`${BASE_URL}/chat/completions`, {
    body: JSON.stringify({
      messages: options.messages,
      model: options.model,
      stream: true,
      ...(options.tools?.length ? { tools: options.tools } : {}),
    }),
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
      'X-Title': 'zapbots',
    },
    method: 'POST',
    signal: options.signal,
  });
  if (!response.ok || !response.body) {
    const body = await response.text().catch(() => '');
    let detail = '';
    try {
      detail = (JSON.parse(body) as { error?: { message?: string } }).error?.message ?? '';
    } catch {
      // Not JSON; the status alone explains it.
    }
    throw failure(response.status, detail);
  }

  let content = '';
  const calls: ToolCall[] = [];
  const decoder = new TextDecoder();
  let buffer = '';
  for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      // SSE: only `data:` lines carry payload; `: OPENROUTER PROCESSING` comments are keep-alives.
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (!data || data === '[DONE]') continue;
      const event = JSON.parse(data) as {
        choices?: { delta?: StreamDelta }[];
        error?: { code?: number; message?: string };
      };
      if (event.error) throw failure(Number(event.error.code) || 500, event.error.message ?? '');
      const delta = event.choices?.[0]?.delta;
      if (delta?.content) {
        content += delta.content;
        options.onText(delta.content);
      }
      for (const part of delta?.tool_calls ?? []) {
        const call = (calls[part.index] ??= {
          function: { arguments: '', name: '' },
          id: '',
          type: 'function',
        });
        if (part.id) call.id = part.id;
        if (part.function?.name) call.function.name += part.function.name;
        if (part.function?.arguments) call.function.arguments += part.function.arguments;
      }
    }
  }
  return { content, toolCalls: calls.filter(Boolean) };
}
