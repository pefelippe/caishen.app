import { useMutation, useQuery } from '@apollo/client/react';
import {
  DeleteWorkoutPlanDocument,
  DeleteWorkoutSessionDocument,
  GenerateWorkoutPlansDocument,
  LogWorkoutDocument,
  SaveWorkoutPlanDocument,
  ShareWorkoutPlanDocument,
  WorkoutsDocument,
  type GenerateWorkoutPlansMutation,
  type WorkoutEquipment,
  type WorkoutGoal,
  type WorkoutLevel,
  type WorkoutPlanFieldsFragment,
} from '@zapbots/graphql/client';
import { formatDecimal } from '@zapbots/fitness';
import {
  CheckIcon,
  CopyIcon,
  Link2Icon,
  Link2OffIcon,
  PencilIcon,
  PlusIcon,
  SparklesIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react';
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
import { useI18n, type StringKey } from '../../lib/i18n';
import { useDayLabel, weekdayNames } from '../personal/shared';
import { wholeOrNull, WeekdayPicker } from './shared';

type Plan = WorkoutPlanFieldsFragment;

/** A Ficha the Agente wrote, waiting on this page until it is saved or dropped. */
type Draft = GenerateWorkoutPlansMutation['generateWorkoutPlans'][number] & {
  forName: null | string;
  key: string;
};

interface ExerciseDraft {
  load: string;
  name: string;
  notes: string;
  reps: string;
  rest: string;
  sets: string;
}

const blankExercise = (): ExerciseDraft => ({
  load: '',
  name: '',
  notes: '',
  reps: '',
  rest: '',
  sets: '3',
});

/** A draft as the save mutation takes it. */
const draftInput = (draft: Draft) => ({
  exercises: draft.exercises.map(exercise => ({
    load: exercise.load,
    name: exercise.name,
    notes: exercise.notes,
    reps: exercise.reps,
    restSeconds: exercise.restSeconds,
    sets: exercise.sets,
  })),
  forName: draft.forName,
  name: draft.name,
  notes: draft.notes,
  weekdays: draft.weekdays,
});

const linkOf = (token: string) => `${window.location.origin}/w/${token}`;

function PlanDialog({
  draft,
  onClose,
  onSaved,
  plan,
}: {
  draft?: Draft;
  onClose: () => void;
  onSaved?: () => void;
  plan: null | Plan;
}) {
  const { language, t } = useI18n();
  const locale = language === 'pt' ? 'pt-BR' : 'en-US';
  const [name, setName] = useState(plan?.name ?? draft?.name ?? '');
  const [forName, setForName] = useState(plan?.forName ?? draft?.forName ?? '');
  const [notes, setNotes] = useState(plan?.notes ?? draft?.notes ?? '');
  const [weekdays, setWeekdays] = useState<number[]>(plan?.weekdays ?? draft?.weekdays ?? []);
  const [exercises, setExercises] = useState<ExerciseDraft[]>(() =>
    draft
      ? draft.exercises.map(exercise => ({
          load: exercise.load ?? '',
          name: exercise.name,
          notes: exercise.notes,
          reps: exercise.reps,
          rest: exercise.restSeconds?.toString() ?? '',
          sets: String(exercise.sets),
        }))
      : plan?.exercises.length
        ? plan.exercises.map(exercise => ({
            load:
              exercise.loadGrams === null || exercise.loadGrams === undefined
                ? ''
                : formatDecimal(exercise.loadGrams, 3, locale),
            name: exercise.name,
            notes: exercise.notes,
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
              notes: exercise.notes,
              reps: exercise.reps,
              restSeconds: wholeOrNull(exercise.rest),
              sets: Number(exercise.sets),
            })),
          forName,
          name,
          notes,
          weekdays,
        },
      },
    })
      .then(() => {
        onSaved?.();
        onClose();
      })
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
          <Field hint={t('fitness.workouts.forHint')} label={t('fitness.workouts.for')}>
            <Input
              onChange={e => setForName(e.target.value)}
              placeholder={t('fitness.workouts.forPlaceholder')}
              value={forName}
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
                <Input
                  aria-label={t('fitness.workouts.exerciseNotes')}
                  className="col-span-full bg-card"
                  onChange={e => change(index, { notes: e.target.value })}
                  placeholder={t('fitness.workouts.exerciseNotes')}
                  value={exercise.notes}
                />
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

/** Opens or closes a Ficha's public link, copying it when it opens. */
function ShareButtons({ plan }: { plan: Plan }) {
  const { t } = useI18n();
  const toast = useToast();
  const [share, sharing] = useMutation(ShareWorkoutPlanDocument);
  const copy = (token: string) =>
    navigator.clipboard
      .writeText(linkOf(token))
      .then(() => toast({ message: t('fitness.workouts.linkCopied') }))
      .catch(() => undefined);
  const set = (shared: boolean) =>
    share({ variables: { id: plan.id, shared } })
      .then(result => {
        const token = result.data?.shareWorkoutPlan.shareToken;
        if (token) void copy(token);
      })
      .catch(() => toast({ message: t('fitness.workouts.shareFailed'), tone: 'error' }));

  if (!plan.shareToken)
    return (
      <Button disabled={sharing.loading} onClick={() => void set(true)} size="sm" variant="outline">
        <Link2Icon />
        {t('fitness.workouts.share')}
      </Button>
    );
  return (
    <>
      <Button onClick={() => void copy(plan.shareToken!)} size="sm" variant="outline">
        <CopyIcon />
        {t('fitness.workouts.copyLink')}
      </Button>
      <Button
        aria-label={t('fitness.workouts.unshare')}
        disabled={sharing.loading}
        onClick={() => void set(false)}
        size="icon-sm"
        variant="ghost"
      >
        <Link2OffIcon />
      </Button>
    </>
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
      <div className="mt-auto flex flex-wrap items-center gap-2">
        {!plan.forName && (
          <Button onClick={onLog} size="sm">
            <CheckIcon />
            {t('fitness.workouts.log')}
          </Button>
        )}
        <ShareButtons plan={plan} />
      </div>
    </Card>
  );
}

const GOALS: WorkoutGoal[] = ['HYPERTROPHY', 'FAT_LOSS', 'STRENGTH', 'CONDITIONING', 'HEALTH'];
const LEVELS: WorkoutLevel[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
const EQUIPMENT: WorkoutEquipment[] = ['GYM', 'HOME', 'BODYWEIGHT'];

/** Asks the Agente for Fichas: what for, for whom, how often and with what. */
function GenerateDialog({
  onClose,
  onDrafts,
}: {
  onClose: () => void;
  onDrafts: (drafts: Draft[]) => void;
}) {
  const { t } = useI18n();
  const [forName, setForName] = useState('');
  const [goal, setGoal] = useState<WorkoutGoal>('HYPERTROPHY');
  const [level, setLevel] = useState<WorkoutLevel>('BEGINNER');
  const [equipment, setEquipment] = useState<WorkoutEquipment>('GYM');
  const [days, setDays] = useState('3');
  const [minutes, setMinutes] = useState('60');
  const [notes, setNotes] = useState('');
  const [generate, generating] = useMutation(GenerateWorkoutPlansDocument);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    generate({
      variables: {
        brief: {
          daysPerWeek: Number(days),
          equipment,
          forName,
          goal,
          level,
          minutes: Number(minutes),
          notes,
        },
      },
    })
      .then(result => {
        const drafts = result.data?.generateWorkoutPlans ?? [];
        onDrafts(
          drafts.map(draft => ({
            ...draft,
            forName: forName.trim() || null,
            key: crypto.randomUUID(),
          }))
        );
        onClose();
      })
      .catch(() => undefined);
  };

  const choice = <T extends string>(
    label: string,
    value: T,
    set: (value: T) => void,
    options: T[],
    prefix: string
  ) => (
    <Field label={label}>
      <Select onValueChange={next => set(next as T)} value={value}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map(option => (
            <SelectItem key={option} value={option}>
              {t(`${prefix}.${option}` as StringKey)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );

  return (
    <Dialog onOpenChange={open => !open && !generating.loading && onClose()} open>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('fitness.generate.title')}</DialogTitle>
          <DialogDescription>{t('fitness.generate.hint')}</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" id="generate-workouts" onSubmit={submit}>
          <Field hint={t('fitness.workouts.forHint')} label={t('fitness.workouts.for')}>
            <Input
              autoFocus
              onChange={e => setForName(e.target.value)}
              placeholder={t('fitness.workouts.forPlaceholder')}
              value={forName}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            {choice(t('fitness.generate.goal'), goal, setGoal, GOALS, 'fitness.goal')}
            {choice(t('fitness.generate.level'), level, setLevel, LEVELS, 'fitness.level')}
            {choice(
              t('fitness.generate.equipment'),
              equipment,
              setEquipment,
              EQUIPMENT,
              'fitness.equipment'
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('fitness.generate.days')}>
              <Input
                max={7}
                min={1}
                onChange={e => setDays(e.target.value)}
                required
                type="number"
                value={days}
              />
            </Field>
            <Field label={t('fitness.generate.minutes')}>
              <Input
                max={240}
                min={10}
                onChange={e => setMinutes(e.target.value)}
                required
                step={5}
                type="number"
                value={minutes}
              />
            </Field>
          </div>
          <Field label={t('fitness.generate.notes')}>
            <Textarea
              onChange={e => setNotes(e.target.value)}
              placeholder={t('fitness.generate.notesPlaceholder')}
              rows={3}
              value={notes}
            />
          </Field>
          <FormError error={generating.error} />
        </form>
        <DialogFooter>
          <Button disabled={generating.loading} onClick={onClose} variant="ghost">
            {t('fitness.cancel')}
          </Button>
          <Button disabled={generating.loading} form="generate-workouts" type="submit">
            <SparklesIcon />
            {generating.loading ? t('fitness.generate.working') : t('fitness.generate.go')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** The Fichas the Agente wrote, to save as they are, edit first or drop. */
function Drafts({
  drafts,
  onDrop,
  onEdit,
  onSaved,
}: {
  drafts: Draft[];
  onDrop: (key: string) => void;
  onEdit: (draft: Draft) => void;
  onSaved: (keys: string[]) => void;
}) {
  const { language, t } = useI18n();
  const toast = useToast();
  const names = weekdayNames(language);
  const [save] = useMutation(SaveWorkoutPlanDocument, { refetchQueries: [WorkoutsDocument] });
  const [saving, setSaving] = useState(false);

  const saveAll = async (list: Draft[]) => {
    setSaving(true);
    const saved: string[] = [];
    for (const draft of list) {
      try {
        await save({ variables: { input: draftInput(draft) } });
        saved.push(draft.key);
      } catch {
        toast({ message: t('fitness.generate.saveFailed', { name: draft.name }), tone: 'error' });
      }
    }
    setSaving(false);
    onSaved(saved);
    if (saved.length) toast({ message: t('fitness.generate.saved', { count: saved.length }) });
  };

  return (
    <section className="flex flex-col gap-3 rounded-[20px] border border-dashed border-area-fitness/60 bg-area-fitness/5 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <SparklesIcon className="size-4 text-area-fitness" />
            {t('fitness.generate.drafts')}
          </h2>
          <p className="text-sm text-muted-foreground">{t('fitness.generate.review')}</p>
        </div>
        <Button disabled={saving} onClick={() => void saveAll(drafts)}>
          <CheckIcon />
          {t('fitness.generate.saveAll')}
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {drafts.map(draft => (
          <Card className="gap-3" key={draft.key}>
            <div>
              <h3 className="font-semibold">{draft.name}</h3>
              <p className="text-sm text-muted-foreground capitalize">
                {draft.forName
                  ? `${t('fitness.workouts.forShort', { name: draft.forName })} · `
                  : ''}
                {draft.weekdays.length
                  ? draft.weekdays.map(day => names[day]?.replace('.', '')).join(', ')
                  : t('fitness.workouts.anyDay')}
              </p>
            </div>
            <ol className="flex flex-col divide-y text-sm">
              {draft.exercises.map((exercise, index) => (
                <li className="py-1.5" key={index}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate">{exercise.name}</span>
                    <span className="shrink-0 text-muted-foreground tabular-nums">
                      {exercise.sets}×{exercise.reps || '—'}
                      {exercise.restSeconds ? ` · ${exercise.restSeconds}s` : ''}
                    </span>
                  </div>
                  {exercise.notes && (
                    <p className="text-xs text-muted-foreground">{exercise.notes}</p>
                  )}
                </li>
              ))}
            </ol>
            {draft.notes && <p className="text-sm text-muted-foreground">{draft.notes}</p>}
            <div className="mt-auto flex flex-wrap gap-2">
              <Button disabled={saving} onClick={() => void saveAll([draft])} size="sm">
                {t('fitness.save')}
              </Button>
              <Button onClick={() => onEdit(draft)} size="sm" variant="outline">
                <PencilIcon />
                {t('fitness.edit')}
              </Button>
              <Button onClick={() => onDrop(draft.key)} size="sm" variant="ghost">
                {t('fitness.generate.drop')}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </section>
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
  const [generating, setGenerating] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [editingDraft, setEditingDraft] = useState<Draft | null>(null);
  const dropDrafts = (keys: string[]) =>
    setDrafts(list => list.filter(draft => !keys.includes(draft.key)));

  if (error && !data) return <QueryError error={error} title={t('nav.workouts')} />;
  if (loading && !data) return <PageSkeleton />;
  if (!data) return null;

  const plans = data.workoutPlans.filter(plan => !hidden.has(plan.id));
  const sessions = data.workoutSessions.filter(session => !hidden.has(session.id));
  // The User's own Fichas first, then each person's together (the server sends them in that order).
  const groups: { forName: null | string; plans: Plan[] }[] = [];
  for (const plan of plans) {
    const group = groups.at(-1);
    if (group && group.forName === (plan.forName ?? null)) group.plans.push(plan);
    else groups.push({ forName: plan.forName ?? null, plans: [plan] });
  }
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
          <Button onClick={() => setEditing(null)} variant="outline">
            <PlusIcon />
            {t('fitness.workouts.new')}
          </Button>
          <Button onClick={() => setGenerating(true)}>
            <SparklesIcon />
            {t('fitness.generate.open')}
          </Button>
        </div>
      </div>

      {drafts.length > 0 && (
        <Drafts
          drafts={drafts}
          onDrop={key => dropDrafts([key])}
          onEdit={setEditingDraft}
          onSaved={dropDrafts}
        />
      )}

      {plans.length ? (
        groups.map(group => (
          <section className="flex flex-col gap-3" key={group.forName ?? ''}>
            {(group.forName || groups.length > 1) && (
              <h2 className="font-semibold">
                {group.forName
                  ? t('fitness.workouts.forShort', { name: group.forName })
                  : t('fitness.workouts.mine')}
              </h2>
            )}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {group.plans.map(plan => (
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
          </section>
        ))
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
      {editingDraft && (
        <PlanDialog
          draft={editingDraft}
          onClose={() => setEditingDraft(null)}
          onSaved={() => dropDrafts([editingDraft.key])}
          plan={null}
        />
      )}
      {generating && (
        <GenerateDialog
          onClose={() => setGenerating(false)}
          onDrafts={next => setDrafts(list => [...next, ...list])}
        />
      )}
      {logging !== undefined && (
        <LogDialog onClose={() => setLogging(undefined)} planId={logging} plans={plans} />
      )}
    </div>
  );
}
