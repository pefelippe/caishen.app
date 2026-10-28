import { useMutation, useQuery } from '@apollo/client/react';
import {
  ConnectionsDocument,
  HealthInboxDocument,
  SetHealthInboxDocument,
} from '@zapbots/graphql/client';
import { CheckIcon, CopyIcon } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@zapbots/ui/components/button';
import { Input } from '@zapbots/ui/components/input';

import { FormError } from './FormError';

/** How each phone sends to the address. */
const HOW = [
  {
    name: 'iPhone (Apple Health)',
    steps:
      'Instale o Health Auto Export. Em Automações, crie uma do tipo REST API, cole o endereço, escolha JSON, agrupe por dia e marque Passos, Peso, Gordura corporal, Análise do sono e Treinos. Ela envia sozinha de tempos em tempos.',
  },
  {
    name: 'Android e Samsung Health (Health Connect)',
    steps:
      'No Samsung Health, em Configurações › Health Connect, deixe ele gravar os dados lá. Depois instale o HC Webhook, dê a ele permissão de leitura de passos, sono, peso, gordura corporal e exercícios, e cole o endereço como webhook.',
  },
  {
    name: 'Garmin, Fitbit, Withings, Oura e outros',
    steps:
      'Ligue o app do relógio, da balança ou do anel ao Apple Health (iPhone) ou ao Health Connect (Android); o que ele grava lá chega aqui pelo mesmo caminho.',
  },
];

const when = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(iso)
  );

/**
 * The address the phone sends its health data to (docs/adr/0029): made here and pasted in Health
 * Auto Export (iPhone) or HC Webhook (Android); then when the last send came and what it brought.
 */
export function HealthLinker() {
  const { data } = useQuery(HealthInboxDocument, { fetchPolicy: 'cache-and-network' });
  const [set, setting] = useMutation(SetHealthInboxDocument, {
    refetchQueries: [HealthInboxDocument, ConnectionsDocument],
  });
  const [copied, setCopied] = useState(false);
  const inbox = data?.healthInbox;

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
  const counts = inbox.lastCounts;
  const brought = counts
    ? [
        counts.steps && `${counts.steps} ${counts.steps === 1 ? 'dia' : 'dias'} de passos`,
        counts.weights && `${counts.weights} de peso`,
        counts.bodyFat && `${counts.bodyFat} de gordura`,
        counts.sleeps && `${counts.sleeps} ${counts.sleeps === 1 ? 'noite' : 'noites'}`,
        counts.workouts && `${counts.workouts} ${counts.workouts === 1 ? 'treino' : 'treinos'}`,
      ].filter(Boolean)
    : [];

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
          ? `Último envio em ${when(inbox.lastReceivedAt)}${brought.length ? `: ${brought.join(', ')}.` : ', sem dados que o Caishen guarda.'}`
          : 'Nada chegou ainda.'}
      </p>
      <dl className="flex flex-col gap-3 rounded-xl bg-secondary/60 px-4 py-3 text-sm">
        {HOW.map(item => (
          <div key={item.name}>
            <dt className="font-medium">{item.name}</dt>
            <dd className="text-muted-foreground">{item.steps}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-muted-foreground">
        Quem tiver o endereço pode mandar dados para a sua conta, nunca ler. Se ele vazar, troque.
        Os dados de saúde ficam só com você e não vão a nenhum modelo de IA.
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
