import { useMutation, useQuery } from '@apollo/client/react';
import {
  MacrosDocument,
  SetMacroTargetDocument,
  type MacroTargetFieldsFragment,
} from '@zapbots/graphql/client';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { PageHeading } from '@zapbots/ui/blocks/field';
import { PageSkeleton } from '@zapbots/ui/blocks/page-skeleton';
import { Button } from '@zapbots/ui/components/button';
import { Card } from '@zapbots/ui/components/card';
import { Input } from '@zapbots/ui/components/input';
import { Tabs, TabsList, TabsTrigger } from '@zapbots/ui/components/tabs';
import { cn } from '@zapbots/ui/lib/utils';

import { FormError } from '../../components/FormError';
import { QueryError } from '../../components/QueryError';
import { useToast } from '../../components/Toaster';
import { localToday } from '../../lib/bots';
import { useI18n } from '../../lib/i18n';
import { addDays, useDayLabel } from '../personal/shared';
import { MacroMeter, MACROS, wholeOrNull } from './shared';

function TargetsForm({ target }: { target: MacroTargetFieldsFragment | null | undefined }) {
  const { t } = useI18n();
  const toast = useToast();
  const [values, setValues] = useState(() =>
    Object.fromEntries(MACROS.map(macro => [macro.key, target?.[macro.key]?.toString() ?? '']))
  );
  const [save, saving] = useMutation(SetMacroTargetDocument, { refetchQueries: [MacrosDocument] });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    save({
      variables: {
        input: Object.fromEntries(
          MACROS.map(macro => [macro.key, wholeOrNull(values[macro.key] ?? '')])
        ),
      },
    })
      .then(() => toast({ message: t('fitness.macros.saved') }))
      .catch(() => undefined);
  };

  return (
    <Card className="gap-4">
      <div>
        <h2 className="font-semibold">{t('fitness.macros.targets')}</h2>
        <p className="text-sm text-muted-foreground">{t('fitness.macros.targetsHint')}</p>
      </div>
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {MACROS.map(macro => (
            <label className="flex flex-col gap-1 text-sm text-muted-foreground" key={macro.key}>
              {t(macro.label)}
              <Input
                inputMode="numeric"
                min={0}
                onChange={e => setValues(current => ({ ...current, [macro.key]: e.target.value }))}
                type="number"
                value={values[macro.key]}
              />
            </label>
          ))}
        </div>
        <FormError error={saving.error} />
        <Button className="self-start" disabled={saving.loading} type="submit">
          {t('fitness.save')}
        </Button>
      </form>
    </Card>
  );
}

/** `/fitness/macros`: the daily targets, and each day of the last 7 or 30 against them. */
export function MacrosPage() {
  const { language, t } = useI18n();
  const dayLabel = useDayLabel();
  const [span, setSpan] = useState<7 | 30>(7);
  const today = localToday();
  const { data, error, loading } = useQuery(MacrosDocument, {
    variables: { from: addDays(today, -(span - 1)), to: today },
  });

  if (error && !data) return <QueryError error={error} title={t('nav.macros')} />;
  if (loading && !data) return <PageSkeleton />;
  if (!data) return null;

  const target = data.macroTarget;
  const days = [...data.macroDays].reverse();
  const eaten = days.filter(day => day.meals > 0);
  const average = (key: (typeof MACROS)[number]['key']) =>
    eaten.length ? Math.round(eaten.reduce((sum, day) => sum + day[key], 0) / eaten.length) : 0;
  const number = (n: number) => n.toLocaleString(language === 'pt' ? 'pt-BR' : 'en-US');

  return (
    <div className="flex flex-col gap-6" data-area="fitness">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeading subtitle={t('fitness.macros.subtitle')}>{t('nav.macros')}</PageHeading>
        <Tabs onValueChange={value => setSpan(value === '30' ? 30 : 7)} value={String(span)}>
          <TabsList>
            <TabsTrigger value="7">{t('fitness.macros.last7')}</TabsTrigger>
            <TabsTrigger value="30">{t('fitness.macros.last30')}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <TargetsForm key={JSON.stringify(target)} target={target} />

      <Card className="gap-4">
        <h2 className="font-semibold">{t('fitness.macros.average')}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MACROS.map(macro => (
            <MacroMeter
              key={macro.key}
              label={t(macro.short)}
              target={target?.[macro.key]}
              unit={macro.unit}
              value={average(macro.key)}
            />
          ))}
        </div>
      </Card>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">{t('fitness.macros.days')}</h2>
        <Card className="gap-0 p-0">
          {days.map(day => {
            const percent = target?.kcal ? Math.min(100, (day.kcal / target.kcal) * 100) : null;
            return (
              <Link
                className="flex flex-col gap-1.5 border-b px-4 py-3 last:border-b-0 hover:bg-muted/60"
                key={day.date}
                to={day.date === today ? '/fitness/diet' : `/fitness/diet?d=${day.date}`}
              >
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium capitalize">{dayLabel(day.date, today)}</span>
                  {day.meals ? (
                    <span className="text-muted-foreground tabular-nums">
                      <span
                        className={cn(
                          'font-semibold text-foreground',
                          target?.kcal && day.kcal > target.kcal && 'text-warning'
                        )}
                      >
                        {number(day.kcal)} kcal
                      </span>
                      {' · '}P {day.proteinG} · C {day.carbsG} · G {day.fatG}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">{t('fitness.macros.noMeals')}</span>
                  )}
                </div>
                {percent !== null && day.meals > 0 && (
                  <div className="h-1.5 overflow-hidden rounded-full bg-area-fitness/15">
                    <div
                      className="h-full rounded-full bg-area-fitness"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                )}
              </Link>
            );
          })}
        </Card>
      </section>
    </div>
  );
}
