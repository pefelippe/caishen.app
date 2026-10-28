import { useMutation, useQuery } from '@apollo/client/react';
import {
  CalendarFeedDocument,
  ConnectionsDocument,
  SetCalendarFeedDocument,
} from '@zapbots/graphql/client';
import { CheckIcon, CopyIcon } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@zapbots/ui/components/button';
import { Input } from '@zapbots/ui/components/input';

import { FormError } from './FormError';

/**
 * The Agenda's private calendar link: made here, then subscribed to in the iPhone (webcal), Google
 * Agenda or Outlook, each through its own "add by URL". A new link turns the old one off.
 */
export function CalendarFeedLinker() {
  const { data } = useQuery(CalendarFeedDocument, { fetchPolicy: 'cache-and-network' });
  const [set, setting] = useMutation(SetCalendarFeedDocument, {
    refetchQueries: [CalendarFeedDocument, ConnectionsDocument],
  });
  const [copied, setCopied] = useState(false);
  const feed = data?.calendarFeed;

  if (!feed) {
    return (
      <div className="flex flex-col gap-3">
        <Button
          className="self-start"
          disabled={setting.loading || !data}
          onClick={() => void set({ variables: { on: true } }).catch(() => null)}
          size="sm"
        >
          Criar link da Agenda
        </Button>
        {setting.error && <FormError error={setting.error} />}
      </div>
    );
  }

  const url = `${window.location.origin}${feed.path}`;
  const webcal = url.replace(/^https?:/, 'webcal:');
  const copy = () =>
    void navigator.clipboard
      .writeText(url)
      .then(() => setCopied(true))
      .catch(() => null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Input
          aria-label="Link da Agenda"
          onFocus={event => event.target.select()}
          readOnly
          value={url}
        />
        <Button onClick={copy} size="sm" variant="outline">
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? 'Copiado' : 'Copiar'}
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm">
          <a href={webcal}>iPhone e Mac</a>
        </Button>
        <Button asChild size="sm" variant="outline">
          <a
            href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`}
            rel="noreferrer"
            target="_blank"
          >
            Google Agenda
          </a>
        </Button>
        <Button asChild size="sm" variant="outline">
          <a
            href={`https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(url)}&name=Caishen`}
            rel="noreferrer"
            target="_blank"
          >
            Outlook
          </a>
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Quem tiver este link vê sua Agenda. Se ele vazar, troque: o antigo para de funcionar. O
        iPhone lê de novo a cada hora; o Google pode levar algumas horas.
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
          Trocar link
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
