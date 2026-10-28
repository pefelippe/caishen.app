import { useMutation } from '@apollo/client/react';
import {
  ConnectionsDocument,
  StartSpotifyLinkDocument,
  UnlinkSpotifyDocument,
} from '@zapbots/graphql/client';
import { useSearchParams } from 'react-router-dom';

import { Button } from '@zapbots/ui/components/button';

import { FormError } from './FormError';

/**
 * Linking Spotify (docs/adr/0032): off to Spotify's consent screen, back to `#spotify`, with
 * `?spotify=` saying why when it did not work. Once linked, the way out.
 */
export function SpotifyLinker({ connected }: { connected: boolean }) {
  const [params] = useSearchParams();
  const [start, starting] = useMutation(StartSpotifyLinkDocument);
  const [unlink, unlinking] = useMutation(UnlinkSpotifyDocument, {
    refetchQueries: [ConnectionsDocument],
  });
  const failed = params.get('spotify');

  if (connected) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Ligue o card Música em Personalizar, na Página inicial. Para tirar o acesso também do lado
          de lá, remova o Caishen em spotify.com/account/apps.
        </p>
        <Button
          className="self-start"
          disabled={unlinking.loading}
          onClick={() => void unlink()}
          size="sm"
          variant="outline"
        >
          Desconectar
        </Button>
        {unlinking.error && <FormError error={unlinking.error} />}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {failed && (
        <p className="rounded-xl bg-secondary/60 px-4 py-3.5 text-muted-foreground">{failed}</p>
      )}
      <Button
        className="self-start"
        disabled={starting.loading}
        onClick={() =>
          void start()
            .then(result => {
              if (result.data) window.location.assign(result.data.startSpotifyLink);
            })
            .catch(() => null)
        }
        size="sm"
      >
        Conectar
      </Button>
      {starting.error && <FormError error={starting.error} />}
    </div>
  );
}
