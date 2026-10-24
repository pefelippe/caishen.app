import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import type { LanguageModel } from 'ai';

export type ProviderName = 'anthropic' | 'google' | 'openai' | 'openrouter';

/** Each provider a Model can come from, and the server variable that holds its key. */
export const PROVIDERS: Record<ProviderName, { envKey: string; label: string }> = {
  anthropic: { envKey: 'ANTHROPIC_API_KEY', label: 'Anthropic' },
  google: { envKey: 'GEMINI_API_KEY', label: 'Google' },
  openai: { envKey: 'OPENAI_API_KEY', label: 'OpenAI' },
  openrouter: { envKey: 'OPENROUTER_API_KEY', label: 'OpenRouter' },
};

export type ProviderKeys = Partial<Record<ProviderName, string>>;

/** The keys set on the server, one per provider. */
export function keysFromEnv(env: Record<string, string | undefined> = process.env): ProviderKeys {
  return Object.fromEntries(
    (Object.keys(PROVIDERS) as ProviderName[])
      .map(provider => [provider, env[PROVIDERS[provider].envKey]] as const)
      .filter(([, key]) => Boolean(key))
  );
}

/** A Model as the `bot` table keeps it. */
export interface ModelRef {
  id: string;
  provider: ProviderName;
}

const DIRECT = /^(anthropic|google|openai):(.+)$/;

/**
 * Reads a saved Model id. `anthropic:…`, `google:…` and `openai:…` go straight to that provider;
 * anything else is an OpenRouter id such as `anthropic/claude-sonnet-4.5`, as every id saved before
 * there were other providers.
 */
export function parseModelRef(value: string): ModelRef {
  const direct = value.match(DIRECT);
  return direct
    ? { id: direct[2]!, provider: direct[1] as ProviderName }
    : { id: value, provider: 'openrouter' };
}

export function formatModelRef(ref: ModelRef): string {
  return ref.provider === 'openrouter' ? ref.id : `${ref.provider}:${ref.id}`;
}

export interface LanguageModelOptions {
  /** The site the requests come from, for OpenRouter's rankings. */
  appUrl?: string;
  keys: ProviderKeys;
  /** The prompt carries a PDF: on OpenRouter it goes through its free parser (docs/adr/0017). */
  parsePdf?: boolean;
}

/** The AI SDK Model for `ref`, with the key of its provider. */
export function languageModel(ref: ModelRef, options: LanguageModelOptions): LanguageModel {
  const apiKey = options.keys[ref.provider];
  switch (ref.provider) {
    case 'anthropic':
      return createAnthropic({ apiKey })(ref.id);
    case 'google':
      return createGoogleGenerativeAI({ apiKey })(ref.id);
    case 'openai':
      return createOpenAI({ apiKey })(ref.id);
    case 'openrouter':
      return createOpenRouter({
        apiKey,
        headers: {
          'HTTP-Referer': options.appUrl ?? 'http://localhost:5173',
          'X-Title': 'zapbots',
        },
      })(ref.id, {
        ...(options.parsePdf
          ? { plugins: [{ id: 'file-parser', pdf: { engine: 'cloudflare-ai' } }] }
          : {}),
      });
  }
}
