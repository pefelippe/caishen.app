import { useMutation, useQuery } from '@apollo/client/react';
import {
  DeleteWorkoutPlanDocument,
  DeleteWorkoutSessionDocument,
  LogWorkoutDocument,
  SaveWorkoutPlanDocument,
  WorkoutsDocument,
  type WorkoutPlanFieldsFragment,
} from '@zapbots/graphql/client';
import { formatDecimal } from '@zapbots/fitness';
import { CheckIcon, PencilIcon, PlusIcon, Trash2Icon, XIcon } from 'lucide-react';
import { useState, type FormEvent } from 'react';

import { Field, PageHeading } from '@zapbots/ui/blocks/field';
import { PageSkeleton } from '@zapbots/ui/blocks/page-skeleton';
import { Badge } from '@zapbots/ui/components/badge';
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
import { Textarea } from '@zapbots/ui/components/textarea';

import { FormError } from '../../components/FormError';
import { QueryError } from '../../components/QueryError';
import { useToast, useUndoableDelete } from '../../components/Toaster';
import { localToday } from '../../lib/bots';
import { useI18n } from '../../lib/i18n';
import { useDayLabel, weekdayNames } from '../personal/shared';
import { wholeOrNull, WeekdayPicker } from './shared';

type Plan = WorkoutPlanFieldsFragment;

interface ExerciseDraft {
  load: string;
  name: string;
  reps: string;
  rest: string;
  sets: string;
}

const blankExercise = (): ExerciseDraft => ({ load: '', name: '', reps: '', rest: '', sets: '3' });

function PlanDialog({ onClose, plan }: { onClose: () => void; plan: null | Plan }) {
  const { language, t } = useI18n();
  const locale = language === 'pt' ? 'pt-BR' : 'en-US';
  const [name, setName] = useState(plan?.name ?? '');
  const [notes, setNotes] = useState(plan?.notes ?? '');
  const [weekdays, setWeekdays] = useState<number[]>(plan?.weekdays ?? []);
  const [exercises, setExercises] = useState<ExerciseDraft[]>(() =>
    plan?.exercises.length
      ? plan.exercises.map(exercise => ({
          load:
            exercise.loadGrams === null || exercise.loadGrams === undefined
              ? ''
              : formatDecimal(exercise.loadGrams, 3, locale),
          name: exercise.name,
          reps: exercise.reps,
          rest: exercise.restSeconds?.toString() ?? '',
          sets: String(exercise.sets),
        }))
      : [blankExercise()]
  );
  const [save, saving] = useMutation(SaveWorkoutPlanDocument, {
    refetchQueries: [WorkoutsDocument],
  });

  const change = (index: number, patch: Partial<ExerciseDraft>) =>
    setExercises(list =>
      list.map((exercise, i) => (i === index ? { ...exercise, ...patch } : exercise))
    );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    save({
      variables: {
        id: plan?.id,
        input: {
          exercises: exercises
            .filter(exercise => exercise.name.trim())
            .map(exercise => ({
              load: exercise.load,
              name: exercise.name,
              reps: exercise.reps,
              restSeconds: wholeOrNull(exercise.rest),
              sets: Number(exercise.sets),
            })),
          name,
          notes,
          weekdays,
        },
      },
    })
      .then(onClose)
      .catch(() => undefined);
  };

  return (
    <Dialog onOpenChange={open => !open && onClose()} open>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{plan ? t('fitness.workouts.edit') : t('fitness.workouts.new')}</DialogTitle>
          <DialogDescription>{t('fitness.workouts.subtitle')}</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" id="workout-plan" onSubmit={submit}>
          <Field label={t('fitness.workouts.name')}>
            <Input
              autoFocus
              onChange={e => setName(e.target.value)}
              placeholder={t('fitness.workouts.namePlaceholder')}
              required
              value={name}
            />
          </Field>
          <Field label={t('fitness.workouts.days')}>
            <WeekdayPicker onChange={setWeekdays} value={weekdays} />
          </Field>
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">{t('fitness.workouts.exercises')}</p>
            {exercises.map((exercise, index) => (
              <div
                className="grid grid-cols-[1fr_auto] gap-2 rounded-xl bg-muted p-3 sm:grid-cols-[minmax(0,2fr)_4rem_5rem_5rem_5rem_auto] sm:items-end"
                key={index}
              >
                <label className="col-span-2 flex flex-col gap-1 text-xs text-muted-foreground sm:col-span-1">
                  {t('fitness.workouts.exercise')}
                  <Input
                    className="bg-card"
                    onChange={e => change(index, { name: e.target.value })}
                    value={exercise.name}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                  {t('fitness.workouts.sets')}
                  <Input
                    className="bg-card"
                    inputMode="numeric"
                    min={1}
                    onChange={e => change(index, { sets: e.target.value })}
                    type="number"
                    value={exercise.sets}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                  {t('fitness.workouts.reps')}
                  <Input
                    className="bg-card"
                    onChange={e => change(index, { reps: e.target.value })}
                    placeholder="8-12"
                    value={exercise.reps}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                  {t('fitness.workouts.load')}
                  <Input
                    className="bg-card"
                    inputMode="decimal"
                    onChange={e => change(index, { load: e.target.value })}
                    value={exercise.load}
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                  {t('fitness.workouts.rest')}
                  <Input
                    className="bg-card"
                    inputMode="numeric"
                    onChange={e => change(index, { rest: e.target.value })}
                    type="number"
                    value={exercise.rest}
                  />
                </label>
                <Button
                  aria-label={t('fitness.workouts.removeExercise')}
                  className="self-end"
                  onClick={() => setExercises(list => list.filter((_, i) => i !== index))}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <XIcon />
                </Button>
              </div>
            ))}
            <Button
              className="self-start"
              onClick={() => setExercises(list => [...list, blankExercise()])}
              size="sm"
              type="button"
              variant="outline"
            >
              <PlusIcon />
              {t('fitness.workouts.addExercise')}
            </Button>
          </div>
          <Field label={t('fitness.notes')}>
            <Textarea onChange={e => setNotes(e.target.value)} rows={2} value={notes} />
          </Field>
          <FormError error={saving.error} />
        </form>
        <DialogFooter>
          <Button onClick={onClose} variant="ghost">
            {t('fitness.cancel')}
          </Button>
          <Button disabled={saving.loading} form="workout-plan" type="submit">
            {t('fitness.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Logs a Treino, from a Ficha or free ("Corrida, 5 km"). */
function LogDialog({
  onClose,
  planId,
  plans,
}: {
  onClose: () => void;
  planId: null | string;
  plans: Plan[];
}) {
  const { t } = useI18n();
  const toast = useToast();
  const [plan, setPlan] = useState(planId ?? 'free');
  const [title, setTitle] = useState('');
  const [doneOn, setDoneOn] = useState(localToday());
  const [minutes, setMinutes] = useState('');
  const [notes, setNotes] = useState('');
  const [log, logging] = useMutation(LogWorkoutDocument, { refetchQueries: [WorkoutsDocument] });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    log({
      variables: {
        input: {
          doneOn,
          durationMinutes: wholeOrNull(minutes),
          notes,
          planId: plan === 'free' ? null : plan,
          title: plan === 'free' ? title : null,
        },
      },
    })
      .then(() => {
        toast({ message: t('fitness.workouts.logged') });
        onClose();
      })
      .catch(() => undefined);
  };

  return (
    <Dialog onOpenChange={open => !open && onClose()} open>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('fitness.workouts.logTitle')}</DialogTitle>
          <DialogDescription className="sr-only">
            {t('fitness.workouts.logTitle')}
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" id="log-workout" onSubmit={submit}>
          <Field label={t('nav.workouts')}>
            <Select onValueChange={setPlan} value={plan}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {plans.map(item => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
                <SelectItem value="free">{t('fitness.workouts.free')}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {plan === 'free' && (
            <Field label={t('fitness.workouts.what')}>
              <Input
                onChange={e => setTitle(e.target.value)}
                placeholder={t('fitness.workouts.whatPlaceholder')}
                required
                value={title}
              />
            </Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('fitness.date')}>
              <Input
                onChange={e => setDoneOn(e.target.value)}
                required
                type="date"
                value={doneOn}
              />
            </Field>
            <Field label={t('fitness.workouts.duration')}>
              <Input
                inputMode="numeric"
                min={1}
                onChange={e => setMinutes(e.target.value)}
                type="number"
                value={minutes}
              />
            </Field>
          </div>
          <Field label={t('fitness.notes')}>
            <Textarea onChange={e => setNotes(e.target.value)} rows={2} value={notes} />
          </Field>
          <FormError error={logging.error} />
        </form>
        <DialogFooter>
          <Button onClick={onClose} variant="ghost">
            {t('fitness.cancel')}
          </Button>
          <Button disabled={logging.loading} form="log-workout" type="submit">
            {t('fitness.workouts.log')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PlanCard({
  onDelete,
  onEdit,
  onLog,
  plan,
}: {
  onDelete: () => void;
  onEdit: () => void;
  onLog: () => void;
  plan: Plan;
}) {
  const { language, t } = useI18n();
  const dayLabel = useDayLabel();
  const names = weekdayNames(language);
  const locale = language === 'pt' ? 'pt-BR' : 'en-US';
  return (
    <Card className="gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold">{plan.name}</h2>
          <p className="text-sm text-muted-foreground">
            {plan.lastDoneOn
              ? t('fitness.workouts.lastDone', { date: dayLabel(plan.lastDoneOn, localToday()) })
              : t('fitness.workouts.never')}
          </p>
        </div>
        <div className="flex shrink-0">
          <Button aria-label={t('fitness.edit')} onClick={onEdit} size="icon-sm" variant="ghost">
            <PencilIcon />
          </Button>
          <Button
            aria-label={t('fitness.delete')}
            onClick={onDelete}
            size="icon-sm"
            variant="ghost"
          >
            <Trash2Icon />
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {plan.weekdays.length ? (
          plan.weekdays.map(day => (
            <Badge className="capitalize" key={day} variant="secondary">
              {names[day]?.replace('.', '')}
            </Badge>
          ))
        ) : (
          <Badge variant="secondary">{t('fitness.workouts.anyDay')}</Badge>
        )}
      </div>
      {plan.exercises.length ? (
        <ol className="flex flex-col divide-y text-sm">
          {plan.exercises.map(exercise => (
            <li className="flex items-baseline justify-between gap-3 py-2" key={exercise.id}>
              <span className="min-w-0 truncate">{exercise.name}</span>
              <span className="shrink-0 text-muted-foreground tabular-nums">
                {exercise.sets}×{exercise.reps || '—'}
                {' · '}
                {exercise.loadGrams === null || exercise.loadGrams === undefined
                  ? t('fitness.workouts.bodyweight')
                  : `${formatDecimal(exercise.loadGrams, 3, locale)} kg`}
                {exercise.restSeconds ? ` · ${exercise.restSeconds}s` : ''}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted-foreground">{t('fitness.workouts.noExercises')}</p>
      )}
      {plan.notes && (
        <p className="text-sm whitespace-pre-line text-muted-foreground">{plan.notes}</p>
      )}
      <Button className="mt-auto self-start" onClick={onLog} size="sm">
        <CheckIcon />
        {t('fitness.workouts.log')}
      </Button>
    </Card>
  );
}

/** `/fitness/workouts`: the Fichas de treino and the Treinos done lately. */
export function WorkoutsPage() {
  const { t } = useI18n();
  const dayLabel = useDayLabel();
  const { data, error, loading } = useQuery(WorkoutsDocument);
  const [deletePlan] = useMutation(DeleteWorkoutPlanDocument, {
    refetchQueries: [WorkoutsDocument],
  });
  const [deleteSession] = useMutation(DeleteWorkoutSessionDocument, {
    refetchQueries: [WorkoutsDocument],
  });
  const { hidden, remove } = useUndoableDelete();
  const [editing, setEditing] = useState<null | Plan | undefined>(undefined);
  const [logging, setLogging] = useState<null | string | undefined>(undefined);

  if (error && !data) return <QueryError error={error} title={t('nav.workouts')} />;
  if (loading && !data) return <PageSkeleton />;
  if (!data) return null;

  const plans = data.workoutPlans.filter(plan => !hidden.has(plan.id));
  const sessions = data.workoutSessions.filter(session => !hidden.has(session.id));
  const today = localToday();

  return (
    <div className="flex flex-col gap-6" data-area="fitness">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeading subtitle={t('fitness.workouts.subtitle')}>{t('nav.workouts')}</PageHeading>
        <div className="flex gap-2">
          <Button onClick={() => setLogging(null)} variant="outline">
            <CheckIcon />
            {t('fitness.workouts.log')}
          </Button>
          <Button onClick={() => setEditing(null)}>
            <PlusIcon />
            {t('fitness.workouts.new')}
          </Button>
        </div>
      </div>

      {plans.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map(plan => (
            <PlanCard
              key={plan.id}
              onDelete={() =>
                remove({
                  commit: () => deletePlan({ variables: { id: plan.id } }),
                  ids: [plan.id],
                  message: t('fitness.workouts.deleteConfirm'),
                })
              }
              onEdit={() => setEditing(plan)}
              onLog={() => setLogging(plan.id)}
              plan={plan}
            />
          ))}
        </div>
      ) : (
        <Card className="items-center text-center text-muted-foreground">
          {t('fitness.workouts.empty')}
        </Card>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">{t('fitness.workouts.history')}</h2>
        <Card className="gap-0 p-0">
          {sessions.length ? (
            sessions.map(session => (
              <div
                className="flex items-center justify-between gap-3 border-b px-4 py-3 last:border-b-0"
                key={session.id}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{session.title}</p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {dayLabel(session.doneOn, today)}
                    {session.durationMinutes ? ` · ${session.durationMinutes} min` : ''}
                    {session.notes ? ` · ${session.notes}` : ''}
                  </p>
                </div>
                <Button
                  aria-label={t('fitness.delete')}
                  onClick={() =>
                    remove({
                      commit: () => deleteSession({ variables: { id: session.id } }),
                      ids: [session.id],
                      message: t('fitness.deleted'),
                    })
                  }
                  size="icon-sm"
                  variant="ghost"
                >
                  <Trash2Icon />
                </Button>
              </div>
            ))
          ) : (
            <p className="p-4 text-sm text-muted-foreground">{t('fitness.workouts.noHistory')}</p>
          )}
        </Card>
      </section>

      {editing !== undefined && <PlanDialog onClose={() => setEditing(undefined)} plan={editing} />}
      {logging !== undefined && (
        <LogDialog onClose={() => setLogging(undefined)} planId={logging} plans={plans} />
      )}
    </div>
  );
}
