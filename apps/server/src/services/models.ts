import { demoEnabled } from '@mny/auth';

import { DEMO_MODEL, streamDemoCompletion } from './demoModel';
import * as openrouter from './openrouter';

export { OpenRouterError as ModelError } from './openrouter';
export type { ChatMessage, Model, ToolCall, ToolDefinition } from './openrouter';

/**
 * Where Buddies get their Models. OpenRouter serves the real ones; in demo mode a local stand-in
 * is added, and it becomes the default while there is no OpenRouter key.
 */
export const aiConfigured = () => openrouter.aiConfigured() || demoEnabled;

export async function listModels() {
  const models = await openrouter.listModels();
  return demoEnabled ? [DEMO_MODEL, ...models] : models;
}

export async function defaultModel(): Promise<string> {
  if (demoEnabled && !openrouter.aiConfigured()) return DEMO_MODEL.id;
  return openrouter.defaultModel();
}

export async function supportsTools(modelId: string): Promise<boolean> {
  return (await listModels()).find(model => model.id === modelId)?.supportsTools ?? false;
}

export function streamCompletion(options: Parameters<typeof openrouter.streamCompletion>[0]) {
  return demoEnabled && options.model === DEMO_MODEL.id
    ? streamDemoCompletion(options)
    : openrouter.streamCompletion(options);
}
