import { useMutation, useQuery } from '@apollo/client/react';
import {
  ConnectionsDocument,
  GoogleTasksSyncDocument,
  SyncGoogleTasksDocument,
  TasksDocument,
} from '@zapbots/graphql/client';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@zapbots/ui/components/button';

import { authClient } from '../lib/auth';
import { FormError } from './FormError';

/** Read only: nothing is written to the User's Google Tarefas (docs/adr/0030). */
export const TASKS_SCOPE = 'https://www.googleapis.com/auth/tasks.readonly';

/** Sends the User to Google to grant the Tarefas scope, then back to this card. */
async function connectGoogleTasks(): Promise<null | string> {
  const result = await authClient.linkSocial({
    callbackURL: `${window.location.origin}/integrations#google-tasks`,
    provider: 'google',
    scopes: [TASKS_SCOPE],
  });
  // Better Auth's own reasons are for developers.
  return result.error ? 'Não foi possível conectar o Google Tarefas. Tente de novo.' : null;
}

const when = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(iso)
  );

/** Google Tarefas on Integrações: connect, then when it was last read and a way to read it now. */
export function GoogleTasksLinker({ connected }: { connected: boolean }) {
  const { data } = useQuery(GoogleTasksSyncDocument, {
    fetchPolicy: 'cache-and-network',
    skip: !connected,
  });
  const [sync, syncing] = useMutation(SyncGoogleTasksDocument, {
    refetchQueries: [GoogleTasksSyncDocument, ConnectionsDocument, TasksDocument],
  });
  const [problem, setProblem] = useState<null | string>(null);
  const [result, setResult] = useState<null | string>(null);

  if (!connected) {
    return (
      <div className="flex flex-col gap-3">
        <Button
          className="self-start"
          onClick={() => void connectGoogleTasks().then(setProblem)}
          size="sm"
        >
          Conectar o Google Tarefas
        </Button>
        <p className="text-sm text-muted-foreground">
          O Google pede só a leitura das suas tarefas. Elas entram nas Tarefas, numa Lista para cada
          lista de lá; o que você marcar aqui não muda nada lá.
        </p>
        {problem && <p className="text-sm text-destructive">{problem}</p>}
      </div>
    );
  }

  const last = data?.googleTasksSync;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm">
        {last?.lastSyncedAt
          ? `Lido em ${when(last.lastSyncedAt)}. Ele lê de novo quando você abre as Tarefas.`
          : 'Ainda não lido.'}
        {result && ` ${result}`}
      </p>
      <Button
        className="self-start"
        disabled={syncing.loading}
        onClick={() =>
          void sync()
            .then(({ data: synced }) => {
              const counts = synced?.syncGoogleTasks;
              if (!counts) return;
              setResult(
                counts.added || counts.done || counts.removed
                  ? `Agora: ${counts.added} novas, ${counts.done} feitas, ${counts.removed} apagadas.`
                  : 'Nada mudou.'
              );
            })
            .catch(() => null)
        }
        size="sm"
        variant="outline"
      >
        {syncing.loading ? 'Lendo…' : 'Ler agora'}
      </Button>
      {syncing.error && <FormError error={syncing.error} />}
    </div>
  );
}

/** How long Tarefas waits before reading Google Tarefas again on its own. */
const STALE_MS = 10 * 60 * 1000;

/** On Tarefas: reads Google Tarefas once on arrival when connected and not read in a while. */
export function useGoogleTasksAutoSync() {
  const { data: connections } = useQuery(ConnectionsDocument, { fetchPolicy: 'cache-first' });
  const connected = Boolean(
    connections?.connections.find(item => item.kind === 'GOOGLE_TASKS')?.connected
  );
  const { data } = useQuery(GoogleTasksSyncDocument, { skip: !connected });
  const [sync] = useMutation(SyncGoogleTasksDocument, {
    refetchQueries: [TasksDocument, GoogleTasksSyncDocument],
  });
  const started = useRef(false);
  useEffect(() => {
    if (!connected || !data || started.current) return;
    const last = data.googleTasksSync?.lastSyncedAt;
    if (last && Date.now() - new Date(last).getTime() < STALE_MS) return;
    started.current = true;
    // A failed read stays on the card in Integrações; Tarefas goes on as it is.
    void sync().catch(() => null);
  }, [connected, data, sync]);
}
