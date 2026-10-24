import { useMutation, useQuery } from '@apollo/client/react';
import {
  ConnectionsDocument,
  StartWhatsappLinkDocument,
  UnlinkWhatsappDocument,
  type ConnectionKind,
  type ConnectionsQuery,
  type StartWhatsappLinkMutation,
} from '@zapbots/graphql/client';
import { SearchIcon } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { connectDrive, pickerConfigured } from '../lib/drive';
import { INTEGRATION_GROUPS } from '../lib/integrations';
import { matches } from '../lib/search';
import { ModelsList } from '../pages/ModelsPage';
import { FormError } from './FormError';
import { PageSkeleton } from './PageSkeleton';
import { SheetRow } from './Sheet';

type Connection = ConnectionsQuery['connections'][number];

const COPY: Record<ConnectionKind, { description: string; name: string }> = {
  GOOGLE_DRIVE: {
    description:
      'O Caishen só enxerga os arquivos que você escolher no seletor do Google e lê o texto dos que você entregar: Google Docs, PDFs com texto e arquivos de texto.',
    name: 'Google Drive',
  },
  OPENROUTER: {
    description:
      'Dá acesso a Modelos de vários fornecedores, inclusive gratuitos. A chave fica no servidor e vale para todas as contas.',
    name: 'OpenRouter',
  },
  WHATSAPP: {
    description:
      'Converse com o Caishen pelo WhatsApp: conte um gasto, confirme as Propostas pelos botões e pergunte sobre as suas finanças. Ele só responde, nunca manda mensagem sozinho.',
    name: 'WhatsApp',
  },
};

/** The status of an Integration, the same way everywhere. */
function Status({ connection }: { connection: Connection }) {
  if (connection.connected) return <Badge className="bg-success text-white">conectado</Badge>;
  if (connection.unavailableReason) return <Badge variant="outline">indisponível</Badge>;
  return <Badge variant="secondary">disponível</Badge>;
}

/** Which Integrations to show: all of them, those that work today, or those still to come. */
type StatusFilter = 'ALL' | 'LIVE' | 'UPCOMING';

/**
 * Integrações: the tools the Caishen enters for you. A bar to search and to narrow by status, then one list per kind (each also in the menu, under Integrações), with what works first
 * and in full, and what is still to come in one line each.
 */
export function ConnectionsSettings() {
  const { hash } = useLocation();
  const { data, loading } = useQuery(ConnectionsDocument, { fetchPolicy: 'cache-and-network' });
  const [error, setError] = useState<string | null>(null);
  const [term, setTerm] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ALL');
  const ready = Boolean(data);
  // Opened on one part (an old link, the chat): bring it into view once it is there.
  useEffect(() => {
    if (ready && hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash, ready]);

  const search = term.trim().toLocaleLowerCase('pt-BR');
  const shown = INTEGRATION_GROUPS.map(group => {
    const groupMatches = matches(search, group.title, group.description);
    const live =
      status === 'UPCOMING'
        ? []
        : group.kinds
            .map(kind => data?.connections.find(item => item.kind === kind))
            .filter((item): item is Connection => Boolean(item?.available))
            .filter(
              item =>
                groupMatches || matches(search, COPY[item.kind].name, COPY[item.kind].description)
            );
    const upcoming =
      status === 'LIVE'
        ? []
        : group.upcoming.filter(
            item =>
              // An Integration still to be switched on here waits as "em breve".
              !data?.connections.some(live => live.kind === item.kind && live.available) &&
              (groupMatches || matches(search, item.name, item.description))
          );
    // The Models are found by Bot or Model name too, so they show unless only "em breve" is asked.
    const models = group.id === 'ai' && status !== 'UPCOMING';
    return { group, live, models, search: groupMatches ? '' : search, upcoming };
  }).filter(({ live, models, upcoming }) => live.length || upcoming.length || models);

  if (loading && !data) return <PageSkeleton />;

  const connect = async () => {
    setError(null);
    // On success the browser is already on its way to Google.
    setError(await connectDrive());
  };

  const connectedCount = data?.connections.filter(item => item.connected).length ?? 0;
  const upcomingCount = INTEGRATION_GROUPS.reduce(
    (total, group) =>
      total +
      group.upcoming.filter(
        item => !data?.connections.some(live => live.kind === item.kind && live.available)
      ).length,
    0
  );
  const filtered = Boolean(search) || status !== 'ALL';

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1>Integrações</h1>
        <p className="max-w-prose text-muted-foreground">
          As ferramentas em que o Caishen entra por você. Ele só lê: nada é alterado lá fora.{' '}
          <span className="text-foreground tabular-nums">
            {connectedCount} {connectedCount === 1 ? 'conectada' : 'conectadas'}, {upcomingCount} em
            breve.
          </span>
        </p>
      </header>

      {/* Search and the two filters, together, so narrowing the page is one place. */}
      <div className="flex flex-col gap-2 rounded-2xl bg-card p-3 sm:flex-row sm:items-center">
        <div className="relative sm:flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Pesquisar integrações e Modelos"
            className="h-10 rounded-full bg-secondary/60 pl-10 shadow-none"
            onChange={event => setTerm(event.target.value)}
            placeholder="Pesquisar: Drive, e-mail, Modelo…"
            type="search"
            value={term}
          />
        </div>
        <FilterSelect
          label="Situação"
          onChange={setStatus}
          options={[
            { label: 'Todas', value: 'ALL' as const },
            { label: 'Funcionando', value: 'LIVE' as const },
            { label: 'Em breve', value: 'UPCOMING' as const },
          ]}
          value={status}
        />
      </div>

      {!shown.length ? (
        <div className="flex flex-col items-start gap-3 rounded-2xl bg-card p-8">
          <p>
            Nenhuma integração encontrada
            {search ? ` para “${term.trim()}”` : ' com esses filtros'}.
          </p>
          <Button
            onClick={() => {
              setTerm('');
              setStatus('ALL');
            }}
            size="sm"
            variant="outline"
          >
            Limpar filtros
          </Button>
        </div>
      ) : (
        <div className="flex min-w-0 flex-col gap-8">
          {shown.map(({ group, live, models, search: within, upcoming }) => {
            return (
              <section
                aria-labelledby={`${group.id}-title`}
                className="flex scroll-mt-6 flex-col gap-3"
                id={group.id}
                key={group.id}
              >
                <div className="flex flex-col gap-0.5">
                  <h2 className="text-xl font-semibold tracking-tight" id={`${group.id}-title`}>
                    {group.title}
                  </h2>
                  <p className="max-w-prose text-muted-foreground">{group.description}</p>
                </div>
                <div className="flex flex-col gap-2 rounded-2xl bg-card p-2">
                  {live.length > 0 && (
                    <ul className="flex flex-col gap-2">
                      {live.map(connection => (
                        <SheetRow
                          action={
                            <Action connection={connection} onConnect={() => void connect()} />
                          }
                          detail={<Status connection={connection} />}
                          key={connection.kind}
                          name={COPY[connection.kind].name}
                        >
                          <p className="max-w-prose">{COPY[connection.kind].description}</p>
                          <Details connection={connection} />
                        </SheetRow>
                      ))}
                    </ul>
                  )}
                  {models && <ModelsList search={within} />}
                  {upcoming.length > 0 && (
                    <ul aria-label="Em breve" className="flex flex-col">
                      {upcoming.map(item => (
                        <li
                          className="flex flex-col gap-0.5 rounded-xl px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
                          key={item.name}
                        >
                          <span className="font-medium sm:w-36 sm:shrink-0">{item.name}</span>
                          <span className="text-sm text-muted-foreground">{item.description}</span>
                          <Badge className="self-start sm:ml-auto sm:self-center" variant="outline">
                            em breve
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
      {filtered && shown.length > 0 && (
        <p className="sr-only" role="status">
          {shown.length} tipos de integração com esses filtros.
        </p>
      )}
      {error && <FormError message={error} />}
    </div>
  );
}

/** One filter of the bar: its name inside, then the choice. */
function FilterSelect<T extends string>({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: T) => void;
  options: { label: string; value: T }[];
  value: T;
}) {
  return (
    <Select onValueChange={next => onChange(next as T)} value={value}>
      <SelectTrigger
        aria-label={label}
        className="h-10 w-full rounded-full bg-secondary/60 shadow-none lg:w-52"
      >
        <span className="text-muted-foreground">{label}:</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(option => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Details({ connection }: { connection: Connection }): ReactNode {
  const drive = connection.kind === 'GOOGLE_DRIVE';
  return (
    <>
      {connection.kind === 'WHATSAPP' && <WhatsappLinker connected={connection.connected} />}
      {connection.detail && <p className="text-sm">{connection.detail}</p>}
      {connection.unavailableReason && (
        <p className="text-sm text-warning">{connection.unavailableReason}</p>
      )}
      {drive && connection.connected && !pickerConfigured() && (
        <p className="text-sm text-warning">
          Para abrir o seletor de arquivos faltam VITE_GOOGLE_API_KEY e VITE_GOOGLE_APP_ID no .env.
        </p>
      )}
      {drive && connection.connected && (
        <p className="text-sm text-muted-foreground">
          Para desconectar, remova o acesso do Caishen em myaccount.google.com/permissions.
        </p>
      )}
    </>
  );
}

function Action({ connection, onConnect }: { connection: Connection; onConnect: () => void }) {
  if (connection.kind === 'GOOGLE_DRIVE' && !connection.connected) {
    return (
      <Button disabled={Boolean(connection.unavailableReason)} onClick={onConnect} size="sm">
        Conectar
      </Button>
    );
  }
  return null;
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
        {unlinking.error && <FormError message={unlinking.error.message} />}
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
        <div className="flex flex-col gap-3 rounded-xl bg-card p-4">
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
      {starting.error && <FormError message={starting.error.message} />}
    </div>
  );
}
