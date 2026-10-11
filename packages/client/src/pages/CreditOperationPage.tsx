import { useMutation, useQuery } from '@apollo/client/react';
import { CreditOperationDocument, DeleteCreditOperationDocument } from '@mny/graphql/client';
import { useNavigate, useParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { InstallmentStatusCell } from '../components/InstallmentStatusCell';
import { Metric, Metrics } from '../components/Metric';
import { PageSkeleton } from '../components/PageSkeleton';
import { formatCents, formatDate, formatPercent } from '../lib/format';

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

  const onDelete = async () => {
    await remove({ variables: { id: operation.id } });
    navigate(`/titulares/${operation.holder.id}`);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <BackLink to={`/titulares/${operation.holder.id}`}>{operation.holder.name}</BackLink>
        <h1 className="text-2xl font-semibold">{operation.name}</h1>
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

      <Button className="self-start" onClick={() => void onDelete()} variant="destructive">
        Excluir operação
      </Button>
    </div>
  );
}
