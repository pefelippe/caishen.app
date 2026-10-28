import { useMutation, useQuery } from '@apollo/client/react';
import {
  AutomationInboxDocument,
  ConnectionsDocument,
  SetAutomationInboxDocument,
} from '@zapbots/graphql/client';
import { CheckIcon, CopyIcon } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@zapbots/ui/components/button';
import { Input } from '@zapbots/ui/components/input';

import { FormError } from './FormError';

/** How each tool sends to the address: a POST with a JSON body. */
const HOW = [
  {
    name: 'Zapier',
    steps:
      'Na ação, escolha Webhooks by Zapier › POST, cole o endereço, Payload Type json e preencha valor, descricao e, se quiser, data, categoria e id.',
  },
  {
    name: 'Make',
    steps:
      'Adicione o módulo HTTP › Make a request, método POST, cole o endereço, Body type Raw, Content type JSON, e monte o corpo com os campos abaixo.',
  },
  {
    name: 'n8n',
    steps:
      'Use o nó HTTP Request, método POST, cole o endereço, Send Body em JSON, com os campos abaixo.',
  },
];

const EXAMPLE = `{
  "valor": "45,90",
  "descricao": "Mercado",
  "data": "2026-10-28",
  "categoria": "Alimentação",
  "id": "pedido-123"
}`;

const when = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(iso)
  );

/**
 * The address Zapier, Make or n8n send Gastos to (docs/adr/0033): made here, pasted in the tool,
 * then when the last send came and how many Gastos it added.
 */
export function AutomationLinker() {
  const { data } = useQuery(AutomationInboxDocument, { fetchPolicy: 'cache-and-network' });
  const [set, setting] = useMutation(SetAutomationInboxDocument, {
    refetchQueries: [AutomationInboxDocument, ConnectionsDocument],
  });
  const [copied, setCopied] = useState(false);
  const inbox = data?.automationInbox;

  if (!inbox) {
    return (
      <div className="flex flex-col gap-3">
        <Button
          className="self-start"
          disabled={setting.loading || !data}
          onClick={() => void set({ variables: { on: true } }).catch(() => null)}
          size="sm"
        >
          Criar endereço de envio
        </Button>
        {setting.error && <FormError error={setting.error} />}
      </div>
    );
  }

  const url = `${window.location.origin}${inbox.path}`;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Input
          aria-label="Endereço de envio"
          onFocus={event => event.target.select()}
          readOnly
          value={url}
        />
        <Button
          onClick={() =>
            void navigator.clipboard
              .writeText(url)
              .then(() => setCopied(true))
              .catch(() => null)
          }
          size="sm"
          variant="outline"
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? 'Copiado' : 'Copiar'}
        </Button>
      </div>
      <p className="text-sm">
        {inbox.lastReceivedAt
          ? `Último envio em ${when(inbox.lastReceivedAt)}: ${inbox.lastAdded === 1 ? '1 gasto novo' : `${inbox.lastAdded ?? 0} gastos novos`}.`
          : 'Nada chegou ainda.'}
      </p>
      <dl className="flex flex-col gap-3 rounded-xl bg-secondary/60 px-4 py-3 text-sm">
        {HOW.map(item => (
          <div key={item.name}>
            <dt className="font-medium">{item.name}</dt>
            <dd className="text-muted-foreground">{item.steps}</dd>
          </div>
        ))}
        <div>
          <dt className="font-medium">O corpo</dt>
          <dd className="text-muted-foreground">
            Um gasto, uma lista deles ou {'{ "gastos": [...] }'}, até 100 por vez. Sem data, vale
            hoje; com o mesmo id, ou a mesma linha sem id, ele entra uma vez só.
            <pre className="mt-2 overflow-x-auto rounded-lg bg-background p-3 text-xs">
              {EXAMPLE}
            </pre>
          </dd>
        </div>
      </dl>
      <p className="text-sm text-muted-foreground">
        Quem tiver o endereço pode lançar gastos na sua conta, nunca ler nada. Se ele vazar, troque.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={setting.loading}
          onClick={() => {
            setCopied(false);
            void set({ variables: { on: true } }).catch(() => null);
          }}
          size="sm"
          variant="ghost"
        >
          Trocar endereço
        </Button>
        <Button
          disabled={setting.loading}
          onClick={() => void set({ variables: { on: false } }).catch(() => null)}
          size="sm"
          variant="ghost"
        >
          Desligar
        </Button>
      </div>
      {setting.error && <FormError error={setting.error} />}
    </div>
  );
}
