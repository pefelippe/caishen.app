import type { Viewer } from '@zapbots/auth';
import { db, schema } from '@zapbots/database';
import { addDays, dateOf, Decimal, overdueCents, today } from '@zapbots/finance';
import { and, desc, eq, gte, isNotNull } from 'drizzle-orm';

import { marketRates } from '../bacen';
import {
  lateFacts,
  latePaymentRows,
  scheduleFor,
  statementDueDate,
  upcomingDues,
} from '../obligations';
import { viewerHolder } from '../viewerHolder';
import type { BotKey } from './catalog';

/** Something a Bot points out on its own, computed from the data; no Model is involved. */
export interface BotAlert {
  /** Where to look, inside the app. */
  href: string | null;
  kind:
    | 'ABOVE_MARKET'
    | 'DUE_SOON'
    | 'HIGH_UTILIZATION'
    | 'OVERDUE'
    | 'ROUTINE_FAILED'
    | 'STALE_ASSESSMENT';
  message: string;
}

const DUE_SOON_DAYS = 7;
/** A Statement using this share of the Card's limit weighs on the Score (Utilização de Limite). */
const HIGH_UTILIZATION = new Decimal('0.8');
const STALE_ASSESSMENT_DAYS = 30;
const FAILED_ROUTINE_DAYS = 7;
/** A rate this far above the Market Rate, in percentage points a month, is worth renegotiating. */
const ABOVE_MARKET_POINTS = new Decimal('0.01');

const brl = new Intl.NumberFormat('pt-BR', { currency: 'BRL', style: 'currency' });
const money = (cents: number) => brl.format(cents / 100);
const day = (iso: string) => iso.split('-').reverse().join('/');
const points = (fraction: Decimal) => fraction.times(100).toFixed(2).replace('.', ',');

async function financeAlerts(viewer: Viewer): Promise<BotAlert[]> {
  const holder = await viewerHolder(viewer);
  const asOf = today();
  const alerts: BotAlert[] = [];

  const operations = await db
    .select()
    .from(schema.creditOperation)
    .where(eq(schema.creditOperation.holderId, holder.id));
  const markets = await marketRates(operations.map(operation => operation.modality));
  for (const operation of operations) {
    const href = `/caishen/operacoes/${operation.id}`;
    const overdue = overdueCents(
      lateFacts(await latePaymentRows(operation.id), await scheduleFor(operation)),
      asOf
    );
    if (overdue > 0) {
      alerts.push({
        href,
        kind: 'OVERDUE',
        message: `${operation.name} tem ${money(overdue)} em atraso.`,
      });
    }
    const market = markets.get(operation.modality) ?? null;
    const gap = market ? new Decimal(operation.monthlyRate).minus(market.monthlyRate) : null;
    if (gap && gap.gte(ABOVE_MARKET_POINTS)) {
      alerts.push({
        href,
        kind: 'ABOVE_MARKET',
        message: `A taxa de ${operation.name} está ${points(gap)} ponto(s) percentual(is) ao mês acima da Taxa Média de Mercado: vale tentar renegociar ou portar.`,
      });
    }
  }

  const until = addDays(asOf, DUE_SOON_DAYS);
  for (const due of await upcomingDues(holder.id, asOf)) {
    if (due.dueDate > until) continue;
    alerts.push({
      href: '/caishen/financas',
      kind: 'DUE_SOON',
      message: `${due.label} vence em ${day(due.dueDate)}: ${money(due.amountCents)}.`,
    });
  }

  const cards = await db
    .select()
    .from(schema.creditCard)
    .where(eq(schema.creditCard.holderId, holder.id));
  for (const card of cards) {
    const [latest] = await db
      .select()
      .from(schema.statement)
      .where(eq(schema.statement.creditCardId, card.id))
      .orderBy(desc(schema.statement.referenceMonth))
      .limit(1);
    // Only a Statement still open counts, as in the Assessment's Utilização de Limite.
    if (!latest || card.limitCents <= 0) continue;
    if (statementDueDate(card, latest.referenceMonth) < asOf) continue;
    const usage = new Decimal(latest.amountCents).div(card.limitCents);
    if (usage.gte(HIGH_UTILIZATION)) {
      alerts.push({
        href: '/caishen/financas',
        kind: 'HIGH_UTILIZATION',
        message: `A última Fatura do ${card.name} usa ${usage.times(100).toFixed(0)}% do limite: uma Utilização de Limite alta pesa no Score.`,
      });
    }
  }

  if (operations.length || cards.length) {
    const [assessment] = await db
      .select({ createdAt: schema.assessment.createdAt })
      .from(schema.assessment)
      .where(eq(schema.assessment.holderId, holder.id))
      .orderBy(desc(schema.assessment.createdAt))
      .limit(1);
    const madeOn = assessment ? dateOf(assessment.createdAt) : null;
    if (!madeOn || madeOn < addDays(asOf, -STALE_ASSESSMENT_DAYS)) {
      alerts.push({
        href: '/caishen/financas',
        kind: 'STALE_ASSESSMENT',
        message: madeOn
          ? `Sua última Avaliação é de ${day(madeOn)}. Gere uma nova para ver o Score com os dados de hoje.`
          : 'Você ainda não gerou uma Avaliação. Gere uma para ver seu Score.',
      });
    }
  }

  const order = {
    ABOVE_MARKET: 3,
    DUE_SOON: 1,
    HIGH_UTILIZATION: 2,
    OVERDUE: 0,
    ROUTINE_FAILED: 5,
    STALE_ASSESSMENT: 4,
  } as const;
  return alerts.sort((a, b) => order[a.kind] - order[b.kind]);
}

/**
 * A Bot's Alerts for the Viewer, most urgent first: overdue, due soon, high card usage, rates above
 * the market, then an outdated Assessment.
 */
export async function botAlerts(viewer: Viewer, key: BotKey): Promise<BotAlert[]> {
  const ofField = await (async () => {
    switch (key) {
      case 'FINANCE':
        return financeAlerts(viewer);
    }
  })();
  return [...ofField, ...(await failedRoutineAlerts(viewer, key))];
}

/**
 * Routine Jobs that failed in the last week. Nobody watched them run, so the failure is pointed
 * out; Jobs the User asked for were failed in front of them.
 */
async function failedRoutineAlerts(viewer: Viewer, key: BotKey): Promise<BotAlert[]> {
  const since = new Date(Date.now() - FAILED_ROUTINE_DAYS * 86_400_000);
  const rows = await db
    .select({
      finishedAt: schema.job.finishedAt,
      id: schema.job.id,
      instructions: schema.job.instructions,
    })
    .from(schema.job)
    .innerJoin(schema.bot, eq(schema.bot.id, schema.job.botId))
    .where(
      and(
        eq(schema.job.organizationId, viewer.organizationId),
        eq(schema.bot.key, key),
        eq(schema.job.status, 'FAILED'),
        isNotNull(schema.job.routineId),
        gte(schema.job.finishedAt, since)
      )
    )
    .orderBy(desc(schema.job.finishedAt))
    .limit(3);
  return rows.map(row => ({
    href: `/caishen/trabalhos/${row.id}`,
    kind: 'ROUTINE_FAILED' as const,
    message: `A Rotina "${row.instructions}" falhou em ${day(dateOf(row.finishedAt!))}. Abra o Trabalho para pedir de novo.`,
  }));
}
