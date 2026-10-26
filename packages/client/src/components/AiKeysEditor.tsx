import { useMutation, useQuery } from '@apollo/client/react';
import {
  AiKeysDocument,
  BotsDocument,
  ConnectionsDocument,
  ModelsDocument,
  RemoveAiKeyDocument,
  SetAiKeyDocument,
  type AiProvider,
  type AiKeysQuery,
} from '@zapbots/graphql/client';
import { useState, type FormEvent } from 'react';

import { Button } from '@zapbots/ui/components/button';
import { Input } from '@zapbots/ui/components/input';
import { Label } from '@zapbots/ui/components/label';
import { cn } from '@zapbots/ui/lib/utils';

import { FormError } from './FormError';

type AiKey = AiKeysQuery['aiKeys'][number];

/** The providers a key can be pasted for, in this order, and where each one is created. */
const PROVIDERS: { href: string; label: string; provider: AiProvider }[] = [
  { href: 'https://openrouter.ai/keys', label: 'OpenRouter', provider: 'OPENROUTER' },
  {
    href: 'https://console.anthropic.com/settings/keys',
    label: 'Anthropic',
    provider: 'ANTHROPIC',
  },
  { href: 'https://aistudio.google.com/apikey', label: 'Google', provider: 'GOOGLE' },
  { href: 'https://platform.openai.com/api-keys', label: 'OpenAI', provider: 'OPENAI' },
];

const refetchQueries = [AiKeysDocument, BotsDocument, ConnectionsDocument, ModelsDocument];

/**
 * The Organization's keys to the Model providers (docs/adr/0022): one line per provider, the saved
 * key shown only by its last four characters.
 */
export function AiKeysEditor() {
  const { data } = useQuery(AiKeysDocument, { fetchPolicy: 'cache-and-network' });
  return (
    <section aria-labelledby="ai-keys-title" className="flex flex-col gap-2">
      <h3 className="font-medium" id="ai-keys-title">
        Chaves
      </h3>
      <ul className="flex flex-col gap-1 rounded-xl bg-muted p-1.5">
        {PROVIDERS.map(entry => (
          <KeyRow
            entry={entry}
            key={entry.provider}
            saved={data?.aiKeys.find(saved => saved.provider === entry.provider)}
          />
        ))}
      </ul>
    </section>
  );
}

/** One provider on one line: its name and what is saved (or where to get a key), then the field. */
function KeyRow({ entry, saved }: { entry: (typeof PROVIDERS)[number]; saved: AiKey | undefined }) {
  const [key, setKey] = useState('');
  const [save, saving] = useMutation(SetAiKeyDocument, { refetchQueries });
  const [remove, removing] = useMutation(RemoveAiKeyDocument, { refetchQueries });
  const id = `ai-key-${entry.provider.toLowerCase()}`;
  const typed = key.trim().length > 0;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = await save({ variables: { key, provider: entry.provider } }).catch(() => null);
    if (result?.data) setKey('');
  };

  return (
    <li
      className={cn(
        'grid gap-x-4 gap-y-2 rounded-lg px-3 py-2.5 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-center',
        saved && 'bg-card'
      )}
    >
      <div className="flex items-baseline justify-between gap-2 sm:flex-col sm:gap-0.5">
        <Label htmlFor={id}>{entry.label}</Label>
        {saved ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground tabular-nums">
            •••• {saved.last4}
          </span>
        ) : (
          <a
            className="text-sm text-primary underline-offset-4 hover:underline"
            href={entry.href}
            rel="noreferrer"
            target="_blank"
          >
            Criar chave
          </a>
        )}
      </div>
      <form className="flex gap-2" onSubmit={event => void submit(event)}>
        <Input
          autoComplete="off"
          className="min-w-0 flex-1 bg-card"
          id={id}
          onChange={event => setKey(event.target.value)}
          placeholder={saved ? 'Cole outra para trocar' : 'Cole a chave'}
          type="password"
          value={key}
        />
        {saved && !typed ? (
          <Button
            disabled={removing.loading}
            onClick={() =>
              void remove({ variables: { provider: entry.provider } }).catch(() => null)
            }
            type="button"
            variant="ghost"
          >
            Remover
          </Button>
        ) : (
          <Button
            disabled={!typed || saving.loading}
            type="submit"
            variant={typed ? 'default' : 'secondary'}
          >
            Salvar
          </Button>
        )}
      </form>
      {(saving.error || removing.error) && (
        <div className="sm:col-start-2">
          <FormError error={saving.error ?? removing.error} />
        </div>
      )}
    </li>
  );
}
