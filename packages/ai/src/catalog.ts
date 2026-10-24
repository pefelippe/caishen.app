import type { Model } from './openrouter';
import type { ProviderKeys, ProviderName } from './providers';

/**
 * The Models called straight at their provider, with a key of that provider. OpenRouter lists its
 * own; these have no public list to read capabilities from, so they are kept here. Ids as each
 * provider's API takes them.
 */
type DirectModel = Omit<Model, 'free' | 'id'> & { modelId: string };

const DIRECT_MODELS: Record<Exclude<ProviderName, 'openrouter'>, DirectModel[]> = {
  anthropic: [
    { modelId: 'claude-opus-5-5', name: 'Claude Opus 5.5', readsImages: true, supportsTools: true },
    {
      modelId: 'claude-sonnet-5-5',
      name: 'Claude Sonnet 5.5',
      readsImages: true,
      supportsTools: true,
    },
    {
      modelId: 'claude-haiku-5-5',
      name: 'Claude Haiku 5.5',
      readsImages: true,
      supportsTools: true,
    },
  ],
  google: [
    { modelId: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', readsImages: true, supportsTools: true },
    {
      modelId: 'gemini-3.8-flash',
      name: 'Gemini 3.8 Flash',
      readsImages: true,
      supportsTools: true,
    },
    {
      modelId: 'gemini-3.5-flash-lite',
      name: 'Gemini 3.5 Flash Lite',
      readsImages: true,
      supportsTools: true,
    },
  ],
  openai: [
    { modelId: 'gpt-6.1-sol', name: 'GPT 6.1 Sol', readsImages: true, supportsTools: true },
    { modelId: 'gpt-6-luna', name: 'GPT 6 Luna', readsImages: true, supportsTools: true },
  ],
};

/** The direct Models of every provider with a key, none of them free. */
export function directModels(keys: ProviderKeys): Model[] {
  return (Object.keys(DIRECT_MODELS) as (keyof typeof DIRECT_MODELS)[])
    .filter(provider => keys[provider])
    .flatMap(provider =>
      DIRECT_MODELS[provider].map(({ modelId, ...model }) => ({
        ...model,
        free: false,
        id: `${provider}:${modelId}`,
      }))
    );
}
