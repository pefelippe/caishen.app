import { useMutation, useQuery } from '@apollo/client/react';
import {
  ConnectionsDocument,
  StartTelegramLinkDocument,
  UnlinkTelegramDocument,
  type StartTelegramLinkMutation,
} from '@zapbots/graphql/client';
import { useState } from 'react';

import { Button } from '@zapbots/ui/components/button';

import { FormError } from './FormError';

type LinkCode = StartTelegramLinkMutation['startTelegramLink'];

/**
 * Linking Telegram (docs/adr/0031): a one-time `t.me` link that opens the Caishen's bot with the
 * code in it; tapping Iniciar links the chat. Once linked, the way out.
 */
export function TelegramLinker({ connected }: { connected: boolean }) {
  const [code, setCode] = useState<LinkCode | null>(null);
  const [start, starting] = useMutation(StartTelegramLinkDocument);
  const [unlink, unlinking] = useMutation(UnlinkTelegramDocument, {
    refetchQueries: [ConnectionsDocument],
  });
  // Once the bot gets the code, the server links the chat: look for it now and then.
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
        <span className="text-sm text-muted-foreground">Ou mande /sair para o Caishen lá.</span>
        {unlinking.error && <FormError error={unlinking.error} />}
      </div>
    );
  }

  const begin = () =>
    void start()
      .then(result => setCode(result.data?.startTelegramLink ?? null))
      .catch(() => null);
  const expires = code
    ? new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(
        new Date(code.expiresAt)
      )
    : null;
  return (
    <div className="flex flex-col gap-3">
      {code ? (
        <div className="flex flex-col gap-3 rounded-xl bg-secondary/60 p-4">
          <p>Abra o Caishen no Telegram e toque em Iniciar até as {expires}.</p>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <a href={code.url} rel="noreferrer" target="_blank">
                Abrir o Telegram
              </a>
            </Button>
            <Button disabled={starting.loading} onClick={begin} size="sm" variant="ghost">
              Gerar outro link
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            No computador, o link abre o Telegram Desktop ou o Telegram Web. Esta tela muda sozinha
            quando ele receber.
          </p>
        </div>
      ) : (
        <Button className="self-start" disabled={starting.loading} onClick={begin} size="sm">
          Conectar
        </Button>
      )}
      {starting.error && <FormError error={starting.error} />}
    </div>
  );
}
