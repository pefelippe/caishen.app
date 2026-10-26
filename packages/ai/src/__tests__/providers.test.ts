import type { ModelMessage } from 'ai';
import { describe, expect, it } from 'vitest';

import { forProvider } from '../agent';
import { directModels } from '../catalog';
import { failure } from '../errors';
import { formatModelRef, parseModelRef } from '../providers';

describe('Model ids', () => {
  it('reads a prefixed id as a direct provider and anything else as OpenRouter', () => {
    expect(parseModelRef('anthropic:claude-haiku-5-5')).toEqual({
      id: 'claude-haiku-5-5',
      provider: 'anthropic',
    });
    // Saved before there were other providers: an OpenRouter id, slash and all.
    expect(parseModelRef('anthropic/claude-sonnet-4.5')).toEqual({
      id: 'anthropic/claude-sonnet-4.5',
      provider: 'openrouter',
    });
    expect(parseModelRef('openrouter/free').provider).toBe('openrouter');
    for (const id of ['google:gemini-3.8-flash', 'openrouter/free']) {
      expect(formatModelRef(parseModelRef(id))).toBe(id);
    }
  });

  it('lists the direct Models only of providers with a key', () => {
    const ids = directModels({ google: 'g' }).map(model => model.id);
    expect(ids).toContain('google:gemini-3.8-flash');
    expect(ids.every(id => id.startsWith('google:'))).toBe(true);
  });
});

describe('the history for each provider', () => {
  const history: ModelMessage[] = [
    { content: 'oi', role: 'user' },
    { content: 'Olá', role: 'assistant' },
    { content: 'Nota do app, não repita: confirmada.', role: 'system' },
    { content: 'e agora?', role: 'user' },
  ];

  it('keeps the app’s notes as system messages on OpenRouter, where they always went', () => {
    expect(forProvider(history, 'openrouter')).toBe(history);
  });

  it('turns them into user turns on the direct providers', () => {
    for (const provider of ['anthropic', 'google', 'openai'] as const) {
      expect(forProvider(history, provider).map(message => message.role)).toEqual([
        'user',
        'assistant',
        'user',
        'user',
      ]);
    }
  });
});

describe('failures in pt-BR', () => {
  it('names the provider whose key was refused', () => {
    expect(failure('openrouter', 401, '').message).toBe(
      'A chave do OpenRouter foi recusada. Confira-a em Integrações.'
    );
    expect(failure('anthropic', 403, '').message).toContain('Anthropic');
    expect(failure('openai', 429, '').modelSpecific).toBe(true);
    expect(failure('google', 404, 'not found').modelSpecific).toBe(false);
  });
});
