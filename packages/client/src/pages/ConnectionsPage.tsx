import { useQuery } from '@apollo/client/react';
import {
  ConnectionsDocument,
  type ConnectionCategory,
  type ConnectionKind,
  type ConnectionsQuery,
} from '@zapbots/graphql/client';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { FormError } from '../components/FormError';
import { PageSkeleton } from '../components/PageSkeleton';
import { connectDrive, pickerConfigured } from '../lib/drive';

type Connection = ConnectionsQuery['connections'][number];

const CATEGORIES: { category: ConnectionCategory; description: string; title: string }[] = [
  {
    category: 'AI',
    description: 'De onde vêm os Modelos que os Bots usam.',
    title: 'IA',
  },
  {
    category: 'FILE_STORAGE',
    description: 'Os arquivos que você entrega aos Bots junto com um Trabalho.',
    title: 'Arquivos',
  },
];

const COPY: Record<ConnectionKind, { description: string; name: string }> = {
  GOOGLE_DRIVE: {
    description:
      'O zapbots só enxerga os arquivos que você escolher no seletor do Google, e os Bots leem o texto dos que você entregar num Trabalho.',
    name: 'Google Drive',
  },
  OPENROUTER: {
    description:
      'Um serviço que dá acesso a Modelos de vários fornecedores, inclusive gratuitos. A chave fica no servidor e vale para todos os Bots.',
    name: 'OpenRouter',
  },
};

/** Connections with services outside zapbots, one section per category. */
export function ConnectionsPage() {
  const { data, loading } = useQuery(ConnectionsDocument, { fetchPolicy: 'cache-and-network' });
  const [error, setError] = useState<string | null>(null);

  if (loading && !data) return <PageSkeleton />;

  const connect = async () => {
    setError(null);
    // On success the browser is already on its way to Google.
    setError(await connectDrive());
  };

  return (
    <div className="flex max-w-3xl flex-col gap-10">
      <header>
        <span className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
          Ferramentas
        </span>
        <h1>Conexões</h1>
        <p className="mt-1 max-w-prose text-muted-foreground">
          As ferramentas em que os Bots entram por você. Eles só leem: nada é alterado lá fora.
        </p>
      </header>

      {CATEGORIES.map(({ category, description, title }) => (
        <section className="flex flex-col gap-1 border-t border-foreground/60 pt-4" key={category}>
          <h2>{title}</h2>
          <p className="text-muted-foreground">{description}</p>
          <ul className="mt-2 flex flex-col divide-y">
            {data?.connections
              .filter(connection => connection.category === category)
              .map(connection => (
                <ConnectionRow
                  connection={connection}
                  key={connection.kind}
                  onConnect={() => void connect()}
                />
              ))}
          </ul>
        </section>
      ))}
      {error && <FormError message={error} />}
    </div>
  );
}

function ConnectionRow({
  connection,
  onConnect,
}: {
  connection: Connection;
  onConnect: () => void;
}) {
  const drive = connection.kind === 'GOOGLE_DRIVE';
  return (
    <li className="flex flex-wrap items-start justify-between gap-x-8 gap-y-3 py-4">
      <div className="flex max-w-prose flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="font-serif text-xl">{COPY[connection.kind].name}</span>
          {connection.connected && <Badge variant="secondary">conectado</Badge>}
          {!connection.available && <Badge variant="outline">em breve</Badge>}
        </div>
        <p className="text-muted-foreground">{COPY[connection.kind].description}</p>
        {connection.detail && <p className="text-xs">{connection.detail}</p>}
        {connection.available && connection.unavailableReason && (
          <p className="text-xs text-warning">{connection.unavailableReason}</p>
        )}
        {drive && connection.connected && !pickerConfigured() && (
          <p className="text-xs text-warning">
            Para abrir o seletor de arquivos faltam VITE_GOOGLE_API_KEY e VITE_GOOGLE_APP_ID no
            .env.
          </p>
        )}
        {drive && connection.connected && (
          <p className="text-xs text-muted-foreground">
            Para desconectar, remova o acesso do zapbots em myaccount.google.com/permissions.
          </p>
        )}
      </div>
      {drive && !connection.connected && (
        <Button disabled={Boolean(connection.unavailableReason)} onClick={onConnect}>
          Conectar
        </Button>
      )}
      {connection.kind === 'OPENROUTER' && (
        <Button asChild variant="outline">
          <Link to="/">Escolher Modelos</Link>
        </Button>
      )}
    </li>
  );
}
