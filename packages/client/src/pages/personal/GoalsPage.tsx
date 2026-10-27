import { useMutation, useQuery } from '@apollo/client/react';
import {
  AddGoalProgressDocument,
  ArchiveGoalDocument,
  CreateGoalDocument,
  DeleteGoalDocument,
  DeleteGoalProgressDocument,
  GoalsDocument,
  UpdateGoalDocument,
  type GoalArea,
  type GoalKind,
  type GoalsQuery,
} from '@zapbots/graphql/client';
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  CheckIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { Field, PageHeading } from '@zapbots/ui/blocks/field';
import { PageSkeleton } from '@zapbots/ui/blocks/page-skeleton';
import { Badge } from '@zapbots/ui/components/badge';
import { Button } from '@zapbots/ui/components/button';
import { Card } from '@zapbots/ui/components/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@zapbots/ui/components/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@zapbots/ui/components/dropdown-menu';
import { Input } from '@zapbots/ui/components/input';
import { Progress } from '@zapbots/ui/components/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@zapbots/ui/components/select';
import { Tabs, TabsList, TabsTrigger } from '@zapbots/ui/components/tabs';

import { FormError } from '../../components/FormError';
import { QueryError } from '../../components/QueryError';
import { useToast, useUndoableDelete } from '../../components/Toaster';
import { formatDate, parseCents } from '../../lib/format';
import { useI18n, type StringKey } from '../../lib/i18n';
import { percentOf, useGoalAmount } from './shared';

type Goal = GoalsQuery['goals'][number];

const KINDS: { label: StringKey; value: GoalKind }[] = [
  { label: 'personal.goals.kind.MONEY', value: 'MONEY' },
  { label: 'personal.goals.kind.COUNT', value: 'COUNT' },
  { label: 'personal.goals.kind.CHECK', value: 'CHECK' },
];

const AREAS: { label: StringKey; value: GoalArea }[] = [
  { label: 'home.area.personal', value: 'PERSONAL' },
  { label: 'home.area.finance', value: 'FINANCE' },
  { label: 'personal.goals.area.FITNESS', value: 'FITNESS' },
];

const AREA_LABEL = Object.fromEntries(AREAS.map(area => [area.value, area.label])) as Record<
  GoalArea,
  StringKey
>;

/** A typed amount in the Meta's unit, as the API takes it: cents for money, a whole count otherwise. */
const parseAmount = (kind: GoalKind, text: string): null | number => {
  if (kind === 'MONEY') return parseCents(text);
  const value = Number(text.replace(/\./g, '').replace(',', '.'));
  return Number.isInteger(value) ? value : null;
};

interface Draft {
  area: GoalArea;
  dueOn: string;
  kind: GoalKind;
  target: string;
  title: string;
  unit: string;
}

/** A Meta's form: new, or to correct. */
function GoalDialog({ goal, onClose }: { goal?: Goal; onClose: () => void }) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<Draft>(() => ({
    area: goal?.area ?? 'PERSONAL',
    dueOn: goal?.dueOn ?? '',
    kind: goal?.kind ?? 'MONEY',
    target: goal
      ? goal.kind === 'MONEY'
        ? (goal.target / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
        : String(goal.target)
      : '',
    title: goal?.title ?? '',
    unit: goal?.unit ?? '',
  }));
  const set = (change: Partial<Draft>) => setDraft(current => ({ ...current, ...change }));
  const [create, created] = useMutation(CreateGoalDocument, { refetchQueries: 'active' });
  const [update, updated] = useMutation(UpdateGoalDocument, { refetchQueries: 'active' });
  const target = draft.kind === 'CHECK' ? 1 : parseAmount(draft.kind, draft.target);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const input = {
      area: draft.area,
      dueOn: draft.dueOn || null,
      kind: draft.kind,
      target,
      title: draft.title,
      unit: draft.kind === 'COUNT' ? draft.unit : null,
    };
    const result = await (
      goal ? update({ variables: { id: goal.id, input } }) : create({ variables: { input } })
    ).catch(() => null);
    if (result?.data) onClose();
  };

  return (
    <Dialog onOpenChange={open => !open && onClose()} open>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{goal ? t('personal.goals.edit') : t('personal.goals.new')}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={event => void submit(event)}>
          <Field label={t('personal.title')}>
            <Input
              autoFocus
              maxLength={200}
              onChange={event => set({ title: event.target.value })}
              placeholder={t('personal.goals.example')}
              value={draft.title}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('personal.goals.kind')}>
              <Select onValueChange={value => set({ kind: value as GoalKind })} value={draft.kind}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KINDS.map(kind => (
                    <SelectItem key={kind.value} value={kind.value}>
                      {t(kind.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t('personal.goals.area')}>
              <Select onValueChange={value => set({ area: value as GoalArea })} value={draft.area}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AREAS.map(area => (
                    <SelectItem key={area.value} value={area.value}>
                      {t(area.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          {draft.kind !== 'CHECK' && (
            <div className="grid grid-cols-2 gap-3">
              <Field
                label={
                  draft.kind === 'MONEY'
                    ? t('personal.goals.targetMoney')
                    : t('personal.goals.target')
                }
              >
                <Input
                  inputMode="decimal"
                  onChange={event => set({ target: event.target.value })}
                  placeholder={draft.kind === 'MONEY' ? '10.000,00' : '12'}
                  value={draft.target}
                />
              </Field>
              {draft.kind === 'COUNT' && (
                <Field label={t('personal.goals.unit')}>
                  <Input
                    maxLength={30}
                    onChange={event => set({ unit: event.target.value })}
                    placeholder={t('personal.goals.unitExample')}
                    value={draft.unit}
                  />
                </Field>
              )}
            </div>
          )}
          <Field label={t('personal.goals.by')}>
            <Input
              onChange={event => set({ dueOn: event.target.value })}
              type="date"
              value={draft.dueOn}
            />
          </Field>
          {(created.error || updated.error) && <FormError error={created.error ?? updated.error} />}
          <DialogFooter>
            <Button
              disabled={
                created.loading || updated.loading || !draft.title.trim() || !target || target <= 0
              }
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

/** Adds a step to a Meta, and lists the steps so far, each removable. */
function ProgressDialog({ goal, onClose }: { goal: Goal; onClose: () => void }) {
  const { t } = useI18n();
  const amountOf = useGoalAmount();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [add, added] = useMutation(AddGoalProgressDocument, { refetchQueries: [GoalsDocument] });
  const [removeEntry] = useMutation(DeleteGoalProgressDocument, {
    refetchQueries: [GoalsDocument],
  });
  const value = parseAmount(goal.kind, amount);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!value) return;
    const result = await add({ variables: { amount: value, goalId: goal.id, note } }).catch(
      () => null
    );
    if (result?.data) {
      setAmount('');
      setNote('');
    }
  };

  return (
    <Dialog onOpenChange={open => !open && onClose()} open>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{goal.title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Progress value={percentOf(goal)} />
          <p className="text-sm text-muted-foreground">
            {t('personal.goals.of', {
              progress: amountOf(goal, goal.progress),
              target: amountOf(goal, goal.target),
            })}
          </p>
        </div>
        <form className="flex flex-col gap-3" onSubmit={event => void submit(event)}>
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3">
            <Field
              label={
                goal.kind === 'MONEY' ? t('personal.goals.amountMoney') : t('personal.goals.amount')
              }
            >
              <Input
                autoFocus
                inputMode="decimal"
                onChange={event => setAmount(event.target.value)}
                placeholder={goal.kind === 'MONEY' ? '500,00' : '1'}
                value={amount}
              />
            </Field>
            <Field label={t('personal.goals.note')}>
              <Input maxLength={200} onChange={event => setNote(event.target.value)} value={note} />
            </Field>
          </div>
          <p className="text-xs text-muted-foreground">{t('personal.goals.negative')}</p>
          {added.error && <FormError error={added.error} />}
          <Button className="self-end" disabled={!value || added.loading} type="submit">
            {t('personal.goals.addProgress')}
          </Button>
        </form>
        {goal.entries.length > 0 && (
          <ul className="flex max-h-60 flex-col overflow-y-auto border-t pt-3">
            {goal.entries.map(entry => (
              <li className="flex items-center gap-3 py-1 text-sm" key={entry.id}>
                <span className="w-20 shrink-0 text-xs text-muted-foreground tabular-nums">
                  {formatDate(entry.createdAt)}
                </span>
                <span className="min-w-0 flex-1 truncate">{entry.note}</span>
                <span className="font-medium tabular-nums">
                  {amountOf(
                    { ...goal, kind: goal.kind === 'CHECK' ? 'COUNT' : goal.kind },
                    entry.amount
                  )}
                </span>
                <Button
                  aria-label={t('personal.delete')}
                  onClick={() => void removeEntry({ variables: { id: entry.id } })}
                  size="icon"
                  variant="ghost"
                >
                  <XIcon />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Metas: a card each, with how far it got and by when, its open Tarefas, and adding a step; done
 * once (CHECK) is a single button. Archived ones wait in their own tab.
 */
export function GoalsPage() {
  const { t } = useI18n();
  const toast = useToast();
  const amountOf = useGoalAmount();
  const [params, setParams] = useSearchParams();
  const archived = params.get('archived') === '1';
  const { data, error, loading } = useQuery(GoalsDocument, {
    fetchPolicy: 'cache-and-network',
    variables: { archived },
  });
  const [editing, setEditing] = useState<'new' | Goal | null>(null);
  const [progress, setProgress] = useState<null | string>(null);
  const [archive] = useMutation(ArchiveGoalDocument, { refetchQueries: [GoalsDocument] });
  const [add] = useMutation(AddGoalProgressDocument, { refetchQueries: [GoalsDocument] });
  const [removeGoal] = useMutation(DeleteGoalDocument, { refetchQueries: [GoalsDocument] });
  const { hidden, remove } = useUndoableDelete();

  if (error && !data) return <QueryError error={error} title={t('nav.goals')} />;
  if (loading && !data) return <PageSkeleton />;
  const goals = (data?.goals ?? []).filter(goal => !hidden.has(goal.id));
  const failed = () => toast({ message: t('common.saveFailed'), tone: 'error' });
  const tracking = goals.find(goal => goal.id === progress);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeading subtitle={t('personal.goals.subtitle')}>{t('nav.goals')}</PageHeading>
        <div className="flex items-center gap-2">
          <Tabs
            onValueChange={value => setParams(value === 'archived' ? { archived: '1' } : {})}
            value={archived ? 'archived' : 'active'}
          >
            <TabsList>
              <TabsTrigger value="active">{t('personal.goals.active')}</TabsTrigger>
              <TabsTrigger value="archived">{t('personal.goals.archived')}</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => setEditing('new')}>
            <PlusIcon />
            {t('personal.goals.new')}
          </Button>
        </div>
      </div>

      {goals.length === 0 ? (
        <Card className="items-center py-12 text-center text-sm text-muted-foreground">
          {archived ? t('personal.goals.noneArchived') : t('personal.goals.empty')}
        </Card>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {goals.map(goal => {
            const reached = goal.progress >= goal.target;
            return (
              <Card className="gap-4" key={goal.id}>
                <div className="flex items-start gap-2">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <h2 className="font-semibold">{goal.title}</h2>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary">{t(AREA_LABEL[goal.area])}</Badge>
                      {goal.dueOn && (
                        <span>{t('personal.goals.until', { date: formatDate(goal.dueOn) })}</span>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-label={t('personal.more')} size="icon" variant="ghost">
                        <MoreHorizontalIcon />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setEditing(goal)}>
                        <PencilIcon />
                        {t('personal.edit')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() =>
                          void archive({ variables: { archived: !archived, id: goal.id } }).catch(
                            failed
                          )
                        }
                      >
                        {archived ? <ArchiveRestoreIcon /> : <ArchiveIcon />}
                        {archived ? t('personal.goals.restore') : t('personal.goals.archive')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() =>
                          remove({
                            commit: () => removeGoal({ variables: { id: goal.id } }),
                            ids: [goal.id],
                            message: t('personal.goals.deleted', { title: goal.title }),
                          })
                        }
                        variant="destructive"
                      >
                        <Trash2Icon />
                        {t('personal.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Progress value={percentOf(goal)} />
                  <p className="text-sm">
                    {goal.kind === 'CHECK' ? (
                      <span className={reached ? 'text-success' : 'text-muted-foreground'}>
                        {amountOf(goal, goal.progress)}
                      </span>
                    ) : (
                      <>
                        <strong className="font-semibold tabular-nums">
                          {amountOf(goal, goal.progress)}
                        </strong>
                        <span className="text-muted-foreground">
                          {' '}
                          {t('personal.goals.ofTarget', {
                            target: amountOf(goal, goal.target),
                          })}{' '}
                          · {Math.floor(percentOf(goal))}%
                        </span>
                      </>
                    )}
                  </p>
                </div>
                {goal.openTasks.length > 0 && (
                  <ul className="flex flex-col gap-1 text-sm">
                    {goal.openTasks.slice(0, 3).map(task => (
                      <li className="truncate text-muted-foreground" key={task.id}>
                        <Link className="hover:text-primary" to={`/personal/tasks?t=${task.id}`}>
                          ○ {task.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {!archived && (
                  <div className="mt-auto flex justify-end">
                    {goal.kind === 'CHECK' ? (
                      <Button
                        onClick={() =>
                          void add({
                            variables: { amount: reached ? -goal.progress : 1, goalId: goal.id },
                          }).catch(failed)
                        }
                        size="sm"
                        variant={reached ? 'ghost' : 'default'}
                      >
                        {reached ? <XIcon /> : <CheckIcon />}
                        {reached ? t('personal.goals.undo') : t('personal.goals.markDone')}
                      </Button>
                    ) : (
                      <Button onClick={() => setProgress(goal.id)} size="sm" variant="outline">
                        <PlusIcon />
                        {t('personal.goals.addProgress')}
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {editing && (
        <GoalDialog
          goal={editing === 'new' ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
      {tracking && <ProgressDialog goal={tracking} onClose={() => setProgress(null)} />}
    </div>
  );
}
