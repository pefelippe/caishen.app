import {
  directModels,
  FREE_ROUTER,
  ModelError,
  openRouterModels,
  parseModelRef,
  runAgent,
  type Model,
  type ProviderKeys,
  type RunAgentOptions,
} from '@zapbots/ai';

import { organizationKeys } from './aiKeys';

/**
 * Where Bots get their Models (docs/adr/0021): `@zapbots/ai`, with the keys each Organization
 * pasted on Integrações (docs/adr/0022). OpenRouter serves most of them; Anthropic, Google and
 * OpenAI are called straight when the Organization has their key. An Organization with no
 * OpenRouter key of its own still gets OpenRouter's free Models through the server's
 * `OPENROUTER_API_KEY`, when it is set; never a paid one.
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

interface Keys {
  keys: ProviderKeys;
  /** OpenRouter answers on the server's key: free Models only. */
  freeOnly: boolean;
}

/** The Organization's keys, with the server's OpenRouter key standing in for a missing one. */
async function keysOf(organizationId: string): Promise<Keys> {
  const keys = await organizationKeys(organizationId);
  const serverKey = process.env.OPENROUTER_API_KEY;
  if (keys.openrouter || !serverKey) return { freeOnly: false, keys };
  return { freeOnly: true, keys: { ...keys, openrouter: serverKey } };
}

const isFree = (id: string, models: Model[]) =>
  id === FREE_ROUTER || id.endsWith(':free') || models.some(model => model.id === id && model.free);

/** True when the Organization can reach at least one provider. */
export async function aiConfigured(organizationId: string): Promise<boolean> {
  return Object.keys((await keysOf(organizationId)).keys).length > 0;
}

/** Every Model the Organization can call: OpenRouter's (free ones first), then the direct ones. */
export async function listModels(organizationId: string): Promise<Model[]> {
  return modelsFor(await keysOf(organizationId));
}

async function modelsFor({ freeOnly, keys }: Keys): Promise<Model[]> {
  const openRouter = keys.openrouter ? await openRouterModels() : [];
  return [
    ...(freeOnly ? openRouter.filter(model => model.free) : openRouter),
    ...directModels(keys),
  ];
}

/**
 * `OPENROUTER_DEFAULT_MODEL` when the Organization can call it, else the free router, else the
 * first free Model with tools, else the first it can call.
 */
export async function defaultModel(organizationId: string): Promise<string> {
  const keys = await keysOf(organizationId);
  const models = await modelsFor(keys);
  const preset = process.env.OPENROUTER_DEFAULT_MODEL;
  if (keys.keys.openrouter && preset && (!keys.freeOnly || isFree(preset, models))) return preset;
  const pick =
    models.find(model => model.id === FREE_ROUTER) ??
    models.find(model => model.free && model.supportsTools) ??
    models[0];
  return pick?.id ?? '';
}

/** False for a Model the Organization has no key to, or a paid one on the server's key. */
async function reaches(keys: Keys, model: string): Promise<boolean> {
  const { provider } = parseModelRef(model);
  if (!keys.keys[provider]) return false;
  return !(keys.freeOnly && provider === 'openrouter') || isFree(model, await openRouterModels());
}

/**
 * The Model a Bot answers with: the one saved for it while the Organization can call it, else the
 * default (a key removed on Integrações leaves no Bot mute).
 */
export async function botModel(organizationId: string, saved: string | null): Promise<string> {
  if (saved && (await reaches(await keysOf(organizationId), saved))) return saved;
  return defaultModel(organizationId);
}

/** `runAgent` on a Model saved as in the `bot` table, with the Organization's keys. */
export async function talk(
  organizationId: string,
  model: string,
  options: Omit<RunAgentOptions, 'appUrl' | 'keys' | 'model'>
): ReturnType<typeof runAgent> {
  const keys = await keysOf(organizationId);
  if (
    keys.freeOnly &&
    parseModelRef(model).provider === 'openrouter' &&
    !(await reaches(keys, model))
  ) {
    throw new ModelError(
      'Este Modelo é pago. Cole a chave do OpenRouter em Integrações ou escolha um Modelo gratuito.',
      402
    );
  }
  return runAgent({
    ...options,
    appUrl: process.env.CLIENT_ORIGIN,
    keys: keys.keys,
    model: parseModelRef(model),
  });
}
