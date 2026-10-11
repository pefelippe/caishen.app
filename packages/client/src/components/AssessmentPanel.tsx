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

import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';

import { formatCents, formatDate, formatPercent } from '../lib/format';
import { FormError } from './FormError';
import { Metric, Metrics } from './Metric';
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
    <Card>
      <CardHeader>
        <CardTitle>Avaliação</CardTitle>
        <CardAction>
          <Button
            disabled={loading}
            onClick={() =>
              void generate({ variables: { holderId: holder.id } }).catch(() => undefined)
            }
          >
            {loading ? 'Gerando…' : 'Gerar avaliação'}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {error && <FormError message={error.message} />}
        {latest ? (
          <>
            <div className="flex flex-wrap items-center gap-4">
              <ScoreBadge band={latest.band} large score={latest.score} />
              <p className="text-xs text-muted-foreground">
                Score de 0 a 1000 nas faixas do SPC, calculado pelo mny a partir dos dados
                cadastrados. Não é o score de nenhum birô.
                <br />
                Pontualidade {latest.breakdown.punctuality}/500 · Capacidade{' '}
                {latest.breakdown.capacity}/300 · Utilização {latest.breakdown.utilization}/200
                <br />
                Gerada em {new Date(latest.createdAt).toLocaleString('pt-BR')} · modelo{' '}
                {latest.modelVersion}
              </p>
            </div>
            <Metrics>
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
                note={
                  latest.indicators.scrDebtCents != null
                    ? `${formatCents(latest.indicators.scrDebtCents)} no SCR (${latest.indicators.scrReferenceMonth})`
                    : `${formatCents(latest.indicators.outstandingDebtCents)} de saldo devedor`
                }
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
            </Metrics>
            {history.length > 0 && (
              <p className="text-xs text-muted-foreground">
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
          <p className="text-muted-foreground">
            Nenhuma avaliação ainda. Cadastre as Fontes de Renda e Obrigações e gere a primeira.
          </p>
        )}
        <ReportedScores holder={holder} ourScore={latest?.score ?? null} />
      </CardContent>
    </Card>
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
    <Card className="gap-4 py-4 shadow-none">
      <CardHeader className="px-4">
        <CardTitle className="text-base">Scores Declarados</CardTitle>
        <CardDescription>
          Consulte seu score gratuitamente no app do SPC ou do Serasa e informe aqui para comparar.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-4">
        {holder.reportedScores.length > 0 && (
          <Table>
            <TableBody>
              {holder.reportedScores.map(reported => {
                const gap = ourScore === null ? 0 : ourScore - reported.score;
                return (
                  <TableRow key={reported.id}>
                    <TableCell>{BUREAUS[reported.bureau]}</TableCell>
                    <TableCell>
                      <ScoreBadge band={reported.band} score={reported.score} />{' '}
                      <span className="text-xs text-muted-foreground">
                        {BAND_LABEL[reported.band]}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      consultado em {formatDate(reported.consultedOn)}
                    </TableCell>
                    <TableCell className="text-xs whitespace-normal">
                      {Math.abs(gap) >= DIVERGENCE_POINTS && (
                        <span className="text-destructive">
                          Diverge {Math.abs(gap)} pts do Score do mny: confira se faltam dados
                          cadastrados
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        <form className="flex flex-wrap items-center gap-2" onSubmit={submit}>
          <Select defaultValue="SPC" name="bureau">
            <SelectTrigger aria-label="Birô">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(BUREAUS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            className="w-40"
            max={1000}
            min={0}
            name="score"
            placeholder="Score (0–1000)"
            required
            type="number"
          />
          <Input className="w-auto" name="consultedOn" title="Data da consulta" type="date" />
          <Button type="submit" variant="outline">
            Adicionar
          </Button>
        </form>
        {error && <FormError message={error.message} />}
      </CardContent>
    </Card>
  );
}
