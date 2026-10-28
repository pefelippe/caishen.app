import { useMutation, useQuery } from '@apollo/client/react';
import {
  AddExternalCalendarDocument,
  AgendaDocument,
  ConnectionsDocument,
  ExternalCalendarsDocument,
  RefreshExternalCalendarDocument,
  RemoveExternalCalendarDocument,
  type CalendarSource,
} from '@zapbots/graphql/client';
import { useState, type FormEvent } from 'react';

import { Button } from '@zapbots/ui/components/button';
import { Input } from '@zapbots/ui/components/input';
import { Label } from '@zapbots/ui/components/label';

import { FormError } from './FormError';

const SOURCE: Record<CalendarSource, string> = {
  GOOGLE: 'Google',
  ICLOUD: 'iCloud',
  OTHER: 'Outra',
  OUTLOOK: 'Outlook',
};

/** Where each service keeps the secret link of a calendar. */
const HOW = [
  {
    name: 'iCloud',
    steps:
      'No iPhone, abra Calendário › Calendários, toque no (i) da agenda, ligue Calendário Público e toque em Compartilhar Link. No Mac, clique com o botão direito na agenda › Compartilhar › Calendário Público.',
  },
  {
    name: 'Google Agenda',
    steps:
      'No computador, em Configurações, escolha a agenda à esquerda e copie o Endereço secreto no formato iCal, em Integrar agenda.',
  },
  {
    name: 'Outlook',
    steps:
      'Em Configurações › Calendário › Calendários compartilhados, publique a agenda e copie o link ICS.',
  },
];

const when = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(iso)
  );

/**
 * Calendars kept elsewhere, each by its secret .ics link: listed with when they were last read
 * (or why not), read again or removed, and a form to add one.
 */
export function ExternalCalendarsLinker() {
  const { data } = useQuery(ExternalCalendarsDocument, { fetchPolicy: 'cache-and-network' });
  const refetchQueries = [ExternalCalendarsDocument, ConnectionsDocument, AgendaDocument];
  const [add, adding] = useMutation(AddExternalCalendarDocument, { refetchQueries });
  const [refresh, refreshing] = useMutation(RefreshExternalCalendarDocument, { refetchQueries });
  const [remove, removing] = useMutation(RemoveExternalCalendarDocument, { refetchQueries });
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = await add({ variables: { name, url } }).catch(() => null);
    if (!result?.data) return;
    setName('');
    setUrl('');
  };

  const calendars = data?.externalCalendars ?? [];
  return (
    <div className="flex flex-col gap-5">
      {calendars.length > 0 && (
        <ul className="flex flex-col gap-2">
          {calendars.map(calendar => (
            <li
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-muted px-4 py-3"
              key={calendar.id}
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">{calendar.name}</span>
                <span className="text-sm text-muted-foreground">
                  {SOURCE[calendar.source]} · {calendar.host}
                  {calendar.lastReadAt && ` · lida em ${when(calendar.lastReadAt)}`}
                </span>
                {calendar.error && (
                  <span className="text-sm text-destructive">{calendar.error}</span>
                )}
              </div>
              <Button
                disabled={refreshing.loading}
                onClick={() => void refresh({ variables: { id: calendar.id } }).catch(() => null)}
                size="sm"
                variant="ghost"
              >
                Ler de novo
              </Button>
              <Button
                disabled={removing.loading}
                onClick={() => void remove({ variables: { id: calendar.id } }).catch(() => null)}
                size="sm"
                variant="ghost"
              >
                Remover
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form className="flex flex-col gap-3" onSubmit={event => void submit(event)}>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="calendar-name">Nome</Label>
            <Input
              id="calendar-name"
              maxLength={60}
              onChange={event => setName(event.target.value)}
              placeholder="Trabalho"
              value={name}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="calendar-url">Link da agenda (.ics ou webcal://)</Label>
            <Input
              id="calendar-url"
              inputMode="url"
              onChange={event => setUrl(event.target.value)}
              placeholder="webcal://p52-caldav.icloud.com/published/2/…"
              required
              value={url}
            />
          </div>
        </div>
        <Button
          className="self-start"
          disabled={adding.loading || !url.trim()}
          size="sm"
          type="submit"
        >
          {adding.loading ? 'Lendo a agenda…' : 'Ligar agenda'}
        </Button>
        {adding.error && <FormError error={adding.error} />}
        {(refreshing.error ?? removing.error) && (
          <FormError error={refreshing.error ?? removing.error} />
        )}
      </form>

      <details className="rounded-xl bg-secondary/60 px-4 py-3 text-sm">
        <summary className="cursor-pointer font-medium">Onde encontro o link?</summary>
        <dl className="mt-3 flex flex-col gap-3">
          {HOW.map(item => (
            <div key={item.name}>
              <dt className="font-medium">{item.name}</dt>
              <dd className="text-muted-foreground">{item.steps}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-muted-foreground">
          Quem tem o link lê a agenda; aqui ele fica guardado cifrado. As mudanças aparecem em até
          15 minutos.
        </p>
      </details>
    </div>
  );
}
