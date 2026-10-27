import { useMutation, useQuery } from '@apollo/client/react';
import {
  AddMeasurementDocument,
  DeleteMeasurementDocument,
  MeasurementsDocument,
  type MeasureKind,
} from '@zapbots/graphql/client';
import { formatMeasure, MEASURE_KINDS, MEASURE_UNITS, measureTrend } from '@zapbots/fitness';
import { PlusIcon, Trash2Icon } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@zapbots/ui/components/select';

import { FormError } from '../../components/FormError';
import { QueryError } from '../../components/QueryError';
import { useUndoableDelete } from '../../components/Toaster';
import { localToday } from '../../lib/bots';
import { useI18n } from '../../lib/i18n';
import { useDayLabel } from '../personal/shared';
import { Sparkline } from './shared';

function MeasureDialog({ kind: initial, onClose }: { kind: MeasureKind; onClose: () => void }) {
  const { t } = useI18n();
  const [kind, setKind] = useState<MeasureKind>(initial);
  const [measuredOn, setMeasuredOn] = useState(localToday());
  const [value, setValue] = useState('');
  const [add, adding] = useMutation(AddMeasurementDocument, {
    refetchQueries: [MeasurementsDocument],
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    add({ variables: { input: { kind, measuredOn, value } } })
      .then(onClose)
      .catch(() => undefined);
  };

  return (
    <Dialog onOpenChange={open => !open && onClose()} open>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('fitness.measures.new')}</DialogTitle>
          <DialogDescription className="sr-only">
            {t('fitness.measures.subtitle')}
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" id="measure" onSubmit={submit}>
          <Field label={t('fitness.measures.kind')}>
            <Select onValueChange={next => setKind(next as MeasureKind)} value={kind}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEASURE_KINDS.map(option => (
                  <SelectItem key={option} value={option}>
                    {t(`fitness.measures.kind.${option}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('fitness.measures.value', { unit: MEASURE_UNITS[kind].unit })}>
              <Input
                autoFocus
                inputMode="decimal"
                onChange={e => setValue(e.target.value)}
                placeholder={kind === 'WEIGHT' ? '72,5' : kind === 'BODY_FAT' ? '18' : '80'}
                required
                value={value}
              />
            </Field>
            <Field label={t('fitness.date')}>
              <Input
                onChange={e => setMeasuredOn(e.target.value)}
                required
                type="date"
                value={measuredOn}
              />
            </Field>
          </div>
          <FormError error={adding.error} />
        </form>
        <DialogFooter>
          <Button onClick={onClose} variant="ghost">
            {t('fitness.cancel')}
          </Button>
          <Button disabled={adding.loading} form="measure" type="submit">
            {t('fitness.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** `/fitness/measures`: each kind of Medida with its last value, its month and its history. */
export function MeasuresPage() {
  const { language, t } = useI18n();
  const locale = language === 'pt' ? 'pt-BR' : 'en-US';
  const dayLabel = useDayLabel();
  const { data, error, loading } = useQuery(MeasurementsDocument);
  const [deleteMeasure] = useMutation(DeleteMeasurementDocument, {
    refetchQueries: [MeasurementsDocument],
  });
  const { hidden, remove } = useUndoableDelete();
  const [adding, setAdding] = useState<MeasureKind | null>(null);

  if (error && !data) return <QueryError error={error} title={t('nav.measures')} />;
  if (loading && !data) return <PageSkeleton />;
  if (!data) return null;

  const points = data.measurements.filter(point => !hidden.has(point.id));
  const kinds = MEASURE_KINDS.filter(kind => points.some(point => point.kind === kind));
  const today = localToday();
  const signed = (kind: MeasureKind, change: number) =>
    `${change > 0 ? '+' : change < 0 ? '−' : ''}${formatMeasure(kind, Math.abs(change), locale)}`;

  return (
    <div className="flex flex-col gap-6" data-area="fitness">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeading subtitle={t('fitness.measures.subtitle')}>{t('nav.measures')}</PageHeading>
        <Button onClick={() => setAdding('WEIGHT')}>
          <PlusIcon />
          {t('fitness.measures.new')}
        </Button>
      </div>

      {kinds.length === 0 ? (
        <Card className="items-center text-center text-muted-foreground">
          {t('fitness.measures.empty')}
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {kinds.map(kind => {
              const trend = measureTrend(points, kind)!;
              const series = points.filter(point => point.kind === kind);
              return (
                <Card className="gap-2" key={kind}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm text-muted-foreground">
                      {t(`fitness.measures.kind.${kind}`)}
                    </p>
                    <Button
                      aria-label={t('fitness.measures.new')}
                      onClick={() => setAdding(kind)}
                      size="icon-sm"
                      variant="ghost"
                    >
                      <PlusIcon />
                    </Button>
                  </div>
                  <p className="text-3xl font-semibold tabular-nums">
                    {formatMeasure(kind, trend.latest.value, locale)}
                  </p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {dayLabel(trend.latest.measuredOn, today)}
                    {trend.change !== null &&
                      ` · ${t('fitness.measures.change', { change: signed(kind, trend.change) })}`}
                  </p>
                  <Sparkline values={series.slice(-30).map(point => point.value)} />
                </Card>
              );
            })}
          </div>

          <section className="flex flex-col gap-3">
            <h2 className="font-semibold">{t('fitness.measures.history')}</h2>
            <Card className="gap-0 p-0">
              {[...points]
                .reverse()
                .slice(0, 100)
                .map(point => (
                  <div
                    className="flex items-center justify-between gap-3 border-b px-4 py-2.5 last:border-b-0"
                    key={point.id}
                  >
                    <span className="text-sm">
                      <span className="font-medium">
                        {t(`fitness.measures.kind.${point.kind}`)}
                      </span>
                      <span className="text-muted-foreground capitalize">
                        {' · '}
                        {dayLabel(point.measuredOn, today)}
                      </span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="text-sm tabular-nums">
                        {formatMeasure(point.kind, point.value, locale)}
                      </span>
                      <Button
                        aria-label={t('fitness.delete')}
                        onClick={() =>
                          remove({
                            commit: () => deleteMeasure({ variables: { id: point.id } }),
                            ids: [point.id],
                            message: t('fitness.deleted'),
                          })
                        }
                        size="icon-sm"
                        variant="ghost"
                      >
                        <Trash2Icon />
                      </Button>
                    </span>
                  </div>
                ))}
            </Card>
          </section>
        </>
      )}

      {adding && <MeasureDialog kind={adding} onClose={() => setAdding(null)} />}
    </div>
  );
}
