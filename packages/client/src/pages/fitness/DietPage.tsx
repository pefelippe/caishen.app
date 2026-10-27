import { useMutation, useQuery } from '@apollo/client/react';
import {
  CreateMealDocument,
  DeleteMealDocument,
  MealsDocument,
  UpdateMealDocument,
  type MealFieldsFragment,
  type MealKind,
} from '@zapbots/graphql/client';
import { kcalOfMacros, totalMacros } from '@zapbots/fitness';
import { isIsoDate } from '@zapbots/personal';
import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';

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
import { DayPicker, MacroMeter, MACROS, MEAL_KINDS, wholeOrNull } from './shared';

type Meal = MealFieldsFragment;

function MealDialog({
  date,
  meal,
  onClose,
}: {
  date: string;
  meal: Meal | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [description, setDescription] = useState(meal?.description ?? '');
  const [kind, setKind] = useState<MealKind>(meal?.kind ?? 'OTHER');
  const [time, setTime] = useState(meal?.time ?? '');
  const [eatenOn, setEatenOn] = useState(meal?.eatenOn ?? date);
  const [values, setValues] = useState(() => ({
    carbsG: meal ? String(meal.carbsG) : '',
    fatG: meal ? String(meal.fatG) : '',
    kcal: meal ? String(meal.kcal) : '',
    proteinG: meal ? String(meal.proteinG) : '',
  }));
  const options = { refetchQueries: [MealsDocument] };
  const [create, creating] = useMutation(CreateMealDocument, options);
  const [update, updating] = useMutation(UpdateMealDocument, options);
  const fromMacros = kcalOfMacros({
    carbsG: Number(values.carbsG) || 0,
    fatG: Number(values.fatG) || 0,
    proteinG: Number(values.proteinG) || 0,
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const input = {
      carbsG: wholeOrNull(values.carbsG),
      description,
      eatenOn,
      fatG: wholeOrNull(values.fatG),
      // Without kcal typed, the macros' own.
      kcal: wholeOrNull(values.kcal) ?? (fromMacros || null),
      kind,
      proteinG: wholeOrNull(values.proteinG),
      time: time || null,
    };
    (meal ? update({ variables: { id: meal.id, input } }) : create({ variables: { input } }))
      .then(onClose)
      .catch(() => undefined);
  };

  return (
    <Dialog onOpenChange={open => !open && onClose()} open>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{meal ? t('fitness.meals.edit') : t('fitness.meals.new')}</DialogTitle>
          <DialogDescription className="sr-only">{t('fitness.meals.subtitle')}</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" id="meal" onSubmit={submit}>
          <Field label={t('fitness.meals.description')}>
            <Input
              autoFocus
              onChange={e => setDescription(e.target.value)}
              placeholder={t('fitness.meals.descriptionPlaceholder')}
              required
              value={description}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('fitness.meals.kind')}>
              <Select onValueChange={value => setKind(value as MealKind)} value={kind}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEAL_KINDS.map(option => (
                    <SelectItem key={option} value={option}>
                      {t(`fitness.meals.kind.${option}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t('fitness.meals.time')}>
              <Input onChange={e => setTime(e.target.value)} type="time" value={time} />
            </Field>
          </div>
          <Field label={t('fitness.date')}>
            <Input
              onChange={e => setEatenOn(e.target.value)}
              required
              type="date"
              value={eatenOn}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {MACROS.map(macro => (
              <label className="flex flex-col gap-1 text-xs text-muted-foreground" key={macro.key}>
                {t(macro.label)}
                <Input
                  inputMode="numeric"
                  min={0}
                  onChange={e =>
                    setValues(current => ({ ...current, [macro.key]: e.target.value }))
                  }
                  placeholder={macro.key === 'kcal' && fromMacros ? String(fromMacros) : undefined}
                  type="number"
                  value={values[macro.key]}
                />
              </label>
            ))}
          </div>
          {fromMacros > 0 && (
            <p className="text-xs text-muted-foreground">
              {t('fitness.meals.fromMacros', { kcal: fromMacros })}
            </p>
          )}
          <FormError error={creating.error ?? updating.error} />
        </form>
        <DialogFooter>
          <Button onClick={onClose} variant="ghost">
            {t('fitness.cancel')}
          </Button>
          <Button disabled={creating.loading || updating.loading} form="meal" type="submit">
            {t('fitness.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** `/fitness/diet`: the Refeições of a day (`?d=`), grouped by kind, against the macro targets. */
export function DietPage() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const requested = params.get('d');
  const date = requested && isIsoDate(requested) ? requested : localToday();
  const { data, error, loading } = useQuery(MealsDocument, { variables: { from: date, to: date } });
  const [deleteMeal] = useMutation(DeleteMealDocument, { refetchQueries: [MealsDocument] });
  const { hidden, remove } = useUndoableDelete();
  const [editing, setEditing] = useState<Meal | null | undefined>(undefined);

  const go = (next: string) =>
    setParams(next === localToday() ? {} : { d: next }, { replace: true });

  if (error && !data) return <QueryError error={error} title={t('nav.meals')} />;
  if (loading && !data) return <PageSkeleton />;

  const meals = (data?.meals ?? []).filter(meal => !hidden.has(meal.id));
  const totals = totalMacros(meals);
  const target = data?.macroTarget;

  return (
    <div className="flex flex-col gap-6" data-area="fitness">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeading subtitle={t('fitness.meals.subtitle')}>{t('nav.meals')}</PageHeading>
        <Button onClick={() => setEditing(null)}>
          <PlusIcon />
          {t('fitness.meals.new')}
        </Button>
      </div>
      <DayPicker date={date} onChange={go} />

      <Card className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {MACROS.map(macro => (
          <MacroMeter
            key={macro.key}
            label={t(macro.short)}
            target={target?.[macro.key]}
            unit={macro.unit}
            value={totals[macro.key]}
          />
        ))}
      </Card>

      {meals.length === 0 ? (
        <Card className="items-center text-center text-muted-foreground">
          {t('fitness.meals.empty')}
        </Card>
      ) : (
        MEAL_KINDS.map(kind => {
          const ofKind = meals.filter(meal => meal.kind === kind);
          if (ofKind.length === 0) return null;
          return (
            <section className="flex flex-col gap-2" key={kind}>
              <h2 className="font-semibold">{t(`fitness.meals.kind.${kind}`)}</h2>
              <Card className="gap-0 p-0">
                {ofKind.map(meal => (
                  <div
                    className="flex items-center justify-between gap-3 border-b px-4 py-3 last:border-b-0"
                    key={meal.id}
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {meal.time && (
                          <span className="mr-2 text-sm text-muted-foreground tabular-nums">
                            {meal.time}
                          </span>
                        )}
                        {meal.description}
                      </p>
                      <p className="text-sm text-muted-foreground tabular-nums">
                        {meal.kcal} kcal · P {meal.proteinG} g · C {meal.carbsG} g · G {meal.fatG} g
                      </p>
                    </div>
                    <div className="flex shrink-0">
                      <Button
                        aria-label={t('fitness.edit')}
                        onClick={() => setEditing(meal)}
                        size="icon-sm"
                        variant="ghost"
                      >
                        <PencilIcon />
                      </Button>
                      <Button
                        aria-label={t('fitness.delete')}
                        onClick={() =>
                          remove({
                            commit: () => deleteMeal({ variables: { id: meal.id } }),
                            ids: [meal.id],
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
          );
        })
      )}

      {editing !== undefined && (
        <MealDialog date={date} meal={editing} onClose={() => setEditing(undefined)} />
      )}
    </div>
  );
}
