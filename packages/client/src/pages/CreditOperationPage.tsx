import { useMutation, useQuery } from '@apollo/client/react';
import { CreditOperationDocument, DeleteCreditOperationDocument } from '@mny/graphql/client';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { InstallmentStatusCell } from '../components/InstallmentStatusCell';
import { formatCents, formatDate, formatPercent } from '../lib/format';

export function CreditOperationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, loading } = useQuery(CreditOperationDocument, { variables: { id: id! } });
  const [remove] = useMutation(DeleteCreditOperationDocument);

  if (loading) return <p className="muted">Carregando…</p>;
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
    <div className="stack">
      <div>
        <Link className="muted small" to={`/titulares/${operation.holder.id}`}>
          ← {operation.holder.name}
        </Link>
        <h1>{operation.name}</h1>
        <p className="muted">
          {operation.modalityLabel}
          {operation.lender ? ` · ${operation.lender}` : ''} · {operation.system}
          {operation.collateralDescription ? ` · Bem: ${operation.collateralDescription}` : ''}
        </p>
      </div>

      <div className="metrics">
        <div className="metric">
          <span className="muted small">Valor financiado</span>
          <strong>{formatCents(operation.principalCents)}</strong>
        </div>
        <div className="metric">
          <span className="muted small">
            Taxa {operation.rateSource === 'IMPLIED' ? 'implícita' : 'informada'}
          </span>
          <strong>{formatPercent(operation.monthlyRate)} a.m.</strong>
          <span className="muted small">{formatPercent(operation.annualRate)} a.a.</span>
        </div>
        <div className="metric">
          <span className="muted small">Taxa média de mercado (Bacen)</span>
          <strong>{market ? `${formatPercent(market.monthlyRate)} a.m.` : '—'}</strong>
          {market && vsMarket != null && (
            <span className={`small ${vsMarket > 0.1 ? 'error' : 'muted'}`}>
              {vsMarket >= 0
                ? `${formatPercent(vsMarket)} acima`
                : `${formatPercent(-vsMarket)} abaixo`}{' '}
              da mediana de {market.institutions} instituições ({market.period})
            </span>
          )}
        </div>
        <div className="metric">
          <span className="muted small">Saldo devedor hoje</span>
          <strong>{formatCents(operation.outstandingBalanceCents)}</strong>
          <span className="muted small">
            {operation.paidInstallments}/{operation.termMonths} parcelas pagas
          </span>
        </div>
        <div className="metric">
          <span className="muted small">Estágio (Res. CMN 4.966)</span>
          <strong className={operation.stage > 1 ? 'error' : ''}>Estágio {operation.stage}</strong>
          <span className="muted small">
            {operation.overdueCents
              ? `${formatCents(operation.overdueCents)} em atraso`
              : 'Nenhuma parcela em atraso'}
          </span>
        </div>
        <div className="metric">
          <span className="muted small">Juros totais</span>
          <strong>{formatCents(totalInterest)}</strong>
        </div>
      </div>

      <section className="card">
        <h2>Tabela de amortização</h2>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Vencimento</th>
              <th className="num">Parcela</th>
              <th className="num">Juros</th>
              <th className="num">Amortização</th>
              <th className="num">Saldo</th>
              <th>Pagamento</th>
            </tr>
          </thead>
          <tbody>
            {operation.schedule.map(row => (
              <tr className={row.status === 'PAID' ? 'paid' : ''} key={row.number}>
                <td>{row.number}</td>
                <td>{formatDate(row.dueDate)}</td>
                <td className="num">{formatCents(row.installmentCents)}</td>
                <td className="num">{formatCents(row.interestCents)}</td>
                <td className="num">
                  {formatCents(row.amortizationCents + row.extraAmortizationCents)}
                </td>
                <td className="num">{formatCents(row.balanceCents)}</td>
                <td>
                  <InstallmentStatusCell operationId={operation.id} row={row} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <button className="danger" onClick={() => void onDelete()} type="button">
        Excluir operação
      </button>
    </div>
  );
}
