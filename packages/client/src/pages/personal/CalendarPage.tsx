import { useMutation, useQuery } from '@apollo/client/react';
import {
  AgendaDocument,
  CreateEventDocument,
  DeleteEventDocument,
  EventDocument,
  UpdateEventDocument,
  type AgendaQuery,
  type EventFieldsFragment,
} from '@zapbots/graphql/client';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { Field, PageHeading } from '@zapbots/ui/blocks/field';
import { PageSkeleton } from '@zapbots/ui/blocks/page-skeleton';
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
import { Label } from '@zapbots/ui/components/label';
import { Tabs, TabsList, TabsTrigger } from '@zapbots/ui/components/tabs';
import { Textarea } from '@zapbots/ui/components/textarea';
import { cn } from '@zapbots/ui/lib/utils';

import { FormError } from '../../components/FormError';
import { QueryError } from '../../components/QueryError';
import { useUndoableDelete } from '../../components/Toaster';
import { localToday } from '../../lib/bots';
import { useI18n } from '../../lib/i18n';
import {
  addDays,
  AgendaLine,
  KIND_DOT,
  monthTitle,
  RepeatField,
  repeatInput,
  useDayLabel,
  weekdayNames,
  type RepeatValue,
} from './shared';

type Item = AgendaQuery['agenda'][number];

/** How many days the list view shows from today. */
const LIST_DAYS = 30;

/** The 6 weeks of the month view, Sunday first. */
function monthGrid(month: string): string[] {
  const first = `${month}-01`;
  const weekday = new Date(`${first}T12:00:00Z`).getUTCDay();
  const start = addDays(first, -weekday);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

const nextMonth = (month: string, by: number) => addDays(`${month}-15`, by * 30).slice(0, 7);

interface Draft {
  allDay: boolean;
  endTime: string;
  endsOn: string;
  location: string;
  notes: string;
  repeat: null | RepeatValue;
  startTime: string;
  startsOn: string;
  title: string;
}

const draftOf = (event?: EventFieldsFragment, day?: string): Draft => ({
  allDay: event ? !event.startTime : true,
  endTime: event?.endTime ?? '',
  endsOn: event?.endsOn ?? '',
  location: event?.location ?? '',
  notes: event?.notes ?? '',
  repeat: event?.repeat ?? null,
  startTime: event?.startTime ?? '09:00',
  startsOn: event?.startsOn ?? day ?? localToday(),
  title: event?.title ?? '',
});

/** An Evento's form: new on `day`, or to correct, with deleting it. */
function EventDialog({
  day,
  event,
  onClose,
  onDelete,
}: {
  day?: string;
  event?: EventFieldsFragment;
  onClose: () => void;
  onDelete: (event: EventFieldsFragment) => void;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(() => draftOf(event, day));
  const set = (change: Partial<Draft>) => setDraft(current => ({ ...current, ...change }));
  const [create, created] = useMutation(CreateEventDocument, { refetchQueries: 'active' });
  const [update, updated] = useMutation(UpdateEventDocument, { refetchQueries: 'active' });

  const submit = async (form: FormEvent) => {
    form.preventDefault();
    const input = {
      endTime: draft.allDay ? null : draft.endTime || null,
      endsOn: draft.endsOn || null,
      location: draft.location,
      notes: draft.notes,
      repeat: repeatInput(draft.repeat),
      startTime: draft.allDay ? null : draft.startTime || null,
      startsOn: draft.startsOn,
      title: draft.title,
    };
    const result = await (
      event ? update({ variables: { id: event.id, input } }) : create({ variables: { input } })
    ).catch(() => null);
    if (result?.data) onClose();
  };

  return (
    <Dialog onOpenChange={open => !open && onClose()} open>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{event ? t('personal.events.edit') : t('personal.events.new')}</DialogTitle>
          {event?.repeat && (
            <DialogDescription>{t('personal.events.wholeSeries')}</DialogDescription>
          )}
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={form => void submit(form)}>
          <Field label={t('personal.title')}>
            <Input
              autoFocus
              maxLength={200}
              onChange={change => set({ title: change.target.value })}
              value={draft.title}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('personal.events.day')}>
              <Input
                onChange={change => set({ startsOn: change.target.value })}
                required
                type="date"
                value={draft.startsOn}
              />
            </Field>
            <Field label={t('personal.events.until')}>
              <Input
                min={draft.startsOn}
                onChange={change => set({ endsOn: change.target.value })}
                type="date"
                value={draft.endsOn}
              />
            </Field>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={draft.allDay}
              id="event-all-day"
              onCheckedChange={checked => set({ allDay: checked === true })}
            />
            <Label htmlFor="event-all-day">{t('personal.events.allDay')}</Label>
          </div>
          {!draft.allDay && (
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('personal.events.start')}>
                <Input
                  onChange={change => set({ startTime: change.target.value })}
                  type="time"
                  value={draft.startTime}
                />
              </Field>
              <Field label={t('personal.events.end')}>
                <Input
                  onChange={change => set({ endTime: change.target.value })}
                  type="time"
                  value={draft.endTime}
                />
              </Field>
            </div>
          )}
          <RepeatField onChange={repeat => set({ repeat })} value={draft.repeat} />
          <Field label={t('personal.events.location')}>
            <Input
              maxLength={200}
              onChange={change => set({ location: change.target.value })}
              value={draft.location}
            />
          </Field>
          <Field label={t('personal.notes')}>
            <Textarea
              onChange={change => set({ notes: change.target.value })}
              rows={3}
              value={draft.notes}
            />
          </Field>
          {(created.error || updated.error) && <FormError error={created.error ?? updated.error} />}
          <DialogFooter className="sm:justify-between">
            {event ? (
              <Button
                onClick={() => {
                  onDelete(event);
                  onClose();
                }}
                type="button"
                variant="ghost"
              >
                <Trash2Icon />
                {t('personal.delete')}
              </Button>
            ) : (
              <span />
            )}
            <Button
              disabled={created.loading || updated.loading || !draft.title.trim()}
              type="submit"
            >
              {t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Opens a saved Evento's form once it is read. */
function EditEvent({
  id,
  onClose,
  onDelete,
}: {
  id: string;
  onClose: () => void;
  onDelete: (event: EventFieldsFragment) => void;
}) {
  const { data } = useQuery(EventDocument, { variables: { id } });
  if (!data?.event) return null;
  return <EventDialog event={data.event} onClose={onClose} onDelete={onDelete} />;
}

/**
 * Agenda: the month (or the next 30 days as a list) with the Eventos, the Tarefas due and the
 * bills from Finanças on their days. A day picked shows its lines below with "Novo evento";
 * an Evento opens its form, a Tarefa or a bill its own screen.
 */
export function CalendarPage() {
  const { language, t } = useI18n();
  const navigate = useNavigate();
  const dayLabel = useDayLabel();
  const [params, setParams] = useSearchParams();
  const today = localToday();
  const month = params.get('m') ?? today.slice(0, 7);
  const view = params.get('v') === 'list' ? 'list' : 'month';
  const [picked, setPicked] = useState(today);
  const [creating, setCreating] = useState<null | string>(null);
  const grid = monthGrid(month);
  const from = view === 'list' ? today : grid[0]!;
  const to = view === 'list' ? addDays(today, LIST_DAYS) : grid[grid.length - 1]!;
  const { data, error, loading } = useQuery(AgendaDocument, {
    fetchPolicy: 'cache-and-network',
    variables: { from, to },
  });
  const [removeEvent] = useMutation(DeleteEventDocument, { refetchQueries: 'active' });
  const { hidden, remove } = useUndoableDelete();

  const set = (change: Record<string, null | string>) =>
    setParams(current => {
      const next = new URLSearchParams(current);
      for (const [key, value] of Object.entries(change)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      return next;
    });

  if (error && !data) return <QueryError error={error} title={t('nav.calendar')} />;
  if (loading && !data) return <PageSkeleton />;

  const items = (data?.agenda ?? []).filter(item => !hidden.has(item.id));
  const byDay = new Map<string, Item[]>();
  for (const item of items) byDay.set(item.date, [...(byDay.get(item.date) ?? []), item]);
  const editing = params.get('e');

  const openItem = (item: Item) => {
    if (item.kind === 'EVENT') set({ e: item.id });
    else navigate(item.link);
  };
  const deleteEvent = (event: EventFieldsFragment) =>
    remove({
      commit: () => removeEvent({ variables: { id: event.id } }),
      ids: [event.id],
      message: t('personal.events.deleted', { title: event.title }),
    });

  const pickedItems = byDay.get(picked) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeading subtitle={t('personal.calendar.subtitle')}>{t('nav.calendar')}</PageHeading>
        <div className="flex items-center gap-2">
          <Tabs onValueChange={value => set({ v: value === 'list' ? 'list' : null })} value={view}>
            <TabsList>
              <TabsTrigger value="month">{t('personal.calendar.month')}</TabsTrigger>
              <TabsTrigger value="list">{t('personal.calendar.list')}</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => setCreating(view === 'month' ? picked : today)}>
            <PlusIcon />
            {t('personal.events.new')}
          </Button>
        </div>
      </div>

      {view === 'month' ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="gap-4 p-4 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold capitalize">{monthTitle(month, language)}</h2>
              <div className="flex items-center gap-1">
                <Button
                  onClick={() => {
                    set({ m: null });
                    setPicked(today);
                  }}
                  size="sm"
                  variant="ghost"
                >
                  {t('personal.today')}
                </Button>
                <Button
                  aria-label={t('personal.calendar.previous')}
                  onClick={() => set({ m: nextMonth(month, -1) })}
                  size="icon"
                  variant="ghost"
                >
                  <ChevronLeftIcon />
                </Button>
                <Button
                  aria-label={t('personal.calendar.next')}
                  onClick={() => set({ m: nextMonth(month, 1) })}
                  size="icon"
                  variant="ghost"
                >
                  <ChevronRightIcon />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-7 text-center text-xs text-muted-foreground">
              {weekdayNames(language).map(name => (
                <span className="py-1 capitalize" key={name}>
                  {name.replace('.', '')}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border bg-border">
              {grid.map(date => {
                const dayItems = byDay.get(date) ?? [];
                const outside = date.slice(0, 7) !== month;
                return (
                  <button
                    aria-label={dayLabel(date, today)}
                    aria-pressed={date === picked}
                    className={cn(
                      'flex min-h-14 flex-col gap-1 bg-card p-1.5 text-left hover:bg-muted/60 md:min-h-24',
                      outside && 'bg-muted/40 text-muted-foreground',
                      date === picked && 'ring-2 ring-primary ring-inset'
                    )}
                    key={date}
                    onClick={() => setPicked(date)}
                    onDoubleClick={() => setCreating(date)}
                    type="button"
                  >
                    <span
                      className={cn(
                        'grid size-6 place-items-center rounded-full text-xs tabular-nums',
                        date === today && 'bg-primary font-semibold text-primary-foreground'
                      )}
                    >
                      {Number(date.slice(8))}
                    </span>
                    <span className="flex flex-wrap gap-1 md:hidden">
                      {dayItems.slice(0, 4).map(item => (
                        <span
                          className={cn('size-1.5 rounded-full', KIND_DOT[item.kind])}
                          key={`${item.kind}${item.id}`}
                        />
                      ))}
                    </span>
                    <span className="hidden flex-col gap-0.5 md:flex">
                      {dayItems.slice(0, 3).map(item => (
                        <span
                          className="flex items-center gap-1 truncate text-[11px] leading-tight"
                          key={`${item.kind}${item.id}`}
                        >
                          <span
                            className={cn('size-1.5 shrink-0 rounded-full', KIND_DOT[item.kind])}
                          />
                          <span className={cn('truncate', item.done && 'line-through')}>
                            {item.title}
                          </span>
                        </span>
                      ))}
                      {dayItems.length > 3 && (
                        <span className="text-[11px] text-muted-foreground">
                          {t('home.more', { count: String(dayItems.length - 3) })}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>
          <Card className="gap-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold first-letter:uppercase">{dayLabel(picked, today)}</h2>
              <Button onClick={() => setCreating(picked)} size="sm" variant="ghost">
                <PlusIcon />
                {t('personal.events.short')}
              </Button>
            </div>
            {pickedItems.length ? (
              <ul className="flex flex-col">
                {pickedItems.map(item => (
                  <AgendaLine item={item} key={`${item.kind}${item.id}`} onOpen={openItem} />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">{t('personal.calendar.free')}</p>
            )}
            <Legend />
          </Card>
        </div>
      ) : (
        <Card className="gap-5">
          {byDay.size === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t('personal.calendar.nothing')}
            </p>
          ) : (
            [...byDay].map(([date, dayItems]) => (
              <section className="flex flex-col gap-1" key={date}>
                <h2 className="px-2 text-xs font-medium text-muted-foreground uppercase">
                  {dayLabel(date, today)}
                </h2>
                <ul className="flex flex-col">
                  {dayItems.map(item => (
                    <AgendaLine item={item} key={`${item.kind}${item.id}`} onOpen={openItem} />
                  ))}
                </ul>
              </section>
            ))
          )}
          <Legend />
        </Card>
      )}

      {creating && (
        <EventDialog day={creating} onClose={() => setCreating(null)} onDelete={deleteEvent} />
      )}
      {editing && (
        <EditEvent
          id={editing}
          key={editing}
          onClose={() => set({ e: null })}
          onDelete={deleteEvent}
        />
      )}
    </div>
  );
}

/** What each colour means, with where bills come from. */
function Legend() {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 border-t pt-3 text-xs text-muted-foreground">
      {(['EVENT', 'TASK', 'DUE'] as const).map(kind => (
        <span className="inline-flex items-center gap-1.5" key={kind}>
          <span className={cn('size-2 rounded-full', KIND_DOT[kind])} />
          {t(`personal.calendar.kind.${kind}`)}
        </span>
      ))}
      <Link className="ml-auto text-primary hover:underline" to="/personal/tasks">
        {t('nav.tasks')}
      </Link>
    </div>
  );
}
