import type { Viewer } from '@zapbots/auth';
import { db, schema, type AssessmentRow } from '@zapbots/database';
import {
  amortizationSchedule,
  dateOf,
  Decimal,
  MODALITIES,
  outstandingBalance,
  payoffOutlook,
  prepaymentEffect,
  today,
  type Indicators,
  type ScoreBreakdown,
} from '@zapbots/finance';
import { desc, eq, inArray } from 'drizzle-orm';

import { marketRate, marketRates } from '../bacen';
import { monthlyIncome, payoffPlanFor, scheduleInputFor, upcomingDues } from '../obligations';
import { viewerHolder } from '../viewerHolder';
import type { BotKey } from './catalog';

// Values reach the Model already computed and formatted; it never does the math (ADR 0009).
const brl = new Intl.NumberFormat('pt-BR', { currency: 'BRL', style: 'currency' });
const money = (cents: number | null | undefined) =>
  // Assessments saved by older scoring models may lack an amount; the Model must not see "NaN".
  cents == null || !Number.isFinite(cents) ? 'sem dado' : brl.format(cents / 100);
const day = (iso: string) => iso.split('-').reverse().join('/');
const usd = new Intl.NumberFormat('pt-BR', { currency: 'USD', style: 'currency' });
const dollars = (cents: number) => usd.format(cents / 100);
const list = (lines: string[], empty: string) =>
  lines.length ? lines.map(line => `- ${line}`).join('\n') : empty;

const BAND = { HIGH: 'risco alto', LOW: 'risco baixo', MEDIUM: 'risco médio' } as const;
const RECENT_STATEMENTS = 3;
const month = (yearMonth: string) => yearMonth.split('-').reverse().join('/');
/** A ratio as "23,4%". */
const share = (ratio: number | null | undefined) =>
  // Assessments saved by older scoring models may lack an Indicator.
  ratio == null || !Number.isFinite(ratio)
    ? 'sem dado'
    : `${new Decimal(ratio).times(100).toFixed(1).replace('.', ',')}%`;

const COMPONENTS = {
  capacity: 'capacidade',
  punctuality: 'pontualidade',
  utilization: 'utilização',
} as const;

/** How the Score moved since the previous Assessment, component by component, already computed. */
function scoreChange(latest: AssessmentRow, previous: AssessmentRow): string {
  const signed = (points: number) => (points > 0 ? `+${points}` : String(points));
  const delta = latest.score - previous.score;
  const before = previous.breakdown as ScoreBreakdown;
  const after = latest.breakdown as ScoreBreakdown;
  const parts = (Object.keys(COMPONENTS) as (keyof ScoreBreakdown)[])
    .map(key => ({ key, points: (after[key] ?? 0) - (before[key] ?? 0) }))
    .filter(part => part.points !== 0)
    .map(part => `${COMPONENTS[part.key]} ${signed(part.points)}`);
  const since = day(dateOf(previous.createdAt));
  if (latest.modelVersion !== previous.modelVersion) {
    // Points per component are not comparable across scoring models.
    return `Score ${latest.score}, era ${previous.score} na Avaliação de ${since}; a regra de pontuação mudou entre as duas, então a diferença não é só dos seus dados.`;
  }
  if (delta === 0) return `Score igual ao da Avaliação de ${since} (${previous.score}).`;
  return (
    `Score ${delta > 0 ? 'subiu' : 'caiu'} ${Math.abs(delta)} pontos desde a Avaliação de ${since} (era ${previous.score})` +
    (parts.length ? `: ${parts.join(', ')}.` : '.')
  );
}

/** The Indicators of the latest Assessment, in the words of the glossary. */
function indicatorLines(indicators: Indicators): string[] {
  return [
    `Comprometimento de Renda: ${share(indicators.incomeCommitment)} (a vencer em 30 dias mais o vencido, sobre a renda)`,
    `Endividamento: ${share(indicators.debtToIncome)} da renda mensal (Saldo Devedor ${money(indicators.outstandingDebtCents)})`,
    indicators.creditUtilization == null
      ? 'Utilização de Limite: sem Cartões'
      : `Utilização de Limite: ${share(indicators.creditUtilization)}`,
    `Capacidade de Pagamento: ${money(indicators.paymentCapacityCents)} por mês`,
    `Limite Sugerido: ${money(indicators.suggestedLimitCents)}`,
    `Vencido: ${money(indicators.overdueCents)}, pior Estágio ${indicators.worstStage}, ${indicators.lateLast12Months} Atraso(s) nos últimos 12 meses`,
    ...(indicators.scrDebtCents != null && indicators.scrReferenceMonth
      ? [
          `Dívida no Retrato SCR de ${month(indicators.scrReferenceMonth)}: ${money(indicators.scrDebtCents)}`,
        ]
      : []),
  ];
}

/** A round amount to simulate an Extra Amortization with, so plans can compare Operations. */
const REFERENCE_PREPAYMENT_CENTS = 100_000;

/** A monthly rate fraction as "1,89%". */
const percent = (rate: Decimal.Value) =>
  `${new Decimal(rate).times(100).toFixed(2).replace('.', ',')}%`;

/** How a rate compares with the Market Rate of its Modality, the difference already computed. */
function versusMarket(
  rate: Decimal.Value,
  market: NonNullable<Awaited<ReturnType<typeof marketRate>>>
): string {
  const gap = new Decimal(rate).minus(market.monthlyRate);
  const points = gap.abs().times(100).toFixed(2).replace('.', ',');
  const position = gap.isZero()
    ? 'igual à'
    : gap.isPositive()
      ? `${points} ponto(s) percentual(is) acima da`
      : `${points} ponto(s) percentual(is) abaixo da`;
  return `taxa ${position} Taxa Média de Mercado (${percent(market.monthlyRate)} a.m., mediana de ${market.institutions} instituições, Bacen, ${market.period})`;
}

async function finance(viewer: Viewer): Promise<string> {
  const holder = await viewerHolder(viewer);
  const asOf = today();
  const operations = await db
    .select()
    .from(schema.creditOperation)
    .where(eq(schema.creditOperation.holderId, holder.id));
  const markets = await marketRates(operations.map(operation => operation.modality));
  const incomeSources = await db
    .select()
    .from(schema.incomeSource)
    .where(eq(schema.incomeSource.holderId, holder.id));
  const taxes = await db.select().from(schema.tax).where(eq(schema.tax.holderId, holder.id));
  const recurring = await db
    .select()
    .from(schema.recurringExpense)
    .where(eq(schema.recurringExpense.holderId, holder.id));
  const operationLines: string[] = [];
  const prepaymentLines: string[] = [];
  for (const operation of operations) {
    const input = await scheduleInputFor(operation);
    const schedule = amortizationSchedule(input);
    const balance = outstandingBalance(schedule, operation.principalCents, asOf);
    const outlook = payoffOutlook(schedule, asOf);
    const market = markets.get(operation.modality) ?? null;
    operationLines.push(
      `${operation.name} (${MODALITIES[operation.modality].label}${operation.lender ? `, ${operation.lender}` : ''}): ` +
        `principal ${money(operation.principalCents)}, ${operation.termMonths} Parcelas de ${money(schedule[0]?.installmentCents ?? 0)}, ` +
        `taxa ${percent(operation.monthlyRate)} a.m., Saldo Devedor ${money(balance)}, ` +
        (outlook.lastDueDate
          ? `faltam ${outlook.remainingInstallments} Parcelas até ${day(outlook.lastDueDate)} e ${money(outlook.remainingInterestCents)} de juros`
          : 'quitada') +
        (market ? `; ${versusMarket(operation.monthlyRate, market)}` : '')
    );
    if (balance > 0) {
      const effect = prepaymentEffect(input, asOf, REFERENCE_PREPAYMENT_CENTS);
      prepaymentLines.push(
        `${operation.name}: economiza ${money(effect.interestSavedCents)} de juros e ${effect.installmentsSaved} Parcela(s)`
      );
    }
  }
  const plan =
    operations.length > 1 ? await payoffPlanFor(holder.id, REFERENCE_PREPAYMENT_CENTS, asOf) : null;
  const byRate = [...operations]
    .sort((a, b) => new Decimal(b.monthlyRate).cmp(a.monthlyRate))
    .map(operation => operation.name);

  const cards = await db
    .select()
    .from(schema.creditCard)
    .where(eq(schema.creditCard.holderId, holder.id));
  const statements = cards.length
    ? await db
        .select()
        .from(schema.statement)
        .where(
          inArray(
            schema.statement.creditCardId,
            cards.map(card => card.id)
          )
        )
        .orderBy(desc(schema.statement.referenceMonth))
    : [];
  const recentStatements = (cardId: string) =>
    statements
      .filter(statement => statement.creditCardId === cardId)
      .slice(0, RECENT_STATEMENTS)
      .map(statement => `${month(statement.referenceMonth)} ${money(statement.amountCents)}`);
  const [assessment, previous] = await db
    .select()
    .from(schema.assessment)
    .where(eq(schema.assessment.holderId, holder.id))
    .orderBy(desc(schema.assessment.createdAt))
    .limit(2);
  const dues = await upcomingDues(holder.id, asOf);

  return [
    '## Finanças',
    `Renda mensal líquida: ${money(await monthlyIncome(holder.id, asOf))}`,
    'Fontes de Renda:',
    list(
      incomeSources.map(
        source =>
          (source.currency === 'USD'
            ? `${source.description}: ${dollars(source.monthlyNetCents)} por mês, recebidos em dólar e convertidos pela PTAX menos IOF${source.spreadRate ? ' e spread' : ''}`
            : `${source.description}: ${money(source.monthlyNetCents)} líquidos por mês`) +
          (source.paydays.length
            ? `, recebidos ${source.paydays.length}x (dias ${source.paydays.join(', ')})`
            : '') +
          `, desde ${day(source.startsOn)}` +
          (source.endsOn ? ` até ${day(source.endsOn)}` : '')
      ),
      'Nenhuma cadastrada.'
    ),
    'Gastos recorrentes:',
    list(
      recurring.map(
        item =>
          `${item.description}: ${money(item.amountCents)} ${item.cycle === 'YEARLY' ? `por ano, dia ${item.dueDay}/${String(item.dueMonth).padStart(2, '0')}` : `por mês, dia ${item.dueDay}`}` +
          (item.paymentMethod === 'CARD' ? ', no cartão (já entra na Fatura)' : '') +
          (item.endsOn ? `, cancelado em ${day(item.endsOn)}` : '')
      ),
      'Nenhum cadastrado.'
    ),
    'Impostos:',
    list(
      taxes.map(tax =>
        tax.frequency === 'MONTHLY'
          ? `${tax.name}: ${money(tax.amountCents)} por mês, vence dia ${tax.dueDay}`
          : `${tax.name}: ${money(tax.amountCents)} por ano, em ${tax.installments} parcela(s)` +
            `, a partir de ${String(tax.dueDay).padStart(2, '0')}/${String(tax.dueMonth).padStart(2, '0')}`
      ),
      'Nenhum cadastrado.'
    ),
    assessment
      ? `Última Avaliação: Score ${assessment.score} de 1000 (${BAND[assessment.band]}), em ${day(dateOf(assessment.createdAt))}`
      : 'Ainda não há Avaliação gerada.',
    ...(assessment && previous ? [scoreChange(assessment, previous)] : []),
    ...(assessment
      ? [
          'Indicadores da última Avaliação:',
          list(indicatorLines(assessment.indicators as Indicators), ''),
        ]
      : []),
    'Operações de Crédito:',
    list(operationLines, 'Nenhuma cadastrada.'),
    ...(byRate.length > 1 ? [`Da maior para a menor taxa: ${byRate.join(', ')}.`] : []),
    ...(prepaymentLines.length
      ? [
          `Se pagar uma Amortização Extraordinária de ${money(REFERENCE_PREPAYMENT_CENTS)} amanhã, em cada Operação:`,
          list(prepaymentLines, ''),
        ]
      : []),
    ...(plan && plan.debtFreeOn && plan.payoffs.length > 1
      ? [
          `Plano de Quitação com ${money(REFERENCE_PREPAYMENT_CENTS)} por mês a mais, sempre na Operação de maior taxa: ` +
            `sem dívidas em ${day(plan.debtFreeOn)} em vez de ${day(plan.debtFreeWithoutPlanOn!)}, ` +
            `economizando ${money(plan.interestSavedCents)} de juros. Ordem: ` +
            plan.payoffs.map(payoff => `${payoff.name} (${day(payoff.paidOffOn)})`).join(', ') +
            '.',
        ]
      : []),
    'Cartões:',
    list(
      cards.map(
        card =>
          `${card.name}: limite ${money(card.limitCents)}, fecha dia ${card.closingDay}, vence dia ${card.dueDay}` +
          (recentStatements(card.id).length
            ? `; Faturas mais recentes: ${recentStatements(card.id).join(', ')}`
            : '; nenhuma Fatura informada')
      ),
      'Nenhum cadastrado.'
    ),
    'A vencer nos próximos 30 dias:',
    list(
      dues.map(due => `${day(due.dueDate)}: ${due.label}, ${money(due.amountCents)}`),
      'Nada a vencer.'
    ),
  ].join('\n');
}

/** What a Bot knows about the Viewer: the data of its own field, already formatted. */
export async function botContext(viewer: Viewer, key: BotKey): Promise<string> {
  switch (key) {
    case 'FINANCE':
      return finance(viewer);
  }
}
