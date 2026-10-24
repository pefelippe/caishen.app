import {
  directModels,
  FREE_ROUTER,
  keysFromEnv,
  openRouterModels,
  parseModelRef,
  runAgent,
  type Model,
  type RunAgentOptions,
} from '@zapbots/ai';

/**
 * Where Bots get their Models (docs/adr/0021): `@zapbots/ai`, with the server's keys. OpenRouter
 * serves most of them; Anthropic, Google and OpenAI are called straight when their key is set.
 */
export { ModelError } from '@zapbots/ai';
export type {
  AgentTool,
  AgentToolCall,
  FilePart,
  JsonSchema,
  Model,
  ModelMessage,
  TextPart,
  UserContent,
} from '@zapbots/ai';

/** True when the server has a key for at least one provider. */
export const aiConfigured = () => Object.keys(keysFromEnv()).length > 0;

/** Every Model the server can call: OpenRouter's (free ones first), then the direct ones. */
export async function listModels(): Promise<Model[]> {
  const keys = keysFromEnv();
  return [...(keys.openrouter ? await openRouterModels() : []), ...directModels(keys)];
}

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

/** `runAgent` on a Model saved as in the `bot` table, with the server's keys. */
export function talk(
  model: string,
  options: Omit<RunAgentOptions, 'appUrl' | 'keys' | 'model'>
): ReturnType<typeof runAgent> {
  return runAgent({
    ...options,
    appUrl: process.env.CLIENT_ORIGIN,
    keys: keysFromEnv(),
    model: parseModelRef(model),
  });
}
