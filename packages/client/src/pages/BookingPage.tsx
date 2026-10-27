import { useMutation, useQuery } from '@apollo/client/react';
import {
  BookDocument,
  CancelBookingByTokenDocument,
  PublicBookingDocument,
  PublicBookingTypeDocument,
  type BookingConfirmationFieldsFragment,
} from '@zapbots/graphql/client';
import { ArrowLeftIcon, CalendarCheckIcon, ClockIcon } from 'lucide-react';
import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';

import { Field } from '@zapbots/ui/blocks/field';
import { Logo } from '@zapbots/ui/blocks/logo';
import { PageSkeleton } from '@zapbots/ui/blocks/page-skeleton';
import { Button } from '@zapbots/ui/components/button';
import { Card } from '@zapbots/ui/components/card';
import { Input } from '@zapbots/ui/components/input';
import { Textarea } from '@zapbots/ui/components/textarea';
import { cn } from '@zapbots/ui/lib/utils';

import { FormError } from '../components/FormError';
import { QueryError } from '../components/QueryError';

/** The guest's own clock: slots are shown and e-mailed as they see them. */
const GUEST_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

const dayKey = (instant: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: GUEST_ZONE }).format(new Date(instant));
const dayLabel = (instant: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'short',
    timeZone: GUEST_ZONE,
    weekday: 'short',
  }).format(new Date(instant));
const timeLabel = (instant: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: GUEST_ZONE,
  }).format(new Date(instant));
const whenLabel = (instant: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: GUEST_ZONE,
  }).format(new Date(instant));

/** A page anyone opens, signed in or out: light, with the mark on top. pt-BR only, like the landing page. */
function PublicFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-3xl items-center gap-2.5 px-4 py-4 sm:px-6">
          <Link className="flex items-center gap-2.5 text-header" to="/landing">
            <Logo size={24} />
            <span className="text-lg font-semibold tracking-tight text-foreground">Caishen</span>
          </Link>
        </div>
      </header>
      <main className="page-enter mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">{children}</main>
    </div>
  );
}

function Confirmed({ booking }: { booking: BookingConfirmationFieldsFragment }) {
  return (
    <Card className="items-center gap-3 text-center">
      <CalendarCheckIcon className="size-10 text-primary" />
      <h1 className="text-2xl font-semibold">Agendado</h1>
      <p className="text-muted-foreground">
        {booking.title} com {booking.ownerName}
      </p>
      <p className="font-medium first-letter:uppercase">{whenLabel(booking.startsAt)}</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        Mandamos a confirmação para o seu e-mail, com um link para cancelar se precisar.
      </p>
      <Button asChild variant="ghost">
        <Link to={`/book/cancel/${booking.cancelToken}`}>Cancelar agendamento</Link>
      </Button>
    </Card>
  );
}

/** `/book/:slug`: the guest picks a day and a time, then says who they are. */
export function BookingPage() {
  const { slug = '' } = useParams();
  const { data, error, loading, refetch } = useQuery(PublicBookingTypeDocument, {
    fetchPolicy: 'network-only',
    variables: { slug },
  });
  const [book, booking] = useMutation(BookDocument);
  const [day, setDay] = useState<null | string>(null);
  const [slot, setSlot] = useState<null | string>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');

  const days = useMemo(() => {
    const grouped = new Map<string, string[]>();
    for (const instant of data?.publicBookingSlots ?? []) {
      const key = dayKey(instant);
      grouped.set(key, [...(grouped.get(key) ?? []), instant]);
    }
    return [...grouped.values()];
  }, [data]);

  if (loading && !data) return <PageSkeleton />;
  if (error)
    return (
      <PublicFrame>
        <QueryError error={error} title="Não foi possível abrir o link" />
      </PublicFrame>
    );
  const type = data?.publicBookingType;
  if (!type) {
    return (
      <PublicFrame>
        <Card className="items-center gap-2 text-center">
          <h1 className="text-xl font-semibold">Link indisponível</h1>
          <p className="text-muted-foreground">Esse link não existe ou foi desativado.</p>
        </Card>
      </PublicFrame>
    );
  }
  if (booking.data) {
    return (
      <PublicFrame>
        <Confirmed booking={booking.data.book} />
      </PublicFrame>
    );
  }

  const shown = days.find(times => dayKey(times[0]!) === day) ?? days[0];

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!slot) return;
    book({
      variables: {
        input: { email, name, note, slug, startsAt: slot, timeZone: GUEST_ZONE },
      },
    }).catch(() => {
      // Taken meanwhile: show the slots as they are now.
      setSlot(null);
      void refetch();
    });
  };

  return (
    <PublicFrame>
      <div className="flex flex-col gap-6">
        <header>
          <p className="text-sm text-muted-foreground">{type.ownerName}</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{type.title}</h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <ClockIcon className="size-4" />
            {type.durationMinutes} min · horários no seu fuso ({GUEST_ZONE})
          </p>
          {type.description && (
            <p className="mt-3 max-w-prose whitespace-pre-line">{type.description}</p>
          )}
        </header>

        {slot ? (
          <Card className="gap-4">
            <Button className="self-start" onClick={() => setSlot(null)} size="sm" variant="ghost">
              <ArrowLeftIcon />
              Outro horário
            </Button>
            <p className="font-medium first-letter:uppercase">{whenLabel(slot)}</p>
            <form className="flex flex-col gap-4" onSubmit={submit}>
              <Field label="Seu nome">
                <Input
                  autoComplete="name"
                  onChange={e => setName(e.target.value)}
                  required
                  value={name}
                />
              </Field>
              <Field label="Seu e-mail">
                <Input
                  autoComplete="email"
                  onChange={e => setEmail(e.target.value)}
                  required
                  type="email"
                  value={email}
                />
              </Field>
              <Field label="Mensagem (opcional)">
                <Textarea
                  maxLength={1000}
                  onChange={e => setNote(e.target.value)}
                  rows={3}
                  value={note}
                />
              </Field>
              <FormError error={booking.error} />
              <p className="text-xs text-muted-foreground">
                Seu nome, e-mail e mensagem vão para {type.ownerName}, como diz a nossa{' '}
                <Link className="text-primary underline-offset-4 hover:underline" to="/privacy">
                  Política de Privacidade
                </Link>
                .
              </p>
              <Button className="self-start" disabled={booking.loading} type="submit">
                Confirmar agendamento
              </Button>
            </form>
          </Card>
        ) : days.length === 0 ? (
          <Card className="items-center text-center text-muted-foreground">
            Nenhum horário livre por enquanto. Tente de novo mais tarde.
          </Card>
        ) : (
          <Card className="gap-5">
            <FormError error={booking.error} />
            <div className="flex gap-2 overflow-x-auto pb-1">
              {days.map(times => {
                const key = dayKey(times[0]!);
                return (
                  <Button
                    className={cn(
                      'shrink-0 capitalize',
                      shown === times && 'border-primary text-primary'
                    )}
                    key={key}
                    onClick={() => setDay(key)}
                    variant="outline"
                  >
                    {dayLabel(times[0]!)}
                  </Button>
                );
              })}
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {shown?.map(instant => (
                <Button key={instant} onClick={() => setSlot(instant)} variant="outline">
                  {timeLabel(instant)}
                </Button>
              ))}
            </div>
          </Card>
        )}
      </div>
    </PublicFrame>
  );
}

/** `/book/cancel/:token`: the guest's link to cancel, from the confirmation and its e-mail. */
export function CancelBookingPage() {
  const { token = '' } = useParams();
  const { data, error, loading } = useQuery(PublicBookingDocument, { variables: { token } });
  const [cancel, cancelling] = useMutation(CancelBookingByTokenDocument, {
    refetchQueries: [PublicBookingDocument],
  });

  if (loading && !data) return <PageSkeleton />;
  if (error)
    return (
      <PublicFrame>
        <QueryError error={error} title="Não foi possível abrir o agendamento" />
      </PublicFrame>
    );
  const booking = data?.publicBooking;
  return (
    <PublicFrame>
      <Card className="items-center gap-3 text-center">
        {!booking ? (
          <>
            <h1 className="text-xl font-semibold">Agendamento não encontrado</h1>
            <p className="text-muted-foreground">Confira o link do seu e-mail.</p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold">
              {booking.title} com {booking.ownerName}
            </h1>
            <p className="font-medium first-letter:uppercase">{whenLabel(booking.startsAt)}</p>
            {booking.cancelledAt ? (
              <p className="text-muted-foreground">Este agendamento foi cancelado.</p>
            ) : new Date(booking.startsAt) < new Date() ? (
              <p className="text-muted-foreground">Este horário já passou.</p>
            ) : (
              <>
                <FormError error={cancelling.error} />
                <Button
                  disabled={cancelling.loading}
                  onClick={() => void cancel({ variables: { token } }).catch(() => undefined)}
                  variant="destructive"
                >
                  Cancelar agendamento
                </Button>
              </>
            )}
          </>
        )}
      </Card>
    </PublicFrame>
  );
}
