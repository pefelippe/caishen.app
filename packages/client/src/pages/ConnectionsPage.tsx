import { useQuery } from '@apollo/client/react';
import { ConnectionsDocument, type ConnectionKind } from '@mny/graphql/client';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { FormError } from '../components/FormError';
import { PageSkeleton } from '../components/PageSkeleton';
import { connectDrive, pickerConfigured } from '../lib/drive';

const COPY: Record<ConnectionKind, { description: string; name: string }> = {
  GOOGLE_DRIVE: {
    description:
      'Anexe arquivos do Drive a Anotações e Tarefas. O mny só enxerga os arquivos que você escolher no seletor do Google, e os Buddies leem o texto dos que estiverem anexados.',
    name: 'Google Drive',
  },
  SPOTIFY: {
    description: 'Música para os Treinos e para o foco no Trabalho.',
    name: 'Spotify',
  },
};

/** Connections with services outside mny. Only Google Drive works in the MVP. */
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
    <div className="flex max-w-3xl flex-col gap-8">
      <header>
        <span className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
          IA
        </span>
        <h1>Conexões</h1>
        <p className="mt-1 max-w-prose text-muted-foreground">
          Serviços de fora que o mny e os Buddies podem usar.
        </p>
      </header>

      <ul className="flex flex-col">
        {data?.connections.map(connection => (
          <li
            className="flex flex-wrap items-start justify-between gap-x-8 gap-y-3 border-t border-foreground/60 py-6"
            key={connection.kind}
          >
            <div className="flex max-w-prose flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="font-serif text-2xl">{COPY[connection.kind].name}</span>
                {connection.connected && <Badge variant="secondary">conectado</Badge>}
                {!connection.available && <Badge variant="outline">em breve</Badge>}
              </div>
              <p className="text-muted-foreground">{COPY[connection.kind].description}</p>
              {connection.available && connection.unavailableReason && (
                <p className="text-xs text-warning">{connection.unavailableReason}</p>
              )}
              {connection.kind === 'GOOGLE_DRIVE' &&
                connection.connected &&
                !pickerConfigured() && (
                  <p className="text-xs text-warning">
                    Para abrir o seletor de arquivos faltam VITE_GOOGLE_API_KEY e VITE_GOOGLE_APP_ID
                    no .env.
                  </p>
                )}
              {connection.kind === 'GOOGLE_DRIVE' && connection.connected && (
                <p className="text-xs text-muted-foreground">
                  Para desconectar, remova o acesso do mny em myaccount.google.com/permissions.
                </p>
              )}
            </div>
            {connection.kind === 'GOOGLE_DRIVE' && !connection.connected && (
              <Button
                disabled={Boolean(connection.unavailableReason)}
                onClick={() => void connect()}
              >
                Conectar
              </Button>
            )}
          </li>
        ))}
      </ul>
      {error && <FormError message={error} />}
    </div>
  );
}
