import { useQuery } from '@apollo/client/react';
import { PublicWorkoutPlanDocument } from '@zapbots/graphql/client';
import { formatDecimal } from '@zapbots/fitness';
import { PrinterIcon } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { Logo } from '@zapbots/ui/blocks/logo';
import { PageSkeleton } from '@zapbots/ui/blocks/page-skeleton';
import { Badge } from '@zapbots/ui/components/badge';
import { Button } from '@zapbots/ui/components/button';
import { Card } from '@zapbots/ui/components/card';

import { QueryError } from '../components/QueryError';
import { weekdayNames } from './personal/shared';

/**
 * `/w/:token`: a Ficha de treino someone shared, open to anyone with the link, signed in or out.
 * pt-BR only, light, and made to print.
 */
export function WorkoutSharePage() {
  const { token = '' } = useParams();
  const { data, error, loading } = useQuery(PublicWorkoutPlanDocument, { variables: { token } });
  const names = weekdayNames('pt');

  if (loading && !data) return <PageSkeleton />;
  const plan = data?.publicWorkoutPlan;

  return (
    <div className="min-h-svh bg-background text-foreground print:bg-white">
      <header className="border-b bg-card print:hidden">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link className="flex items-center gap-2.5 text-header" to="/landing">
            <Logo size={24} />
            <span className="text-lg font-semibold tracking-tight text-foreground">Caishen</span>
          </Link>
          {plan && (
            <Button onClick={() => window.print()} size="sm" variant="outline">
              <PrinterIcon />
              Imprimir
            </Button>
          )}
        </div>
      </header>
      <main className="page-enter mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12 print:p-0">
        {error ? (
          <QueryError error={error} title="Não foi possível abrir a ficha" />
        ) : !plan ? (
          <Card className="items-center gap-2 text-center">
            <h1 className="text-xl font-semibold">Ficha indisponível</h1>
            <p className="text-muted-foreground">
              Esse link não existe ou deixou de ser compartilhado.
            </p>
          </Card>
        ) : (
          <Card className="gap-5 print:border-0 print:shadow-none">
            <header>
              <p className="text-sm text-muted-foreground">
                {plan.forName ? `Para ${plan.forName} · ` : ''}por {plan.ownerName}
              </p>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{plan.name}</h1>
              {plan.weekdays.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {plan.weekdays.map(day => (
                    <Badge className="capitalize" key={day} variant="secondary">
                      {names[day]?.replace('.', '')}
                    </Badge>
                  ))}
                </div>
              )}
            </header>
            <ol className="flex flex-col divide-y">
              {plan.exercises.map((exercise, index) => (
                <li className="flex gap-4 py-3" key={exercise.id}>
                  <span className="w-6 shrink-0 pt-0.5 text-sm text-muted-foreground tabular-nums">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                      <p className="font-medium">{exercise.name}</p>
                      <p className="text-sm tabular-nums">
                        <span className="font-semibold">
                          {exercise.sets} × {exercise.reps || '—'}
                        </span>
                        {exercise.loadGrams !== null && exercise.loadGrams !== undefined && (
                          <span> · {formatDecimal(exercise.loadGrams, 3)} kg</span>
                        )}
                        {exercise.restSeconds ? (
                          <span className="text-muted-foreground">
                            {' '}
                            · descanso {exercise.restSeconds}s
                          </span>
                        ) : null}
                      </p>
                    </div>
                    {exercise.notes && (
                      <p className="text-sm text-muted-foreground">{exercise.notes}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
            {plan.notes && (
              <p className="rounded-xl bg-muted p-4 text-sm whitespace-pre-line">{plan.notes}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Ficha anotada no Caishen. Não substitui a orientação de um profissional de educação
              física: em caso de dor ou dúvida, pare e procure um.
            </p>
          </Card>
        )}
      </main>
    </div>
  );
}
