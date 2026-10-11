import { useMutation, useQuery } from '@apollo/client/react';
import {
  DeleteWorkoutDocument,
  FitnessDocument,
  LogWorkoutDocument,
  SetWeeklyGoalDocument,
  type FitnessWeekFieldsFragment,
} from '@mny/graphql/client';
import { Trash2Icon } from 'lucide-react';
import type { FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

import { AreaPage } from '../components/AreaPage';
import { FormError } from '../components/FormError';
import { PageSkeleton } from '../components/PageSkeleton';
import { localToday } from '../lib/areas';
import { formatDate } from '../lib/format';

const NO_GOAL = '0';

const SUGGESTIONS = [
  'Como está minha semana de Treinos?',
  'Registre uma corrida de 30 minutos hoje',
  'Qual foi meu Treino mais longo este mês?',
];

export function FitnessPage() {
  const { data, loading } = useQuery(FitnessDocument);
  const [logWorkout, { error }] = useMutation(LogWorkoutDocument, {
    refetchQueries: [FitnessDocument],
  });
  const [deleteWorkout] = useMutation(DeleteWorkoutDocument, { refetchQueries: [FitnessDocument] });
  const [setGoal] = useMutation(SetWeeklyGoalDocument, { refetchQueries: [FitnessDocument] });

  if (loading && !data) return <PageSkeleton />;
  if (!data) return <p>Não foi possível carregar seus Treinos.</p>;
  const week = data.fitnessWeek;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    await logWorkout({
      variables: {
        input: {
          date: String(values.get('date') || localToday()),
          durationMinutes: Number(values.get('minutes')),
          kind: String(values.get('kind') ?? ''),
          notes: String(values.get('notes') ?? '').trim() || null,
        },
      },
    })
      .then(() => form.reset())
      .catch(() => undefined);
  };

  return (
    <AreaPage
      area="FITNESS"
      description="Treinos registrados e a Meta Semanal, de segunda a domingo."
      suggestions={SUGGESTIONS}
      title="Fitness"
    >
      <Card>
        <CardHeader>
          <CardTitle>Esta semana</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end justify-between gap-6">
          <WeekMeter week={week} />
          <div className="flex items-center gap-2 text-muted-foreground">
            Meta Semanal
            <Select
              onValueChange={value => {
                if (value !== NO_GOAL) {
                  void setGoal({ variables: { workoutsPerWeek: Number(value) } });
                }
              }}
              value={String(week.goal ?? NO_GOAL)}
            >
              <SelectTrigger aria-label="Meta Semanal" className="w-36 bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {week.goal == null && <SelectItem value={NO_GOAL}>Sem meta</SelectItem>}
                {[1, 2, 3, 4, 5, 6, 7].map(count => (
                  <SelectItem key={count} value={String(count)}>
                    {count} {count === 1 ? 'Treino' : 'Treinos'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Últimas semanas</CardTitle>
        </CardHeader>
        <CardContent>
          <WeekHistory weeks={data.fitnessHistory} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registrar Treino</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <form className="flex flex-wrap items-center gap-2" onSubmit={submit}>
            <Input
              aria-label="Data"
              className="w-auto bg-card"
              defaultValue={localToday()}
              name="date"
              type="date"
            />
            <Input
              className="w-48 bg-card"
              name="kind"
              placeholder="Corrida, musculação…"
              required
            />
            <Input
              className="w-28 bg-card"
              min={1}
              name="minutes"
              placeholder="Minutos"
              required
              type="number"
            />
            <Input
              className="min-w-40 flex-1 bg-card"
              name="notes"
              placeholder="Observação (opcional)"
            />
            <Button type="submit">Registrar</Button>
          </form>
          {error && <FormError message={error.message} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Treinos</CardTitle>
        </CardHeader>
        <CardContent>
          {data.workouts.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Treino</TableHead>
                  <TableHead>Observação</TableHead>
                  <TableHead className="text-right">Duração</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.workouts.map(workout => (
                  <TableRow className="group" key={workout.id}>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {formatDate(workout.date)}
                    </TableCell>
                    <TableCell>{workout.kind}</TableCell>
                    <TableCell className="text-muted-foreground">{workout.notes}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {workout.durationMinutes} min
                    </TableCell>
                    <TableCell>
                      <Button
                        aria-label="Excluir Treino"
                        className="text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                        onClick={() => void deleteWorkout({ variables: { id: workout.id } })}
                        size="icon-xs"
                        variant="ghost"
                      >
                        <Trash2Icon />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground">Nenhum Treino registrado ainda.</p>
          )}
        </CardContent>
      </Card>
    </AreaPage>
  );
}

/** The week as a row of marks: one per Treino of the Meta Semanal, inked as they get done. */
export function WeekMeter({
  className,
  week,
}: {
  className?: string;
  week: FitnessWeekFieldsFragment;
}) {
  const slots = Math.max(week.goal ?? 0, week.done);
  return (
    <div className={cn('flex flex-col gap-2', className)} data-area="FITNESS">
      <div className="flex items-baseline gap-2">
        <span className="font-serif text-5xl leading-none">{week.done}</span>
        <span className="text-muted-foreground">
          {week.goal ? `de ${week.goal} Treinos` : week.done === 1 ? 'Treino' : 'Treinos'} ·{' '}
          <span className="tabular-nums">{week.minutes} min</span>
        </span>
      </div>
      {slots > 0 && (
        <div aria-hidden className="flex gap-1.5">
          {Array.from({ length: slots }, (_, index) => (
            <span
              className={cn(
                'h-2 w-9 rounded-full border border-ink',
                index < week.done ? 'bg-ink' : 'bg-transparent'
              )}
              key={index}
            />
          ))}
        </div>
      )}
      <span className="text-xs text-muted-foreground tabular-nums">
        {formatDate(week.weekStart)} a {formatDate(week.weekEnd)}
      </span>
    </div>
  );
}

/** One column per week, as tall as its Treinos; the line marks the Meta Semanal. */
function WeekHistory({ weeks }: { weeks: FitnessWeekFieldsFragment[] }) {
  const goal = weeks[0]?.goal ?? 0;
  const top = Math.max(goal, ...weeks.map(week => week.done), 1);
  return (
    <div className="flex max-w-xl items-end gap-3" data-area="FITNESS">
      {weeks.map(week => (
        <div
          className="flex flex-1 flex-col items-center gap-1.5"
          key={week.weekStart}
          title={`${formatDate(week.weekStart)} a ${formatDate(week.weekEnd)}: ${week.done} Treinos, ${week.minutes} min`}
        >
          <span className="text-xs tabular-nums">{week.done}</span>
          <div className="relative flex h-24 w-full items-end border-b border-foreground/60">
            {goal > 0 && (
              <span
                aria-hidden
                className="absolute inset-x-0 border-t border-dashed border-ink/50"
                style={{ bottom: `${(goal / top) * 100}%` }}
              />
            )}
            <span
              className={cn('w-full', goal && week.done >= goal ? 'bg-ink' : 'bg-ink/45')}
              style={{ height: `${(week.done / top) * 100}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatDate(week.weekStart).slice(0, 5)}
          </span>
        </div>
      ))}
    </div>
  );
}
