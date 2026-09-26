import { useMutation } from '@apollo/client/react';
import {
  AddReportedScoreDocument,
  GenerateAssessmentDocument,
  HolderDocument,
  type Bureau,
  type HolderQuery,
} from '@mny/graphql/client';
import { today } from '@mny/finance';
import type { FormEvent } from 'react';

import { formatCents, formatDate, formatPercent } from '../lib/format';
import { BAND_LABEL, ScoreBadge } from './ScoreBadge';

type Holder = NonNullable<HolderQuery['holder']>;

const BUREAUS: Record<Bureau, string> = {
  BOA_VISTA: 'Boa Vista',
  QUOD: 'Quod',
  SERASA: 'Serasa',
  SPC: 'SPC',
};

/** Gap between our Score and a Reported Score worth pointing out. */
const DIVERGENCE_POINTS = 200;

export function AssessmentPanel({ holder }: { holder: Holder }) {
  const [generate, { error, loading }] = useMutation(GenerateAssessmentDocument, {
    refetchQueries: [HolderDocument],
  });
  const [latest, ...history] = holder.assessments;

  return (
    <section className="card stack">
      <div className="row between">
        <h2>Avaliação</h2>
        <button
          disabled={loading}
          onClick={() =>
            void generate({ variables: { holderId: holder.id } }).catch(() => undefined)
          }
          type="button"
        >
          {loading ? 'Gerando…' : 'Gerar avaliação'}
        </button>
      </div>
      {error && <p className="error">{error.message}</p>}
      {latest ? (
        <>
          <div className="row">
            <ScoreBadge band={latest.band} large score={latest.score} />
            <div className="muted small">
              Score de 0 a 1000 nas faixas do SPC, calculado pelo mny a partir dos dados
              cadastrados. Não é o score de nenhum birô.
              <br />
              Pontualidade {latest.breakdown.punctuality}/500 · Capacidade{' '}
              {latest.breakdown.capacity}/300 · Utilização {latest.breakdown.utilization}/200
              <br />
              Gerada em {new Date(latest.createdAt).toLocaleString('pt-BR')} · modelo{' '}
              {latest.modelVersion}
            </div>
          </div>
          <div className="metrics">
            <Metric
              label="Pior Estágio (Res. 4.966)"
              note={
                latest.indicators.lateLast12Months
                  ? `${latest.indicators.lateLast12Months} atraso(s) quitado(s) em 12 meses`
                  : 'Sem atrasos em 12 meses'
              }
              value={`Estágio ${latest.indicators.worstStage}`}
            />
            <Metric label="Em atraso" value={formatCents(latest.indicators.overdueCents)} />
            <Metric
              label="Comprometimento de Renda"
              note={`${formatCents(latest.indicators.dueNext30DaysCents)} vencendo em 30 dias`}
              value={formatPercent(latest.indicators.incomeCommitment)}
            />
            <Metric
              label="Endividamento"
              note={`${formatCents(latest.indicators.outstandingDebtCents)} de saldo devedor`}
              value={`${latest.indicators.debtToIncome.toFixed(1).replace('.', ',')}x a renda`}
            />
            <Metric
              label="Utilização de Limite"
              value={formatPercent(latest.indicators.creditUtilization)}
            />
            <Metric
              label="Capacidade de Pagamento"
              value={formatCents(latest.indicators.paymentCapacityCents)}
            />
            <Metric
              label="Limite Sugerido"
              note="30% da renda"
              value={formatCents(latest.indicators.suggestedLimitCents)}
            />
          </div>
          {history.length > 0 && (
            <p className="muted small">
              Histórico:{' '}
              {history.map(item => (
                <span key={item.id}>
                  {item.score} ({new Date(item.createdAt).toLocaleDateString('pt-BR')}){' '}
                </span>
              ))}
            </p>
          )}
        </>
      ) : (
        <p className="muted">
          Nenhuma avaliação ainda. Cadastre as Fontes de Renda e Obrigações e gere a primeira.
        </p>
      )}
      <ReportedScores holder={holder} ourScore={latest?.score ?? null} />
    </section>
  );
}

function ReportedScores({ holder, ourScore }: { holder: Holder; ourScore: number | null }) {
  const [addReported, { error }] = useMutation(AddReportedScoreDocument, {
    refetchQueries: [HolderDocument],
  });

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    await addReported({
      variables: {
        input: {
          bureau: values.get('bureau') as Bureau,
          consultedOn: String(values.get('consultedOn')) || today(),
          holderId: holder.id,
          score: Number(values.get('score')),
        },
      },
    }).catch(() => undefined);
    form.reset();
  };

  return (
    <div className="subcard stack">
      <strong>Scores Declarados</strong>
      <span className="muted small">
        Consulte seu score gratuitamente no app do SPC ou do Serasa e informe aqui para comparar.
      </span>
      {holder.reportedScores.length > 0 && (
        <table>
          <tbody>
            {holder.reportedScores.map(reported => {
              const gap = ourScore === null ? 0 : ourScore - reported.score;
              return (
                <tr key={reported.id}>
                  <td>{BUREAUS[reported.bureau]}</td>
                  <td>
                    <ScoreBadge band={reported.band} score={reported.score} />{' '}
                    <span className="muted small">{BAND_LABEL[reported.band]}</span>
                  </td>
                  <td className="muted">consultado em {formatDate(reported.consultedOn)}</td>
                  <td className="small">
                    {Math.abs(gap) >= DIVERGENCE_POINTS && (
                      <span className="error">
                        Diverge {Math.abs(gap)} pts do Score do mny: confira se faltam dados
                        cadastrados
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <form className="row" onSubmit={submit}>
        <select defaultValue="SPC" name="bureau">
          {Object.entries(BUREAUS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <input
          max={1000}
          min={0}
          name="score"
          placeholder="Score (0–1000)"
          required
          type="number"
        />
        <input name="consultedOn" title="Data da consulta" type="date" />
        <button className="secondary" type="submit">
          Adicionar
        </button>
      </form>
      {error && <p className="error">{error.message}</p>}
    </div>
  );
}

function Metric({ label, note, value }: { label: string; note?: string; value: string }) {
  return (
    <div className="metric">
      <span className="muted small">{label}</span>
      <strong>{value}</strong>
      {note && <span className="muted small">{note}</span>}
    </div>
  );
}
