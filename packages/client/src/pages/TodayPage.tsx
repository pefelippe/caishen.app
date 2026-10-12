import { useMutation, useQuery } from '@apollo/client/react';
import { TodayDocument, UpdateTaskDocument, type BuddyArea } from '@mny/graphql/client';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

import { BuddyGlyph } from '../components/BuddyGlyph';
import { PageSkeleton } from '../components/PageSkeleton';
import { WeekMeter } from '../components/WeekMeter';
import { AREAS, localToday } from '../lib/areas';
import { formatCents, formatDate } from '../lib/format';

const shortDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });
const longDate = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'long',
  weekday: 'long',
});

interface SectionProps {
  area: BuddyArea;
  children: ReactNode;
  title: string;
}

/** One Area on the Today page: its ink on the rule, its Buddy on the title, a link to the Area. */
function Section({ area, children, title }: SectionProps) {
  return (
    <Card className="border-ink" data-area={area}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BuddyGlyph area={area} size={22} />
          {title}
        </CardTitle>
        <CardAction>
          <Link
            className="text-xs text-ink underline-offset-4 hover:underline"
            to={AREAS[area].path}
          >
            Abrir {AREAS[area].label}
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

const Empty = ({ children }: { children: ReactNode }) => (
  <p className="text-muted-foreground">{children}</p>
);

/** The home page: what matters today in each of the four Areas. */
export function TodayPage({ user }: { user: { name: string } }) {
  const { data, loading } = useQuery(TodayDocument, { fetchPolicy: 'cache-and-network' });
  const [update] = useMutation(UpdateTaskDocument, { refetchQueries: [TodayDocument] });

  if (loading && !data) return <PageSkeleton />;
  if (!data) return <p>Não foi possível carregar o seu dia.</p>;

  const today = localToday();
  const tasks = data.tasks
    .filter(
      task => task.status !== 'DONE' && (task.status === 'DOING' || (task.dueOn ?? '9') <= today)
    )
    .slice(0, 7);
  const openCount = data.tasks.filter(task => task.status !== 'DONE').length;
  const dues = data.viewerHolder.upcomingDues.slice(0, 6);
  const dueTotal = data.viewerHolder.upcomingDues.reduce((sum, due) => sum + due.amountCents, 0);
  const date = longDate.format(new Date());

  return (
    <div className="flex flex-col gap-10">
      <header>
        <span className="text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase">
          Hoje
        </span>
        <h1 className="first-letter:uppercase">{date}</h1>
        <p className="mt-1 text-muted-foreground">
          Olá, {user.name.split(' ')[0]}. Este é o resumo das suas quatro Áreas.
        </p>
      </header>

      <div className="grid gap-x-12 gap-y-4 lg:grid-cols-2">
        <Section area="WORK" title="Para hoje">
          {tasks.length ? (
            <ul className="flex flex-col divide-y">
              {tasks.map(task => (
                <li className="flex items-start gap-3 py-2" key={task.id}>
                  <Checkbox
                    aria-label="Concluir Tarefa"
                    className="mt-0.5"
                    onCheckedChange={() =>
                      void update({ variables: { id: task.id, input: { status: 'DONE' } } })
                    }
                  />
                  <span className="min-w-0 flex-1">
                    {task.title}
                    {task.project && (
                      <span className="text-muted-foreground"> · {task.project.name}</span>
                    )}
                  </span>
                  <span
                    className={cn(
                      'shrink-0 tabular-nums',
                      task.dueOn && task.dueOn < today
                        ? 'text-destructive'
                        : 'text-muted-foreground'
                    )}
                  >
                    {task.dueOn ? formatDate(task.dueOn).slice(0, 5) : 'fazendo'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>
              {openCount
                ? `Nada vence hoje. Há ${openCount} ${openCount === 1 ? 'Tarefa aberta' : 'Tarefas abertas'} sem pressa.`
                : 'Nenhuma Tarefa aberta.'}
            </Empty>
          )}
          {data.focus.today.length > 0 && (
            <p className="mt-3 border-t pt-2 text-muted-foreground tabular-nums">
              Foco hoje: {data.focus.todayMinutes} min em {data.focus.today.length}{' '}
              {data.focus.today.length === 1 ? 'Pomodoro' : 'Pomodoros'}.
            </p>
          )}
        </Section>

        <Section area="FINANCE" title="A vencer em 30 dias">
          {dues.length ? (
            <>
              <ul className="flex flex-col divide-y">
                {dues.map((due, index) => (
                  <li className="flex items-baseline gap-3 py-2" key={index}>
                    <span className="w-12 shrink-0 text-muted-foreground tabular-nums">
                      {formatDate(due.dueDate).slice(0, 5)}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{due.label}</span>
                    <span className="shrink-0 tabular-nums">{formatCents(due.amountCents)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 flex justify-between border-t border-foreground/60 pt-2 font-medium">
                Total <span className="tabular-nums">{formatCents(dueTotal)}</span>
              </p>
            </>
          ) : (
            <Empty>Nenhuma Parcela ou Fatura a vencer nos próximos 30 dias.</Empty>
          )}
        </Section>

        <Section area="FITNESS" title="Semana de Treinos">
          <WeekMeter week={data.fitnessWeek} />
        </Section>

        <Section area="NOTES" title="Anotações recentes">
          {data.notes.length ? (
            <ul className="flex flex-col divide-y">
              {data.notes.slice(0, 5).map(note => (
                <li className="flex items-baseline gap-3 py-2" key={note.id}>
                  <Link
                    className="min-w-0 flex-1 truncate underline-offset-4 hover:underline"
                    to={`/anotacoes/${note.id}`}
                  >
                    {note.title}
                  </Link>
                  <span className="shrink-0 text-muted-foreground tabular-nums">
                    {shortDate.format(new Date(note.updatedAt))}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Nenhuma Anotação ainda.</Empty>
          )}
        </Section>
      </div>
    </div>
  );
}
