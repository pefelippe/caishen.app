import { useMutation, useQuery } from '@apollo/client/react';
import {
  CreateTaskDocument,
  CreateTaskListDocument,
  DeleteTaskDocument,
  DeleteTaskListDocument,
  SetTaskDoneDocument,
  TasksDocument,
  UpdateTaskDocument,
  type TaskFieldsFragment,
  type TaskPriority,
} from '@zapbots/graphql/client';
import { FlagIcon, ListIcon, PlusIcon, RepeatIcon, Trash2Icon } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Field, PageHeading } from '@zapbots/ui/blocks/field';
import { PageSkeleton } from '@zapbots/ui/blocks/page-skeleton';
import { Button } from '@zapbots/ui/components/button';
import { Card } from '@zapbots/ui/components/card';
import { Checkbox } from '@zapbots/ui/components/checkbox';
import {
  Dialog,
  DialogContent,
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
import { cn } from '@zapbots/ui/lib/utils';

import { FormError } from '../../components/FormError';
import { QueryError } from '../../components/QueryError';
import { useToast, useUndoableDelete } from '../../components/Toaster';
import { useI18n, type StringKey } from '../../lib/i18n';
import {
  addDays,
  RepeatField,
  repeatInput,
  useDayLabel,
  useRepeatLabel,
  type RepeatValue,
} from './shared';

type Task = TaskFieldsFragment;

const PRIORITIES: { label: StringKey; value: TaskPriority }[] = [
  { label: 'personal.priority.high', value: 'HIGH' },
  { label: 'personal.priority.normal', value: 'NORMAL' },
  { label: 'personal.priority.low', value: 'LOW' },
];

const NO_LIST = 'none';

/** The groups open Tarefas show in, by their day against today. */
function groupOf(task: Task, today: string): 'later' | 'nodate' | 'overdue' | 'today' | 'week' {
  if (!task.dueOn) return 'nodate';
  if (task.dueOn < today) return 'overdue';
  if (task.dueOn === today) return 'today';
  if (task.dueOn <= addDays(today, 7)) return 'week';
  return 'later';
}

const GROUPS = [
  { key: 'overdue', label: 'personal.tasks.overdue' },
  { key: 'today', label: 'personal.today' },
  { key: 'week', label: 'personal.tasks.week' },
  { key: 'later', label: 'personal.tasks.later' },
  { key: 'nodate', label: 'personal.tasks.nodate' },
] as const;

/** A Tarefa to write or correct: every field of the form. */
interface Draft {
  dueOn: string;
  dueTime: string;
  listId: string;
  notes: string;
  priority: TaskPriority;
  repeat: null | RepeatValue;
  title: string;
}

const draftOf = (task?: Task, listId?: null | string): Draft => ({
  dueOn: task?.dueOn ?? '',
  dueTime: task?.dueTime ?? '',
  listId: task?.listId ?? listId ?? NO_LIST,
  notes: task?.notes ?? '',
  priority: task?.priority ?? 'NORMAL',
  repeat: task?.repeat ?? null,
  title: task?.title ?? '',
});

const inputOf = (draft: Draft) => ({
  dueOn: draft.dueOn || null,
  dueTime: draft.dueOn && draft.dueTime ? draft.dueTime : null,
  listId: draft.listId === NO_LIST ? null : draft.listId,
  notes: draft.notes,
  priority: draft.priority,
  repeat: draft.dueOn ? repeatInput(draft.repeat) : null,
  title: draft.title,
});

/** A Tarefa's form: new (no `task`) or to correct, with deleting it. */
function TaskDialog({
  lists,
  listId,
  onClose,
  onDelete,
  task,
}: {
  listId: null | string;
  lists: { id: string; name: string }[];
  onClose: () => void;
  onDelete: (task: Task) => void;
  task?: Task;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(() => draftOf(task, listId));
  const set = (change: Partial<Draft>) => setDraft(current => ({ ...current, ...change }));
  const [create, created] = useMutation(CreateTaskDocument, { refetchQueries: 'active' });
  const [update, updated] = useMutation(UpdateTaskDocument, { refetchQueries: 'active' });
  const saving = created.loading || updated.loading;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const input = inputOf(draft);
    const result = await (
      task ? update({ variables: { id: task.id, input } }) : create({ variables: { input } })
    ).catch(() => null);
    if (result?.data) onClose();
  };

  return (
    <Dialog onOpenChange={open => !open && onClose()} open>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? t('personal.tasks.edit') : t('personal.tasks.new')}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={event => void submit(event)}>
          <Field label={t('personal.title')}>
            <Input
              autoFocus
              maxLength={200}
              onChange={event => set({ title: event.target.value })}
              value={draft.title}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('personal.tasks.due')}>
              <Input
                onChange={event => set({ dueOn: event.target.value })}
                type="date"
                value={draft.dueOn}
              />
            </Field>
            <Field label={t('personal.time')}>
              <Input
                disabled={!draft.dueOn}
                onChange={event => set({ dueTime: event.target.value })}
                type="time"
                value={draft.dueTime}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('personal.priority')}>
              <Select
                onValueChange={value => set({ priority: value as TaskPriority })}
                value={draft.priority}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(priority => (
                    <SelectItem key={priority.value} value={priority.value}>
                      {t(priority.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t('personal.tasks.list')}>
              <Select onValueChange={value => set({ listId: value })} value={draft.listId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_LIST}>{t('personal.tasks.noList')}</SelectItem>
                  {lists.map(list => (
                    <SelectItem key={list.id} value={list.id}>
                      {list.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          {draft.dueOn && <RepeatField onChange={repeat => set({ repeat })} value={draft.repeat} />}
          <Field label={t('personal.notes')}>
            <Textarea
              onChange={event => set({ notes: event.target.value })}
              rows={3}
              value={draft.notes}
            />
          </Field>
          {(created.error || updated.error) && <FormError error={created.error ?? updated.error} />}
          <DialogFooter className="sm:justify-between">
            {task ? (
              <Button
                onClick={() => {
                  onDelete(task);
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
            <Button disabled={saving || !draft.title.trim()} type="submit">
              {t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** One Tarefa: the box that marks it done, its title and when, and opening it to edit. */
function TaskRow({
  listName,
  onOpen,
  onToggle,
  task,
  today,
}: {
  listName?: string;
  onOpen: () => void;
  onToggle: (done: boolean) => void;
  task: Task;
  today: string;
}) {
  const { t } = useI18n();
  const dayLabel = useDayLabel();
  const repeatLabel = useRepeatLabel();
  const done = Boolean(task.doneAt);
  const overdue = !done && task.dueOn !== null && task.dueOn !== undefined && task.dueOn < today;
  return (
    <li className="flex items-start gap-3 rounded-xl px-2 py-2.5 hover:bg-muted/60">
      <Checkbox
        aria-label={done ? t('personal.tasks.reopen') : t('personal.tasks.complete')}
        checked={done}
        className={cn('mt-0.5', task.priority === 'HIGH' && 'border-destructive')}
        onCheckedChange={checked => onToggle(checked === true)}
      />
      <button
        className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left"
        onClick={onOpen}
        type="button"
      >
        <span className={cn('text-sm', done && 'text-muted-foreground line-through')}>
          {task.title}
        </span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          {task.dueOn && (
            <span className={cn(overdue && 'text-destructive')}>
              {dayLabel(task.dueOn, today)}
              {task.dueTime && ` · ${task.dueTime}`}
            </span>
          )}
          {task.repeat && (
            <span className="inline-flex items-center gap-1">
              <RepeatIcon className="size-3" />
              {repeatLabel(task.repeat)}
            </span>
          )}
          {listName && (
            <span className="inline-flex items-center gap-1">
              <ListIcon className="size-3" />
              {listName}
            </span>
          )}
          {task.priority === 'HIGH' && (
            <span className="inline-flex items-center gap-1 text-destructive">
              <FlagIcon className="size-3" />
              {t('personal.priority.high')}
            </span>
          )}
          {task.notes && <span className="truncate">{task.notes.split('\n')[0]}</span>}
        </span>
      </button>
    </li>
  );
}

/**
 * Tarefas: the Lists down the left (chips on a phone), a line to add one at once, and the open
 * Tarefas grouped by when (Atrasadas, Hoje, Próximos 7 dias, Depois, Sem data), or the done ones.
 * Checking a box shows at once; a repeating Tarefa moves to its next date.
 */
export function TasksPage() {
  const { t } = useI18n();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const listId = params.get('list');
  const showDone = params.get('done') === '1';
  const { data, error, loading } = useQuery(TasksDocument, {
    fetchPolicy: 'cache-and-network',
    variables: { done: showDone, listId },
  });
  const [quick, setQuick] = useState('');
  const [newList, setNewList] = useState<null | string>(null);
  const [create] = useMutation(CreateTaskDocument, { refetchQueries: 'active' });
  const [setDone] = useMutation(SetTaskDoneDocument, { refetchQueries: 'active' });
  const [removeTask] = useMutation(DeleteTaskDocument, { refetchQueries: 'active' });
  const [createList] = useMutation(CreateTaskListDocument, { refetchQueries: 'active' });
  const [removeList] = useMutation(DeleteTaskListDocument, { refetchQueries: 'active' });
  const { hidden, remove } = useUndoableDelete();

  if (error && !data) return <QueryError error={error} title={t('nav.tasks')} />;
  if (loading && !data) return <PageSkeleton />;
  if (!data) return null;

  const today = data.personalToday;
  const lists = data.taskLists;
  const listName = (id?: null | string) => lists.find(list => list.id === id)?.name;
  const opened = params.get('t');
  const editing = opened === 'new' ? undefined : data.tasks.find(task => task.id === opened);
  const tasks = data.tasks.filter(task => !hidden.has(task.id));

  const open = (id: null | string) =>
    setParams(current => {
      const next = new URLSearchParams(current);
      if (id) next.set('t', id);
      else next.delete('t');
      return next;
    });
  const pick = (change: Record<string, null | string>) =>
    setParams(() => {
      const next = new URLSearchParams();
      for (const [key, value] of Object.entries({
        done: showDone ? '1' : null,
        list: listId,
        ...change,
      }))
        if (value) next.set(key, value);
      return next;
    });

  const toggle = (task: Task, done: boolean) =>
    void setDone({
      optimisticResponse: {
        setTaskDone: { ...task, doneAt: done ? new Date().toISOString() : null },
      },
      variables: { done, id: task.id },
    }).catch(() => toast({ message: t('common.saveFailed'), tone: 'error' }));

  const deleteTask = (task: Task) =>
    remove({
      commit: () => removeTask({ variables: { id: task.id } }),
      ids: [task.id],
      message: t('personal.tasks.deleted', { title: task.title }),
    });

  const addQuick = async (event: FormEvent) => {
    event.preventDefault();
    const title = quick.trim();
    if (!title) return;
    setQuick('');
    await create({ variables: { input: { listId, title } } }).catch(() => {
      setQuick(title);
      toast({ message: t('common.saveFailed'), tone: 'error' });
    });
  };

  const addList = async (event: FormEvent) => {
    event.preventDefault();
    const name = newList?.trim();
    if (!name) return setNewList(null);
    const result = await createList({ variables: { name } }).catch(() => null);
    setNewList(null);
    if (result?.data) pick({ list: result.data.createTaskList.id });
  };

  const row = (task: Task) => (
    <TaskRow
      key={task.id}
      listName={listId ? undefined : listName(task.listId)}
      onOpen={() => open(task.id)}
      onToggle={done => toggle(task, done)}
      task={task}
      today={today}
    />
  );

  const current = lists.find(list => list.id === listId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeading subtitle={t('personal.tasks.subtitle')}>{t('nav.tasks')}</PageHeading>
        <Button onClick={() => open('new')}>
          <PlusIcon />
          {t('personal.tasks.new')}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="flex gap-2 overflow-x-auto md:flex-col md:gap-1 md:overflow-visible">
          {[{ id: null, name: t('personal.tasks.all'), openCount: undefined }, ...lists].map(
            list => (
              <Button
                className={cn(
                  'shrink-0 justify-between gap-3 md:w-full',
                  list.id === listId && 'bg-accent text-primary'
                )}
                key={list.id ?? 'all'}
                onClick={() => pick({ list: list.id })}
                variant="ghost"
              >
                <span className="truncate">{list.name}</span>
                {list.openCount ? (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {list.openCount}
                  </span>
                ) : null}
              </Button>
            )
          )}
          {newList === null ? (
            <Button
              className="shrink-0 justify-start text-muted-foreground md:w-full"
              onClick={() => setNewList('')}
              variant="ghost"
            >
              <PlusIcon />
              {t('personal.tasks.newList')}
            </Button>
          ) : (
            <form className="shrink-0" onSubmit={event => void addList(event)}>
              <Input
                aria-label={t('personal.tasks.newList')}
                autoFocus
                maxLength={60}
                onBlur={event => void addList(event)}
                onChange={event => setNewList(event.target.value)}
                placeholder={t('personal.tasks.listName')}
                value={newList}
              />
            </form>
          )}
        </nav>

        <Card className="gap-5">
          <form className="flex gap-2" onSubmit={event => void addQuick(event)}>
            <Input
              aria-label={t('personal.tasks.quick')}
              maxLength={200}
              onChange={event => setQuick(event.target.value)}
              placeholder={t('personal.tasks.quick')}
              value={quick}
            />
            <Button disabled={!quick.trim()} type="submit">
              {t('personal.add')}
            </Button>
          </form>

          {showDone ? (
            tasks.length ? (
              <ul className="flex flex-col">{tasks.map(row)}</ul>
            ) : (
              <p className="text-sm text-muted-foreground">{t('personal.tasks.noneDone')}</p>
            )
          ) : tasks.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t('personal.tasks.empty')}
            </p>
          ) : (
            GROUPS.map(group => {
              const items = tasks.filter(task => groupOf(task, today) === group.key);
              if (!items.length) return null;
              return (
                <section className="flex flex-col gap-1" key={group.key}>
                  <h2
                    className={cn(
                      'px-2 text-sm font-medium text-muted-foreground first-letter:uppercase',
                      group.key === 'overdue' && 'text-destructive'
                    )}
                  >
                    {t(group.label)} · {items.length}
                  </h2>
                  <ul className="flex flex-col">{items.map(row)}</ul>
                </section>
              );
            })
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
            <Button onClick={() => pick({ done: showDone ? null : '1' })} size="sm" variant="ghost">
              {showDone ? t('personal.tasks.showOpen') : t('personal.tasks.showDone')}
            </Button>
            {current && (
              <Button
                onClick={() => {
                  pick({ list: null });
                  void removeList({ variables: { id: current.id } });
                }}
                size="sm"
                variant="ghost"
              >
                <Trash2Icon />
                {t('personal.tasks.deleteList', { name: current.name })}
              </Button>
            )}
          </div>
        </Card>
      </div>

      {opened && (opened === 'new' || editing) && (
        <TaskDialog
          key={opened}
          listId={listId}
          lists={lists}
          onClose={() => open(null)}
          onDelete={deleteTask}
          task={editing}
        />
      )}
    </div>
  );
}
