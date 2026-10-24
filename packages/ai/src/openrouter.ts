/** OpenRouter's public Model list (docs/adr/0009). */
const BASE_URL = 'https://openrouter.ai/api/v1';
const MODELS_TTL_MS = 60 * 60 * 1000;

export interface Model {
  free: boolean;
  /** As the `bot` table keeps it: an OpenRouter id, or `provider:id` for the others. */
  id: string;
  name: string;
  /** Takes images as input (`architecture.input_modalities`). */
  readsImages: boolean;
  supportsTools: boolean;
}

interface RawModel {
  architecture?: { input_modalities?: string[] };
  id: string;
  name: string;
  pricing?: { completion?: string; prompt?: string };
  supported_parameters?: string[];
}

let cache: { at: number; models: Model[] } | null = null;

/** Models OpenRouter offers, free ones first. The list is public; cached for an hour. */
export async function openRouterModels(): Promise<Model[]> {
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
        readsImages: model.architecture?.input_modalities?.includes('image') ?? false,
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
export const FREE_ROUTER = 'openrouter/free';
