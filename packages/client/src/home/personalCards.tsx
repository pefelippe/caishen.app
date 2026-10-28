import { useMutation, useQuery } from '@apollo/client/react';
import {
  GoalsDocument,
  HomeAgendaDocument,
  HomeTodayDocument,
  NotesDocument,
  SetTaskDoneDocument,
} from '@zapbots/graphql/client';
import { PinIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { Checkbox } from '@zapbots/ui/components/checkbox';
import { Progress } from '@zapbots/ui/components/progress';
import { cn } from '@zapbots/ui/lib/utils';

import { useToast } from '../components/Toaster';
import { localToday } from '../lib/bots';
import { useI18n } from '../lib/i18n';
import {
  addDays,
  AgendaLine,
  hours,
  percentOf,
  useDayLabel,
  useGoalAmount,
} from '../pages/personal/shared';
import { Empty, Lines, Panel } from './panel';

/** Hoje: the Tarefas late or due today, checked off right here, and today's Eventos. */
export function TodayCard() {
  const { t } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const today = localToday();
  const { data } = useQuery(HomeTodayDocument, {
    fetchPolicy: 'cache-and-network',
    variables: { today },
  });
  const [setDone] = useMutation(SetTaskDoneDocument, { refetchQueries: [HomeTodayDocument] });
  const tasks = (data?.tasks ?? []).filter(task => task.dueOn && task.dueOn <= today);
  const events = (data?.agenda ?? []).filter(
    item => item.kind === 'EVENT' || item.kind === 'EXTERNAL'
  );

  return (
    <Panel
      link={{ label: t('home.today.open'), to: '/personal/tasks' }}
      title={t('home.card.today')}
    >
      {!data ? (
        <Lines count={3} />
      ) : tasks.length + events.length === 0 ? (
        <Empty>{t('home.today.empty')}</Empty>
      ) : (
        <ul className="flex flex-col gap-2">
          {events.map(event => (
            <li key={`e${event.id}`}>
              <button
                className="flex w-full items-center gap-3 text-left text-sm hover:text-primary"
                onClick={() => navigate(event.link)}
                type="button"
              >
                <span className="w-11 shrink-0 text-xs text-muted-foreground tabular-nums">
                  {hours(event.startTime) || t('home.today.allDay')}
                </span>
                <span className="truncate">{event.title}</span>
              </button>
            </li>
          ))}
          {tasks.slice(0, 8).map(task => {
            const late = task.dueOn! < today;
            return (
              <li className="flex items-center gap-3 text-sm" key={task.id}>
                <Checkbox
                  aria-label={t('personal.tasks.complete')}
                  checked={Boolean(task.doneAt)}
                  className="ml-3.5"
                  onCheckedChange={checked =>
                    void setDone({
                      optimisticResponse: {
                        setTaskDone: {
                          ...task,
                          doneAt: checked === true ? new Date().toISOString() : null,
                        },
                      },
                      variables: { done: checked === true, id: task.id },
                    }).catch(() => toast({ message: t('common.saveFailed'), tone: 'error' }))
                  }
                />
                <Link
                  className={cn(
                    'min-w-0 flex-1 truncate hover:text-primary',
                    task.doneAt && 'text-muted-foreground line-through'
                  )}
                  to={`/personal/tasks?t=${task.id}`}
                >
                  {task.title}
                </Link>
                {(late || task.dueTime) && (
                  <span
                    className={cn(
                      'shrink-0 text-xs tabular-nums',
                      late ? 'text-destructive' : 'text-muted-foreground'
                    )}
                  >
                    {late ? t('personal.tasks.overdue') : task.dueTime}
                  </span>
                )}
              </li>
            );
          })}
          {tasks.length > 8 && (
            <li className="text-sm text-muted-foreground">
              {t('home.more', { count: String(tasks.length - 8) })}
            </li>
          )}
        </ul>
      )}
    </Panel>
  );
}

/** The next 7 days: Eventos, Tarefas and bills, by day. */
export function AgendaCard() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const dayLabel = useDayLabel();
  const today = localToday();
  const { data } = useQuery(HomeAgendaDocument, {
    fetchPolicy: 'cache-and-network',
    variables: { from: addDays(today, 1), to: addDays(today, 7) },
  });
  const items = (data?.agenda ?? []).filter(item => !item.done).slice(0, 8);
  const days = [...new Set(items.map(item => item.date))];

  return (
    <Panel
      link={{ label: t('home.agenda.open'), to: '/personal/calendar' }}
      title={t('home.card.agenda')}
    >
      {!data ? (
        <Lines count={3} />
      ) : items.length === 0 ? (
        <Empty>{t('home.agenda.empty')}</Empty>
      ) : (
        <div className="flex flex-col gap-2">
          {days.map(date => (
            <section key={date}>
              <h3 className="px-2 text-xs font-medium text-muted-foreground first-letter:uppercase">
                {dayLabel(date, today)}
              </h3>
              <ul>
                {items
                  .filter(item => item.date === date)
                  .map(item => (
                    <AgendaLine
                      item={{ ...item, endTime: null }}
                      key={`${item.kind}${item.id}`}
                      onOpen={() => navigate(item.link)}
                    />
                  ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </Panel>
  );
}

/** The Metas in force, with how far each got. */
export function GoalsCard() {
  const { t } = useI18n();
  const amountOf = useGoalAmount();
  const { data } = useQuery(GoalsDocument, {
    fetchPolicy: 'cache-and-network',
    variables: { archived: false },
  });
  const goals = data?.goals ?? [];

  return (
    <Panel link={{ label: t('home.goals.open'), to: '/personal/goals' }} title={t('nav.goals')}>
      {!data ? (
        <Lines count={3} />
      ) : goals.length === 0 ? (
        <Empty>{t('home.goals.empty')}</Empty>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {goals.slice(0, 4).map(goal => (
            <li className="flex flex-col gap-1.5" key={goal.id}>
              <span className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate font-medium">{goal.title}</span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {Math.floor(percentOf(goal))}%
                </span>
              </span>
              <Progress value={percentOf(goal)} />
              <span className="text-xs text-muted-foreground">
                {goal.kind === 'CHECK'
                  ? amountOf(goal, goal.progress)
                  : t('personal.goals.of', {
                      progress: amountOf(goal, goal.progress),
                      target: amountOf(goal, goal.target),
                    })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/** The pinned Notas, each opening on Notas. */
export function NotesCard() {
  const { t } = useI18n();
  const { data } = useQuery(NotesDocument, {
    fetchPolicy: 'cache-and-network',
    variables: { pinned: true, search: null },
  });
  const notes = data?.notes ?? [];

  return (
    <Panel
      link={{ label: t('home.notes.open'), to: '/personal/notes' }}
      title={t('home.card.notes')}
    >
      {!data ? (
        <Lines count={3} />
      ) : notes.length === 0 ? (
        <Empty>{t('home.notes.empty')}</Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {notes.slice(0, 4).map(note => (
            <li key={note.id}>
              <Link className="flex gap-3 hover:text-primary" to={`/personal/notes?n=${note.id}`}>
                <PinIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="grid min-w-0 text-sm">
                  <span className="truncate font-medium">
                    {note.title || note.body.split('\n')[0] || t('personal.notes.untitled')}
                  </span>
                  {note.title && note.body && (
                    <span className="truncate text-muted-foreground">
                      {note.body.split('\n')[0]}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
