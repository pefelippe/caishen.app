import { useLazyQuery } from '@apollo/client/react';
import { PayoffPlanDocument } from '@zapbots/graphql/client';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

import { formatCents, formatDate, parseCents } from '../lib/format';
import { FormError } from './FormError';

/**
 * Plano de Quitação: how much sooner the Holder is debt-free putting a fixed amount a month into
 * the dearest Credit Operation first.
 */
export function PayoffPlanPanel({ holderId }: { holderId: string }) {
  const [amount, setAmount] = useState('500,00');
  const [load, { data, error, loading, variables }] = useLazyQuery(PayoffPlanDocument);
  const plan = data?.holder?.payoffPlan;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const monthlyExtraCents = parseCents(amount);
    if (monthlyExtraCents == null || monthlyExtraCents <= 0) return;
    void load({ variables: { id: holderId, monthlyExtraCents } });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plano de Quitação</CardTitle>
        <CardDescription>
          Quanto antes você fica sem dívidas pondo um valor fixo por mês, sempre na Operação de
          maior taxa.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form className="flex flex-wrap items-center gap-2" onSubmit={submit}>
          <Input
            aria-label="Valor a mais por mês"
            className="w-44 bg-card"
            onChange={event => setAmount(event.target.value)}
            placeholder="Valor por mês (R$)"
            value={amount}
          />
          <Button disabled={loading} type="submit" variant="outline">
            Calcular
          </Button>
        </form>
        {plan && !plan.debtFreeOn && (
          <p className="text-muted-foreground">Não há Operações de Crédito para quitar.</p>
        )}
        {plan?.debtFreeOn && (
          <div className="flex flex-col gap-3">
            <p>
              Com <span className="tabular-nums">{formatCents(variables?.monthlyExtraCents)}</span>{' '}
              a mais por mês, você fica sem dívidas em{' '}
              <span className="tabular-nums">{formatDate(plan.debtFreeOn)}</span> em vez de{' '}
              <span className="tabular-nums">{formatDate(plan.debtFreeWithoutPlanOn)}</span> e
              economiza <span className="tabular-nums">{formatCents(plan.interestSavedCents)}</span>{' '}
              de juros.
            </p>
            <ol className="flex max-w-md flex-col divide-y">
              {plan.payoffs.map((payoff, index) => (
                <li className="flex items-baseline gap-3 py-1.5" key={payoff.creditOperationId}>
                  <span className="w-5 text-muted-foreground tabular-nums">{index + 1}.</span>
                  <Link
                    className="min-w-0 flex-1 truncate underline-offset-4 hover:underline"
                    to={`/caishen/operacoes/${payoff.creditOperationId}`}
                  >
                    {payoff.name}
                  </Link>
                  <span className="text-muted-foreground tabular-nums">
                    {formatDate(payoff.paidOffOn)}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}
        {error && <FormError message={error.message} />}
      </CardContent>
    </Card>
  );
}
