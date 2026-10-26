import { useMutation, useQuery } from '@apollo/client/react';
import {
  ConnectionsDocument,
  StartWhatsappLinkDocument,
  UnlinkWhatsappDocument,
  type ConnectionKind,
  type ConnectionsQuery,
  type StartWhatsappLinkMutation,
} from '@zapbots/graphql/client';
import { BrainCircuitIcon, LandmarkIcon, MessageCircleIcon, type LucideIcon } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

import { PageSkeleton } from '@zapbots/ui/blocks/page-skeleton';
import { Button } from '@zapbots/ui/components/button';
import { Card } from '@zapbots/ui/components/card';
import { cn } from '@zapbots/ui/lib/utils';

import { ModelsList } from '../pages/ModelsPage';
import { AiKeysEditor } from './AiKeysEditor';
import { FormError } from './FormError';
import { OpenFinanceLinker } from './OpenFinanceLinker';

type Connection = ConnectionsQuery['connections'][number];

/** The Integrations on the page, in this order: each one a card. */
const CARDS: {
  description: string;
  icon: LucideIcon;
  id: string;
  kind: ConnectionKind;
  name: string;
}[] = [
  {
    description:
      'Cole a chave de um provedor e escolha o Modelo de cada Bot. As chaves são da Organização, ficam criptografadas e só administradores as trocam. Com a do OpenRouter, os Modelos gratuitos dele também aparecem.',
    icon: BrainCircuitIcon,
    id: 'ai',
    kind: 'OPENROUTER',
    name: 'Modelos de IA',
  },
  {
    description:
      'Conte um gasto, confirme Propostas pelos botões e pergunte sobre suas finanças pelo WhatsApp. O Caishen só responde, nunca puxa conversa.',
    icon: MessageCircleIcon,
    id: 'whatsapp',
    kind: 'WHATSAPP',
    name: 'WhatsApp',
  },
  {
    description:
      'Seus bancos pelo Open Finance, com a Pluggy. Só leitura: a autorização é dada no app do banco e pode ser retirada quando quiser. Os gastos entram no Fluxo de caixa.',
    icon: LandmarkIcon,
    id: 'finance',
    kind: 'OPEN_FINANCE',
    name: 'Open Finance',
  },
];

/** The status of an Integration, the same way everywhere: a dot of its colour and a word. */
function Status({ connection }: { connection: Connection | undefined }) {
  const [label, dot] = connection?.connected
    ? ['Conectado', 'bg-success']
    : !connection?.available || connection.unavailableReason
      ? ['Indisponível', 'bg-warning']
      : ['Disponível', 'bg-muted-foreground/50'];
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
      <span aria-hidden className={cn('size-2 rounded-full', dot)} />
      {label}
    </span>
  );
}

/**
 * Integrações: the tools the Caishen works with, one card each across the page: who it is on the
 * left (its mark, name, status and what it does), what to do with it on the right. The Models of
 * the Bots (OpenRouter), WhatsApp and Open Finance through Pluggy.
 */
export function ConnectionsSettings() {
  const { hash } = useLocation();
  const { data, loading } = useQuery(ConnectionsDocument, { fetchPolicy: 'cache-and-network' });
  const ready = Boolean(data);
  // Opened on one card (an old link, the chat): bring it into view once it is there.
  useEffect(() => {
    if (ready && hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash, ready]);

  if (loading && !data) return <PageSkeleton />;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1>Integrações</h1>
        <p className="max-w-prose text-muted-foreground">
          As ferramentas em que o Caishen entra por você. Ele só lê: nada é alterado lá fora.
        </p>
      </header>
      <div className="flex flex-col gap-4">
        {CARDS.map(card => {
          const connection = data?.connections.find(item => item.kind === card.kind);
          const Icon = card.icon;
          return (
            <Card
              aria-labelledby={`${card.id}-title`}
              className="grid min-w-0 scroll-mt-6 gap-6 md:p-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-12"
              id={card.id}
              key={card.id}
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-6" />
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <h2 className="text-lg font-semibold tracking-tight" id={`${card.id}-title`}>
                      {card.name}
                    </h2>
                    <Status connection={connection} />
                  </div>
                </div>
                <p className="max-w-prose text-muted-foreground">{card.description}</p>
              </div>
              <div className="flex min-w-0 flex-col gap-3">
                {card.kind === 'OPENROUTER' ? (
                  <div className="flex flex-col gap-6">
                    <AiKeysEditor />
                    <ModelsList search="" />
                  </div>
                ) : (
                  connection && <Details connection={connection} />
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Details({ connection }: { connection: Connection }): ReactNode {
  return (
    <>
      {connection.kind === 'WHATSAPP' && connection.available && (
        <WhatsappLinker connected={connection.connected} />
      )}
      {connection.kind === 'OPEN_FINANCE' && connection.available && <OpenFinanceLinker />}
      {connection.detail && <p className="text-sm">{connection.detail}</p>}
      {connection.unavailableReason && (
        <p className="rounded-xl bg-secondary/60 px-4 py-3.5 text-muted-foreground">
          {connection.unavailableReason}
        </p>
      )}
    </>
  );
}

type LinkCode = StartWhatsappLinkMutation['startWhatsappLink'];

/**
 * Linking WhatsApp: a one-time code the User sends from their phone, through a `wa.me` link that
 * writes it (docs/adr/0019); once linked, the way out.
 */
function WhatsappLinker({ connected }: { connected: boolean }) {
  const [code, setCode] = useState<LinkCode | null>(null);
  const [start, starting] = useMutation(StartWhatsappLinkDocument);
  const [unlink, unlinking] = useMutation(UnlinkWhatsappDocument, {
    refetchQueries: [ConnectionsDocument],
  });
  // Once the message with the code arrives, the server links the number: look for it now and then.
  useQuery(ConnectionsDocument, { pollInterval: code && !connected ? 4000 : 0, skip: !code });

  if (connected) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Button
          disabled={unlinking.loading}
          onClick={() => void unlink().then(() => setCode(null))}
          size="sm"
          variant="outline"
        >
          Desconectar
        </Button>
        <span className="text-sm text-muted-foreground">
          Ou mande SAIR para o Caishen no WhatsApp.
        </span>
        {unlinking.error && <FormError error={unlinking.error} />}
      </div>
    );
  }

  const expires = code
    ? new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(
        new Date(code.expiresAt)
      )
    : null;
  return (
    <div className="flex flex-col gap-3">
      {code ? (
        <div className="flex flex-col gap-3 rounded-xl bg-secondary/60 p-4">
          <p>
            Mande este código para o Caishen no WhatsApp até as {expires}:{' '}
            <strong className="text-lg tracking-widest tabular-nums">{code.code}</strong>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <a href={code.url} rel="noreferrer" target="_blank">
                Abrir o WhatsApp
              </a>
            </Button>
            <Button
              disabled={starting.loading}
              onClick={() =>
                void start().then(result => setCode(result.data?.startWhatsappLink ?? null))
              }
              size="sm"
              variant="ghost"
            >
              Gerar outro código
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            No computador, abra o link no celular ou digite o código numa conversa com o número do
            Caishen. Esta tela muda sozinha quando ele receber.
          </p>
        </div>
      ) : (
        <Button
          className="self-start"
          disabled={starting.loading}
          onClick={() =>
            void start().then(result => setCode(result.data?.startWhatsappLink ?? null))
          }
          size="sm"
        >
          Conectar
        </Button>
      )}
      {starting.error && <FormError error={starting.error} />}
    </div>
  );
}
