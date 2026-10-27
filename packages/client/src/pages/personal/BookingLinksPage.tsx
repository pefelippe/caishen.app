import { useMutation, useQuery } from '@apollo/client/react';
import {
  BookingsDocument,
  BookingTypesDocument,
  CancelBookingDocument,
  DeleteBookingTypeDocument,
  SaveBookingTypeDocument,
  type BookingTypeFieldsFragment,
} from '@zapbots/graphql/client';
import {
  ArrowLeftIcon,
  CopyIcon,
  ExternalLinkIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { Field, PageHeading } from '@zapbots/ui/blocks/field';
import { PageSkeleton } from '@zapbots/ui/blocks/page-skeleton';
import { Badge } from '@zapbots/ui/components/badge';
import { Button } from '@zapbots/ui/components/button';
import { Card } from '@zapbots/ui/components/card';
import { Checkbox } from '@zapbots/ui/components/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@zapbots/ui/components/dialog';
import { Input } from '@zapbots/ui/components/input';
import { Switch } from '@zapbots/ui/components/switch';
import { Textarea } from '@zapbots/ui/components/textarea';

import { FormError } from '../../components/FormError';
import { QueryError } from '../../components/QueryError';
import { useToast } from '../../components/Toaster';
import { useI18n } from '../../lib/i18n';
import { weekdayNames } from './shared';

type BookingType = BookingTypeFieldsFragment;
type Day = { end: string; on: boolean; start: string };

const linkOf = (slug: string) => `${window.location.origin}/book/${slug}`;

/** A slug from a title: lowercase, no accents, words joined by dashes. */
const slugify = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);

/** One line per weekday, Sunday first; a new link opens Monday to Friday, 9 to 18. */
function weekOf(type: BookingType | null): Day[] {
  return [0, 1, 2, 3, 4, 5, 6].map(weekday => {
    if (!type) return { end: '18:00', on: weekday >= 1 && weekday <= 5, start: '09:00' };
    const window = type.windows.find(w => w.weekday === weekday);
    return window
      ? { end: window.end, on: true, start: window.start }
      : { end: '18:00', on: false, start: '09:00' };
  });
}

function BookingTypeDialog({ onClose, type }: { onClose: () => void; type: BookingType | null }) {
  const { language, t } = useI18n();
  const [title, setTitle] = useState(type?.title ?? '');
  const [slug, setSlug] = useState(type?.slug ?? '');
  const [description, setDescription] = useState(type?.description ?? '');
  const [duration, setDuration] = useState(String(type?.durationMinutes ?? 30));
  const [notice, setNotice] = useState(String((type?.minNoticeMinutes ?? 240) / 60));
  const [daysAhead, setDaysAhead] = useState(String(type?.daysAhead ?? 30));
  const [week, setWeek] = useState(() => weekOf(type));
  const [save, saving] = useMutation(SaveBookingTypeDocument, {
    refetchQueries: [BookingTypesDocument],
  });
  const names = weekdayNames(language);

  const setDay = (weekday: number, change: Partial<Day>) =>
    setWeek(days => days.map((day, i) => (i === weekday ? { ...day, ...change } : day)));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    save({
      variables: {
        id: type?.id,
        input: {
          active: type?.active ?? true,
          daysAhead: Number(daysAhead),
          description,
          durationMinutes: Number(duration),
          minNoticeMinutes: Math.round(Number(notice) * 60),
          slug: slug || slugify(title),
          title,
          windows: week.flatMap((day, weekday) =>
            day.on ? [{ end: day.end, start: day.start, weekday }] : []
          ),
        },
      },
    })
      .then(onClose)
      .catch(() => undefined);
  };

  return (
    <Dialog onOpenChange={open => !open && onClose()} open>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{type ? t('personal.booking.edit') : t('personal.booking.new')}</DialogTitle>
          <DialogDescription>{t('personal.booking.dialogHint')}</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" id="booking-type" onSubmit={submit}>
          <Field label={t('personal.booking.title')}>
            <Input
              autoFocus
              onChange={e => setTitle(e.target.value)}
              placeholder={t('personal.booking.titlePlaceholder')}
              required
              value={title}
            />
          </Field>
          <Field hint={linkOf(slug || slugify(title) || '…')} label={t('personal.booking.slug')}>
            <Input
              onChange={e => setSlug(slugify(e.target.value))}
              placeholder={slugify(title)}
              value={slug}
            />
          </Field>
          <Field label={t('personal.booking.description')}>
            <Textarea onChange={e => setDescription(e.target.value)} rows={2} value={description} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label={t('personal.booking.duration')}>
              <Input
                min={5}
                max={480}
                onChange={e => setDuration(e.target.value)}
                required
                type="number"
                value={duration}
              />
            </Field>
            <Field label={t('personal.booking.notice')}>
              <Input
                min={0}
                max={720}
                onChange={e => setNotice(e.target.value)}
                required
                step="0.5"
                type="number"
                value={notice}
              />
            </Field>
            <Field label={t('personal.booking.daysAhead')}>
              <Input
                min={1}
                max={365}
                onChange={e => setDaysAhead(e.target.value)}
                required
                type="number"
                value={daysAhead}
              />
            </Field>
          </div>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">{t('personal.booking.hours')}</p>
            {week.map((day, weekday) => (
              <div className="flex items-center gap-3" key={weekday}>
                <label className="flex w-24 items-center gap-2 text-sm capitalize">
                  <Checkbox
                    checked={day.on}
                    onCheckedChange={on => setDay(weekday, { on: on === true })}
                  />
                  {names[weekday]}
                </label>
                {day.on ? (
                  <>
                    <Input
                      className="w-28"
                      onChange={e => setDay(weekday, { start: e.target.value })}
                      type="time"
                      value={day.start}
                    />
                    <span className="text-muted-foreground">–</span>
                    <Input
                      className="w-28"
                      onChange={e => setDay(weekday, { end: e.target.value })}
                      type="time"
                      value={day.end}
                    />
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {t('personal.booking.unavailable')}
                  </span>
                )}
              </div>
            ))}
          </div>
          <FormError error={saving.error} />
        </form>
        <DialogFooter>
          <Button onClick={onClose} variant="ghost">
            {t('personal.back')}
          </Button>
          <Button disabled={saving.loading} form="booking-type" type="submit">
            {t('personal.booking.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Asks once before something the other side will notice, and shows why it failed. */
function Confirm({
  action,
  message,
  onClose,
  run,
  title,
}: {
  action: string;
  message: string;
  onClose: () => void;
  run: () => Promise<unknown>;
  title: string;
}) {
  const { t } = useI18n();
  const [state, setState] = useState<{ error?: unknown; loading: boolean }>({ loading: false });
  const go = () => {
    setState({ loading: true });
    run()
      .then(onClose)
      .catch(error => setState({ error, loading: false }));
  };
  return (
    <Dialog onOpenChange={open => !open && onClose()} open>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        {state.error ? <FormError error={state.error} /> : null}
        <DialogFooter>
          <Button onClick={onClose} variant="ghost">
            {t('personal.back')}
          </Button>
          <Button disabled={state.loading} onClick={go} variant="destructive">
            {action}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BookingTypeCard({ onEdit, type }: { onEdit: () => void; type: BookingType }) {
  const { t } = useI18n();
  const toast = useToast();
  const [save] = useMutation(SaveBookingTypeDocument);
  const [remove] = useMutation(DeleteBookingTypeDocument, {
    refetchQueries: [BookingTypesDocument],
  });
  const [deleting, setDeleting] = useState(false);
  const { id } = type;

  const setActive = (active: boolean) =>
    save({
      optimisticResponse: { saveBookingType: { ...type, active } },
      variables: {
        id,
        input: {
          active,
          daysAhead: type.daysAhead,
          description: type.description,
          durationMinutes: type.durationMinutes,
          minNoticeMinutes: type.minNoticeMinutes,
          slug: type.slug,
          title: type.title,
          // Apollo's __typename must not go back as input.
          windows: type.windows.map(({ end, start, weekday }) => ({ end, start, weekday })),
        },
      },
    }).catch(() => toast({ message: t('personal.booking.saveFailed'), tone: 'error' }));

  const copy = () =>
    navigator.clipboard
      .writeText(linkOf(type.slug))
      .then(() => toast({ message: t('personal.booking.copied') }))
      .catch(() => undefined);

  return (
    <Card className="gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate font-semibold">{type.title}</h2>
          <p className="truncate text-sm text-muted-foreground">
            {type.durationMinutes} min · /book/{type.slug}
          </p>
        </div>
        <Switch
          aria-label={t('personal.booking.active')}
          checked={type.active}
          onCheckedChange={setActive}
        />
      </div>
      {!type.active && <Badge variant="secondary">{t('personal.booking.inactive')}</Badge>}
      <div className="flex flex-wrap gap-2">
        <Button onClick={copy} size="sm" variant="outline">
          <CopyIcon />
          {t('personal.booking.copy')}
        </Button>
        <Button asChild size="sm" variant="ghost">
          <a href={`/book/${type.slug}`} rel="noreferrer" target="_blank">
            <ExternalLinkIcon />
            {t('personal.booking.open')}
          </a>
        </Button>
        <Button
          aria-label={t('personal.booking.edit')}
          onClick={onEdit}
          size="icon-sm"
          variant="ghost"
        >
          <PencilIcon />
        </Button>
        <Button
          aria-label={t('personal.booking.delete')}
          onClick={() => setDeleting(true)}
          size="icon-sm"
          variant="ghost"
        >
          <Trash2Icon />
        </Button>
      </div>
      {deleting && (
        <Confirm
          action={t('personal.booking.delete')}
          message={t('personal.booking.deleteConfirm')}
          onClose={() => setDeleting(false)}
          run={() => remove({ variables: { id } })}
          title={type.title}
        />
      )}
    </Card>
  );
}

/** `/personal/calendar/booking`: the links others open to book time, and what they booked. */
export function BookingLinksPage() {
  const { language, t } = useI18n();
  const types = useQuery(BookingTypesDocument);
  const bookings = useQuery(BookingsDocument, { variables: { upcoming: true } });
  const [cancel] = useMutation(CancelBookingDocument, { refetchQueries: [BookingsDocument] });
  const [editing, setEditing] = useState<BookingType | null | undefined>(undefined);
  const [cancelling, setCancelling] = useState<{ guestName: string; id: string } | null>(null);

  if (types.loading && !types.data) return <PageSkeleton />;
  if (types.error)
    return <QueryError error={types.error} title={t('personal.booking.loadFailed')} />;

  const when = (instant: string) =>
    new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'pt-BR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(instant));

  return (
    <div className="flex flex-col gap-6">
      <Button asChild className="self-start" size="sm" variant="ghost">
        <Link to="/personal/calendar">
          <ArrowLeftIcon />
          {t('nav.calendar')}
        </Link>
      </Button>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeading subtitle={t('personal.booking.subtitle')}>
          {t('personal.booking.heading')}
        </PageHeading>
        <Button onClick={() => setEditing(null)}>
          <PlusIcon />
          {t('personal.booking.new')}
        </Button>
      </div>

      {types.data?.bookingTypes.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {types.data.bookingTypes.map(type => (
            <BookingTypeCard key={type.id} onEdit={() => setEditing(type)} type={type} />
          ))}
        </div>
      ) : (
        <Card className="items-center text-center text-muted-foreground">
          {t('personal.booking.empty')}
        </Card>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">{t('personal.booking.upcoming')}</h2>
        <Card className="gap-0 p-0">
          {bookings.data?.bookings.length ? (
            bookings.data.bookings.map(booking => (
              <div
                className="flex items-start justify-between gap-3 border-b p-4 last:border-b-0"
                key={booking.id}
              >
                <div className="min-w-0">
                  <p className="font-medium">
                    {booking.guestName} ·{' '}
                    <span className="text-muted-foreground">{booking.typeTitle}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {when(booking.startsAt)} · {booking.guestEmail}
                  </p>
                  {booking.note && (
                    <p className="mt-1 text-sm whitespace-pre-line">{booking.note}</p>
                  )}
                </div>
                <Button
                  aria-label={t('personal.booking.cancel')}
                  onClick={() => setCancelling(booking)}
                  size="sm"
                  variant="ghost"
                >
                  <XIcon />
                  {t('personal.booking.cancel')}
                </Button>
              </div>
            ))
          ) : (
            <p className="p-4 text-sm text-muted-foreground">{t('personal.booking.none')}</p>
          )}
        </Card>
      </section>

      {editing !== undefined && (
        <BookingTypeDialog onClose={() => setEditing(undefined)} type={editing} />
      )}
      {cancelling && (
        <Confirm
          action={t('personal.booking.cancel')}
          message={t('personal.booking.cancelConfirm')}
          onClose={() => setCancelling(null)}
          run={() => cancel({ variables: { id: cancelling.id } })}
          title={cancelling.guestName}
        />
      )}
    </div>
  );
}
