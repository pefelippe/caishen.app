import {
  jsonSchema,
  streamText,
  tool,
  type JSONSchema7,
  type ModelMessage,
  type ToolSet,
} from 'ai';

import { ModelError, toModelError } from './errors';
import {
  languageModel,
  PROVIDERS,
  type ModelRef,
  type ProviderKeys,
  type ProviderName,
} from './providers';

/** A tool call as the Model made it, its arguments as JSON text (possibly not valid JSON). */
export interface AgentToolCall {
  arguments: string;
  id: string;
  name: string;
}

/** A tool a Model may call. What `execute` returns is what the Model reads back. */
export interface AgentTool {
  description: string;
  name: string;
  /** JSON Schema of the arguments. */
  parameters: JSONSchema7;
}

export interface RunAgentOptions {
  /** Runs one tool call and returns what the Model reads back. */
  execute?: (call: AgentToolCall) => Promise<string>;
  instructions: string;
  keys: ProviderKeys;
  messages: ModelMessage[];
  model: ModelRef;
  onText: (text: string) => void;
  /** Rounds that may call tools; the round after them goes without, so the Model ends in text. */
  toolRounds: number;
  tools?: AgentTool[];
  appUrl?: string;
  signal?: AbortSignal;
  /**
   * A Model that refuses tools before writing anything (a free router may land on one) gets the
   * round again without them, under the instructions this returns. Without it, the failure stands.
   */
  withoutTools?: () => Promise<string>;
}

const hasPdf = (messages: ModelMessage[]) =>
  messages.some(
    message =>
      message.role === 'user' &&
      Array.isArray(message.content) &&
      message.content.some(part => part.type === 'file' && part.mediaType === 'application/pdf')
  );

function toolSet(tools: AgentTool[]): ToolSet {
  return Object.fromEntries(
    tools.map(entry => [
      entry.name,
      tool({ description: entry.description, inputSchema: jsonSchema(entry.parameters) }),
    ])
  );
}

/**
 * The history as `provider` takes it. The app's notes in the middle of a Conversation go as system
 * messages only to OpenRouter, where they always went; Gemini refuses them after the first turn and
 * the other direct providers are not tested with them, so there they go as user turns.
 */
export function forProvider(messages: ModelMessage[], provider: ProviderName): ModelMessage[] {
  if (provider === 'openrouter') return messages;
  return messages.map(message =>
    message.role === 'system' ? { content: message.content, role: 'user' } : message
  );
}

const argumentsOf = (input: unknown) =>
  typeof input === 'string' ? input : JSON.stringify(input ?? {});

/** One streamed completion: its text and the tool calls it asked for. Throws a ModelError. */
async function round(
  options: RunAgentOptions,
  instructions: string,
  messages: ModelMessage[],
  tools: AgentTool[] | undefined
): Promise<{ calls: AgentToolCall[]; text: string }> {
  const result = streamText({
    abortSignal: options.signal,
    allowSystemInMessages: true,
    instructions,
    // Retrying is ours to decide: the read-only fallback and the Jobs' second Model need the failure.
    maxRetries: 0,
    messages: forProvider(messages, options.model.provider),
    model: languageModel(options.model, {
      appUrl: options.appUrl,
      keys: options.keys,
      parsePdf: hasPdf(messages),
    }),
    ...(tools?.length ? { tools: toolSet(tools) } : {}),
  });
  let text = '';
  const calls: AgentToolCall[] = [];
  for await (const part of result.fullStream) {
    if (part.type === 'text-delta') {
      text += part.text;
      options.onText(part.text);
    } else if (part.type === 'tool-call') {
      calls.push({ arguments: argumentsOf(part.input), id: part.toolCallId, name: part.toolName });
    } else if (part.type === 'error') {
      if (options.signal?.aborted) throw options.signal.reason;
      throw toModelError(options.model.provider, part.error);
    } else if (part.type === 'abort') {
      throw options.signal?.reason ?? new DOMException('Aborted', 'AbortError');
    }
  }
  return { calls, text };
}

const parsed = (text: string): unknown => {
  try {
    return JSON.parse(text || '{}');
  } catch {
    return {};
  }
};

/**
 * Talks with a Model until it answers in text: each round may call tools, whose results go back to
 * it, up to `toolRounds`. Text streams through `onText`; the whole of it comes back at the end.
 */
export async function runAgent(
  options: RunAgentOptions
): Promise<{ text: string; toolCalls: number }> {
  // Without a key the AI SDK would read the provider's own variable from the environment, the
  // server owner's; only the keys handed in may be used (docs/adr/0022).
  const { provider } = options.model;
  if (!options.keys[provider]) {
    throw new ModelError(
      `Sua Organização não tem chave do ${PROVIDERS[provider].label}. Cole-a em Integrações ou escolha outro Modelo.`
    );
  }
  const messages = [...options.messages];
  let instructions = options.instructions;
  let tools = options.tools?.length ? options.tools : undefined;
  let text = '';
  let toolCalls = 0;
  for (let index = 0; ; index++) {
    const offered = tools && index < options.toolRounds ? tools : undefined;
    let completion: Awaited<ReturnType<typeof round>>;
    try {
      completion = await round(options, instructions, messages, offered);
    } catch (error) {
      if (
        options.signal?.aborted ||
        !offered ||
        text ||
        toolCalls ||
        !options.withoutTools ||
        !(error instanceof ModelError)
      ) {
        throw error;
      }
      tools = undefined;
      instructions = await options.withoutTools();
      completion = await round(options, instructions, messages, undefined);
    }
    text += completion.text;
    if (!completion.calls.length || !options.execute) break;
    messages.push({
      content: [
        ...(completion.text ? [{ text: completion.text, type: 'text' as const }] : []),
        ...completion.calls.map(call => ({
          input: parsed(call.arguments),
          toolCallId: call.id,
          toolName: call.name,
          type: 'tool-call' as const,
        })),
      ],
      role: 'assistant',
    });
    for (const call of completion.calls) {
      const result = await options.execute(call);
      toolCalls++;
      messages.push({
        content: [
          {
            output: { type: 'text', value: result },
            toolCallId: call.id,
            toolName: call.name,
            type: 'tool-result',
          },
        ],
        role: 'tool',
      });
    }
  }
  return { text, toolCalls };
}
