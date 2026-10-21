import { useLazyQuery, useMutation, useQuery } from '@apollo/client/react';
import {
  AddExtraAmortizationDocument,
  CreditOperationDocument,
  DeleteCreditOperationDocument,
  PrepaymentSimulationDocument,
  RemoveExtraAmortizationDocument,
  type CreditOperationQuery,
} from '@zapbots/graphql/client';
import { XIcon } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

import { BackLink } from '../components/BackLink';
import { FormError } from '../components/FormError';
import { InstallmentStatusCell } from '../components/InstallmentStatusCell';
import { Metric, Metrics } from '../components/Metric';
import { PageSkeleton } from '../components/PageSkeleton';
import { localToday } from '../lib/bots';
import { formatCents, formatDate, formatPercent, parseCents } from '../lib/format';

export function CreditOperationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading } = useQuery(CreditOperationDocument, { variables: { id: id! } });
  const [remove] = useMutation(DeleteCreditOperationDocument);

  if (loading) return <PageSkeleton />;
  const operation = data?.creditOperation;
  if (!operation) return <p>Operação não encontrada.</p>;

  const totalInterest = operation.schedule.reduce((sum, row) => sum + row.interestCents, 0);
  const market = operation.marketRate;
  const vsMarket = market ? operation.monthlyRate / market.monthlyRate - 1 : null;

  // Back to the section the Operation is listed in.
  const section = '/caishen/debts';
  const sectionLabel = 'Dívidas';

  const onDelete = async () => {
    await remove({ variables: { id: operation.id } });
    navigate(section);
  };

  return (
    <div className="flex flex-col gap-8" data-bot="FINANCE">
      <div>
        <BackLink to={section}>{sectionLabel}</BackLink>
        <h1>{operation.name}</h1>
        <p className="text-muted-foreground">
          {operation.modalityLabel}
          {operation.lender ? ` · ${operation.lender}` : ''} · {operation.system}
          {operation.collateralDescription ? ` · Bem: ${operation.collateralDescription}` : ''}
        </p>
      </div>

      <Metrics>
        <Metric label="Valor financiado" value={formatCents(operation.principalCents)} />
        <Metric
          label={`Taxa ${operation.rateSource === 'IMPLIED' ? 'implícita' : 'informada'}`}
          note={`${formatPercent(operation.annualRate)} a.a.`}
          value={`${formatPercent(operation.monthlyRate)} a.m.`}
        />
        <Metric
          label="Taxa média de mercado (Bacen)"
          note={
            market &&
            vsMarket != null &&
            `${
              vsMarket >= 0
                ? `${formatPercent(vsMarket)} acima`
                : `${formatPercent(-vsMarket)} abaixo`
            } da mediana de ${market.institutions} instituições (${market.period})`
          }
          noteClassName={cn(vsMarket != null && vsMarket > 0.1 && 'text-destructive')}
          value={market ? `${formatPercent(market.monthlyRate)} a.m.` : '—'}
        />
        <Metric
          label="Saldo devedor hoje"
          note={`${operation.paidInstallments}/${operation.termMonths} parcelas pagas`}
          value={formatCents(operation.outstandingBalanceCents)}
        />
        <Metric
          label="Estágio (Res. CMN 4.966)"
          note={
            operation.overdueCents
              ? `${formatCents(operation.overdueCents)} em atraso`
              : 'Nenhuma parcela em atraso'
          }
          value={`Estágio ${operation.stage}`}
          valueClassName={cn(operation.stage > 1 && 'text-destructive')}
        />
        <Metric label="Juros totais" value={formatCents(totalInterest)} />
      </Metrics>

      <Card>
        <CardHeader>
          <CardTitle>Tabela de amortização</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Parcela</TableHead>
                <TableHead className="text-right">Juros</TableHead>
                <TableHead className="text-right">Amortização</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead>Pagamento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {operation.schedule.map(row => (
                <TableRow
                  className={cn(row.status === 'PAID' && 'text-muted-foreground')}
                  key={row.number}
                >
                  <TableCell>{row.number}</TableCell>
                  <TableCell>{formatDate(row.dueDate)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCents(row.installmentCents)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCents(row.interestCents)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCents(row.amortizationCents + row.extraAmortizationCents)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCents(row.balanceCents)}
                  </TableCell>
                  <TableCell>
                    <InstallmentStatusCell operationId={operation.id} row={row} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ExtraAmortizations operation={operation} />

      <Button className="self-start" onClick={() => void onDelete()} variant="destructive">
        Excluir operação
      </Button>
    </div>
  );
}

type Operation = NonNullable<CreditOperationQuery['creditOperation']>;

/** Payments outside the schedule; each one shortens the table above. */
function ExtraAmortizations({ operation }: { operation: Operation }) {
  const refetchQueries = [CreditOperationDocument];
  const [add, { error }] = useMutation(AddExtraAmortizationDocument, { refetchQueries });
  const [remove] = useMutation(RemoveExtraAmortizationDocument, { refetchQueries });
  const [simulate, simulation] = useLazyQuery(PrepaymentSimulationDocument);
  const [amount, setAmount] = useState('');
  const amountCents = parseCents(amount);
  const effect = simulation.data?.creditOperation?.prepayment;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const amountCents = parseCents(String(values.get('amount')));
    if (amountCents == null) return;
    await add({
      variables: {
        amountCents,
        creditOperationId: operation.id,
        date: String(values.get('date') || localToday()),
      },
    })
      .then(() => {
        form.reset();
        setAmount('');
      })
      .catch(() => undefined);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Amortizações Extraordinárias</CardTitle>
        <CardDescription>
          Um pagamento fora do cronograma reduz o Saldo Devedor e encurta a tabela.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {operation.extraAmortizations.length > 0 && (
          <Table className="max-w-md">
            <TableBody>
              {operation.extraAmortizations.map(extra => (
                <TableRow key={extra.id}>
                  <TableCell className="text-muted-foreground tabular-nums">
                    {formatDate(extra.date)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCents(extra.amountCents)}
                  </TableCell>
                  <TableCell className="w-8">
                    <Button
                      aria-label="Remover Amortização Extraordinária"
                      className="text-muted-foreground"
                      onClick={() => void remove({ variables: { id: extra.id } })}
                      size="icon-xs"
                      variant="ghost"
                    >
                      <XIcon />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <form className="flex flex-wrap items-center gap-2" onSubmit={submit}>
          <Input
            aria-label="Data"
            className="w-auto bg-card"
            defaultValue={localToday()}
            name="date"
            type="date"
          />
          <Input
            className="w-44 bg-card"
            name="amount"
            onChange={event => setAmount(event.target.value)}
            placeholder="Valor (R$)"
            required
            value={amount}
          />
          <Button
            disabled={amountCents == null || amountCents <= 0}
            onClick={() =>
              void simulate({ variables: { amountCents: amountCents!, id: operation.id } })
            }
            type="button"
            variant="ghost"
          >
            Simular
          </Button>
          <Button type="submit" variant="outline">
            Amortizar
          </Button>
        </form>
        {effect && (
          <p className="text-muted-foreground">
            Pagando{' '}
            <span className="text-foreground tabular-nums">
              {formatCents(simulation.variables?.amountCents)}
            </span>{' '}
            amanhã, você economiza{' '}
            <span className="text-foreground tabular-nums">
              {formatCents(effect.interestSavedCents)}
            </span>{' '}
            de juros e {effect.installmentsSaved}{' '}
            {effect.installmentsSaved === 1 ? 'Parcela' : 'Parcelas'}.
          </p>
        )}
        {simulation.error && <FormError message={simulation.error.message} />}
        {error && <FormError message={error.message} />}
      </CardContent>
    </Card>
  );
}
