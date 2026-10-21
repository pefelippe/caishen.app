import { useQuery } from '@apollo/client/react';
import {
  ConnectionsDocument,
  type ConnectionKind,
  type ConnectionsQuery,
} from '@zapbots/graphql/client';
import { SearchIcon } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { connectDrive, pickerConfigured } from '../lib/drive';
import { matches } from '../lib/search';
import { ModelsList } from '../pages/ModelsPage';
import { FormError } from './FormError';
import { PageSkeleton } from './PageSkeleton';
import { Sheet, SheetRow } from './Sheet';

type Connection = ConnectionsQuery['connections'][number];

/** A kind of tool the Bots can enter, with the Integrations that already work for it. */
interface IntegrationGroup {
  description: string;
  /** Anchor of the group on the page. */
  id: string;
  /** Integrations that already work, by their kind on the server. */
  kinds: ConnectionKind[];
  title: string;
}

export const INTEGRATION_GROUPS: IntegrationGroup[] = [
  {
    description: 'O Modelo de linguagem que o Caishen usa. Só os gratuitos, pelo OpenRouter.',
    id: 'ai',
    kinds: [],
    title: 'Modelos de IA',
  },
  {
    description: 'Os arquivos que você entrega ao Caishen para ele ler.',
    id: 'files',
    kinds: ['GOOGLE_DRIVE'],
    title: 'Arquivos',
  },
];

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
};

/** The status of an Integration, the same way everywhere. */
function Status({ connection }: { connection: Connection }) {
  if (connection.connected) return <Badge className="bg-success text-white">conectado</Badge>;
  if (connection.unavailableReason) return <Badge variant="outline">indisponível</Badge>;
  return <Badge variant="secondary">disponível</Badge>;
}

/**
 * Integrações: the tools the Caishen enters for you, one sheet per kind, the Models under
 * OpenRouter, and a search over all of it.
 */
export function ConnectionsSettings() {
  const { hash } = useLocation();
  const { data, loading } = useQuery(ConnectionsDocument, { fetchPolicy: 'cache-and-network' });
  const [error, setError] = useState<string | null>(null);
  const [term, setTerm] = useState('');
  const ready = Boolean(data);
  // Opened on one part (an old link, the chat): bring it into view once it is there.
  useEffect(() => {
    if (ready && hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash, ready]);

  if (loading && !data) return <PageSkeleton />;
  const search = term.trim().toLocaleLowerCase('pt-BR');

  const connect = async () => {
    setError(null);
    // On success the browser is already on its way to Google.
    setError(await connectDrive());
  };

  const sheets = INTEGRATION_GROUPS.map(group => {
    const groupMatches = matches(search, group.title, group.description);
    const live = group.kinds
      .map(kind => data?.connections.find(item => item.kind === kind))
      .filter((item): item is Connection => Boolean(item))
      .filter(
        item => groupMatches || matches(search, COPY[item.kind].name, COPY[item.kind].description)
      );
    // The Models are found by Bot or Model name too, so they can match on their own.
    const models = group.id === 'ai';
    if (!live.length && !models) return null;
    return { group, live, models, search: groupMatches ? '' : search };
  }).filter(sheet => sheet !== null);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h1>Integrações</h1>
          <p className="mt-1 max-w-prose text-muted-foreground">
            As ferramentas em que o Caishen entra por você. Ele só lê: nada é alterado lá fora.
          </p>
        </div>
        <div className="relative w-full md:max-w-sm">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Pesquisar integrações e Modelos"
            className="h-11 rounded-full border-0 bg-card pl-10"
            onChange={event => setTerm(event.target.value)}
            placeholder="Pesquisar integrações e Modelos"
            type="search"
            value={term}
          />
        </div>
      </header>

      {sheets.map(({ group, live, models, search: within }) => (
        <Sheet id={group.id} intro={group.description} key={group.id} title={group.title}>
          {live.length > 0 && (
            <ul className="flex flex-col gap-2">
              {live.map(connection => (
                <SheetRow
                  action={<Action connection={connection} onConnect={() => void connect()} />}
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
        </Sheet>
      ))}
      {search && !sheets.length && (
        <p className="text-muted-foreground">Nada encontrado para “{term.trim()}”.</p>
      )}
      {error && <FormError message={error} />}
    </div>
  );
}

function Details({ connection }: { connection: Connection }): ReactNode {
  const drive = connection.kind === 'GOOGLE_DRIVE';
  return (
    <>
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
