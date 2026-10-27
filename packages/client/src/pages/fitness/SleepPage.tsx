import { useMutation, useQuery } from '@apollo/client/react';
import {
  DeleteSleepLogDocument,
  SaveSleepLogDocument,
  SleepLogsDocument,
  type SleepLogFieldsFragment,
} from '@zapbots/graphql/client';
import { averageSleep, hoursLabel } from '@zapbots/fitness';
import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { Field, PageHeading } from '@zapbots/ui/blocks/field';
import { PageSkeleton } from '@zapbots/ui/blocks/page-skeleton';
import { Button } from '@zapbots/ui/components/button';
import { Card } from '@zapbots/ui/components/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@zapbots/ui/components/dialog';
import { Input } from '@zapbots/ui/components/input';
import { Textarea } from '@zapbots/ui/components/textarea';

import { FormError } from '../../components/FormError';
import { QueryError } from '../../components/QueryError';
import { useUndoableDelete } from '../../components/Toaster';
import { localToday } from '../../lib/bots';
import { useI18n } from '../../lib/i18n';
import { useDayLabel } from '../personal/shared';
import { QualityStars } from './shared';

type Night = SleepLogFieldsFragment;

/** A night under 8 hours fills this much of its bar; longer ones reach the end. */
const FULL_NIGHT = 10 * 60;

function NightDialog({ night, onClose }: { night: Night | null; onClose: () => void }) {
  const { t } = useI18n();
  const [wokeOn, setWokeOn] = useState(night?.wokeOn ?? localToday());
  const [bedTime, setBedTime] = useState(night?.bedTime ?? '23:00');
  const [wakeTime, setWakeTime] = useState(night?.wakeTime ?? '07:00');
  const [quality, setQuality] = useState<null | number>(night?.quality ?? null);
  const [notes, setNotes] = useState(night?.notes ?? '');
  const [save, saving] = useMutation(SaveSleepLogDocument, { refetchQueries: [SleepLogsDocument] });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    save({
      variables: { id: night?.id, input: { bedTime, notes, quality, wakeTime, wokeOn } },
    })
      .then(onClose)
      .catch(() => undefined);
  };

  return (
    <Dialog onOpenChange={open => !open && onClose()} open>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{night ? t('fitness.sleep.edit') : t('fitness.sleep.new')}</DialogTitle>
          <DialogDescription className="sr-only">{t('fitness.sleep.subtitle')}</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" id="night" onSubmit={submit}>
          <Field label={t('fitness.sleep.wokeOn')}>
            <Input onChange={e => setWokeOn(e.target.value)} required type="date" value={wokeOn} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('fitness.sleep.bedTime')}>
              <Input
                onChange={e => setBedTime(e.target.value)}
                required
                type="time"
                value={bedTime}
              />
            </Field>
            <Field label={t('fitness.sleep.wakeTime')}>
              <Input
                onChange={e => setWakeTime(e.target.value)}
                required
                type="time"
                value={wakeTime}
              />
            </Field>
          </div>
          <Field label={t('fitness.sleep.quality')}>
            <QualityStars onChange={setQuality} value={quality} />
          </Field>
          <Field label={t('fitness.notes')}>
            <Textarea onChange={e => setNotes(e.target.value)} rows={2} value={notes} />
          </Field>
          <FormError error={saving.error} />
        </form>
        <DialogFooter>
          <Button onClick={onClose} variant="ghost">
            {t('fitness.cancel')}
          </Button>
          <Button disabled={saving.loading} form="night" type="submit">
            {t('fitness.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** `/fitness/sleep`: the nights of the last 60 days, with the averages of 7 and 30. */
export function SleepPage() {
  const { t } = useI18n();
  const dayLabel = useDayLabel();
  const { data, error, loading } = useQuery(SleepLogsDocument, { variables: {} });
  const [deleteNight] = useMutation(DeleteSleepLogDocument, {
    refetchQueries: [SleepLogsDocument],
  });
  const { hidden, remove } = useUndoableDelete();
  const [editing, setEditing] = useState<Night | null | undefined>(undefined);

  if (error && !data) return <QueryError error={error} title={t('nav.sleep')} />;
  if (loading && !data) return <PageSkeleton />;
  if (!data) return null;

  const nights = data.sleepLogs.filter(night => !hidden.has(night.id));
  const today = localToday();
  const averages = [
    { label: t('fitness.sleep.average7'), value: averageSleep(nights.slice(0, 7)) },
    { label: t('fitness.sleep.average30'), value: averageSleep(nights.slice(0, 30)) },
  ];

  return (
    <div className="flex flex-col gap-6" data-area="fitness">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeading subtitle={t('fitness.sleep.subtitle')}>{t('nav.sleep')}</PageHeading>
        <Button onClick={() => setEditing(null)}>
          <PlusIcon />
          {t('fitness.sleep.new')}
        </Button>
      </div>

      {nights.length === 0 ? (
        <Card className="items-center text-center text-muted-foreground">
          {t('fitness.sleep.empty')}
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {averages.map(average => (
              <Card className="gap-1" key={average.label}>
                <p className="text-sm text-muted-foreground">{average.label}</p>
                <p className="text-3xl font-semibold tabular-nums">
                  {average.value === null ? '—' : hoursLabel(average.value)}
                </p>
              </Card>
            ))}
          </div>
          <section className="flex flex-col gap-3">
            <h2 className="font-semibold">{t('fitness.sleep.nights')}</h2>
            <Card className="gap-0 p-0">
              {nights.map(night => (
                <div
                  className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0"
                  key={night.id}
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                      <span className="font-medium capitalize">
                        {dayLabel(night.wokeOn, today)}
                      </span>
                      <span className="text-muted-foreground tabular-nums">
                        {night.bedTime} → {night.wakeTime} ·{' '}
                        <span className="font-semibold text-foreground">
                          {hoursLabel(night.minutes)}
                        </span>
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-area-fitness/15">
                      <div
                        className="h-full rounded-full bg-area-fitness"
                        style={{ width: `${Math.min(100, (night.minutes / FULL_NIGHT) * 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <QualityStars value={night.quality} />
                      {night.notes && (
                        <span className="truncate text-xs text-muted-foreground">
                          {night.notes}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0">
                    <Button
                      aria-label={t('fitness.edit')}
                      onClick={() => setEditing(night)}
                      size="icon-sm"
                      variant="ghost"
                    >
                      <PencilIcon />
                    </Button>
                    <Button
                      aria-label={t('fitness.delete')}
                      onClick={() =>
                        remove({
                          commit: () => deleteNight({ variables: { id: night.id } }),
                          ids: [night.id],
                          message: t('fitness.deleted'),
                        })
                      }
                      size="icon-sm"
                      variant="ghost"
                    >
                      <Trash2Icon />
                    </Button>
                  </div>
                </div>
              ))}
            </Card>
          </section>
        </>
      )}

      {editing !== undefined && (
        <NightDialog night={editing} onClose={() => setEditing(undefined)} />
      )}
    </div>
  );
}
