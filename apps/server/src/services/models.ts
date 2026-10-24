/** Where Bots get their Models: OpenRouter serves every one (docs/adr/0009). */
export {
  aiConfigured,
  defaultModel,
  listModels,
  OpenRouterError as ModelError,
  streamCompletion,
} from './openrouter';
export type { ChatMessage, ContentPart, Model, ToolCall, ToolDefinition } from './openrouter';
