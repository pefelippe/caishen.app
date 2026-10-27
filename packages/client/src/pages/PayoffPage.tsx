import { useQuery } from '@apollo/client/react';
import { PayoffDocument } from '@zapbots/graphql/client';
import { FlagIcon } from 'lucide-react';
import { useDeferredValue, useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@zapbots/ui/components/button';
import { Card } from '@zapbots/ui/components/card';
import { Input } from '@zapbots/ui/components/input';
import { Skeleton } from '@zapbots/ui/components/skeleton';
import { cn } from '@zapbots/ui/lib/utils';

import { BotPage } from '../components/BotPage';
import { formatCents, formatPercent, parseCents } from '../lib/format';

/** Amounts a month to try with one tap, in cents. */
const PRESETS = [10_000, 30_000, 50_000, 100_000];

/** "março de 2028" for a `YYYY-MM-DD` date. */
const monthOf = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

/**
 * Sair das dívidas: how much more a month the User can put towards the debts, and what the
 * Plano de Quitação does with it (the dearest Operation first): the day the last one ends, the
 * interest saved, and when each is paid off. All of it computed on the server, as it changes.
 */
export function PayoffPage() {
  const [typed, setTyped] = useState('300,00');
  const extraCents = Math.max(0, parseCents(typed) ?? 0);
  const deferred = useDeferredValue(extraCents);
  const { data, previousData } = useQuery(PayoffDocument, {
    variables: { monthlyExtraCents: deferred },
  });
  const holder = (data ?? previousData)?.viewerHolder;
  const plan = holder?.payoffPlan;
  const operations = holder?.creditOperations ?? [];
  const byId = new Map(operations.map(operation => [operation.id, operation]));

  return (
    <BotPage
      bot="FINANCE"
      description="Quanto a mais por mês você consegue pôr nas dívidas? O Caishen paga primeiro a de juros mais altos e mostra quando você fica livre."
      title="Sair das dívidas"
    >
      {holder && operations.length === 0 ? (
        <Card className="items-start">
          <p>Você não tem empréstimos nem financiamentos cadastrados.</p>
          <Button asChild variant="outline">
            <Link to="/caishen/fixed#loans">Cadastrar uma dívida</Link>
          </Button>
        </Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <Card>
            <label className="flex flex-col gap-2" htmlFor="payoff-extra">
              <span className="font-semibold">A mais por mês</span>
              <span className="text-sm text-muted-foreground">
                Além das parcelas, a partir de amanhã.
              </span>
            </label>
            <div className="flex items-center gap-2 rounded-2xl bg-muted px-4">
              <span className="text-muted-foreground">R$</span>
              <Input
                className="h-14 border-0 bg-transparent px-0 font-display text-3xl font-light tracking-[-0.022em] tabular-nums shadow-none focus-visible:ring-0 md:text-2xl"
                id="payoff-extra"
                inputMode="decimal"
                onChange={event => setTyped(event.target.value)}
                value={typed}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(cents => (
                <Button
                  className={cn(
                    'rounded-full',
                    cents === extraCents && 'bg-primary text-primary-foreground hover:bg-primary'
                  )}
                  key={cents}
                  onClick={() => setTyped(formatCents(cents).replace(/^R\$\s?/, ''))}
                  size="sm"
                  variant="secondary"
                >
                  {formatCents(cents)}
                </Button>
              ))}
            </div>
          </Card>

          <Card className="gap-6">
            {!plan ? (
              <div className="flex flex-col gap-3">
                <Skeleton className="h-10 w-2/3" />
                <Skeleton className="h-5 w-1/2" />
              </div>
            ) : (
              <>
                <div className="flex items-start gap-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-accent text-primary">
                    <FlagIcon className="size-6" />
                  </span>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm text-muted-foreground">Sem dívidas em</span>
                    <strong className="text-3xl font-semibold tracking-tight first-letter:uppercase">
                      {plan.debtFreeOn ? monthOf(plan.debtFreeOn) : '—'}
                    </strong>
                    {plan.debtFreeWithoutPlanOn && (
                      <span className="text-sm text-muted-foreground">
                        Só com as parcelas: {monthOf(plan.debtFreeWithoutPlanOn)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="rounded-2xl bg-muted p-4">
                  <span className="text-sm text-muted-foreground">
                    Juros que você deixa de pagar
                  </span>
                  <p className="text-2xl font-semibold text-success tabular-nums">
                    {formatCents(plan.interestSavedCents)}
                  </p>
                </div>
                <ol className="flex flex-col gap-2">
                  {plan.payoffs.map(payoff => {
                    const operation = byId.get(payoff.creditOperationId);
                    return (
                      <li key={payoff.creditOperationId}>
                        <Link
                          className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-muted"
                          to={`/caishen/operations/${payoff.creditOperationId}`}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{payoff.name}</span>
                            {operation && (
                              <span className="text-sm text-muted-foreground tabular-nums">
                                {formatPercent(operation.monthlyRate)} ao mês ·{' '}
                                {formatCents(operation.outstandingBalanceCents)} hoje
                              </span>
                            )}
                          </span>
                          <span className="text-right text-sm tabular-nums">
                            <span className="block text-muted-foreground">quitada em</span>
                            <span className="first-letter:uppercase">
                              {monthOf(payoff.paidOffOn)}
                            </span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              </>
            )}
          </Card>
        </div>
      )}
    </BotPage>
  );
}
