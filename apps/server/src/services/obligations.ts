import {
  type CreditCardRow,
  type CreditOperationRow,
  type LatePaymentRow,
  db,
  schema,
} from '@zapbots/database';
import {
  addDays,
  addMonths,
  amortizationSchedule,
  assess,
  avalanchePlan,
  dateInMonth,
  dueWithin,
  type Installment,
  type LatePaymentFact,
  outstandingBalance,
  payoffOutlook,
  recurringDueInMonth,
  type ScheduleInput,
  today,
} from '@zapbots/finance';
import { and, eq, gte, inArray, isNull, lte, or } from 'drizzle-orm';

import { latestScrSummary } from './scr';
import { monthlyNetBrlCents } from './income';

/** What the schedule of a Credit Operation is computed from, its Extra Amortizations included. */
export async function scheduleInputFor(operation: CreditOperationRow): Promise<ScheduleInput> {
  const extras = await db
    .select({
      amountCents: schema.extraAmortization.amountCents,
      date: schema.extraAmortization.date,
    })
    .from(schema.extraAmortization)
    .where(eq(schema.extraAmortization.creditOperationId, operation.id));
  return {
    extraAmortizations: extras,
    firstDueDate: operation.firstDueDate,
    monthlyRate: operation.monthlyRate,
    principalCents: operation.principalCents,
    system: operation.system,
    termMonths: operation.termMonths,
  };
}

export async function scheduleFor(operation: CreditOperationRow): Promise<Installment[]> {
  return amortizationSchedule(await scheduleInputFor(operation));
}

export function statementDueDate(card: Pick<CreditCardRow, 'dueDay'>, referenceMonth: string) {
  return dateInMonth(referenceMonth, card.dueDay);
}

/** Sum of Income Sources in force on `asOf`. */
export async function monthlyIncome(holderId: string, asOf = today()): Promise<number> {
  const sources = await db
    .select()
    .from(schema.incomeSource)
    .where(
      and(
        eq(schema.incomeSource.holderId, holderId),
        lte(schema.incomeSource.startsOn, asOf),
        or(isNull(schema.incomeSource.endsOn), gte(schema.incomeSource.endsOn, asOf))
      )
    );
  // A foreign Fonte de Renda counts in reais at today's rate.
  const amounts = await Promise.all(sources.map(source => monthlyNetBrlCents(source, asOf)));
  return amounts.reduce((sum, cents) => sum + cents, 0);
}

export function installmentDueDate(
  operation: Pick<CreditOperationRow, 'firstDueDate'>,
  installmentNumber: number
) {
  return addMonths(operation.firstDueDate, installmentNumber - 1);
}

export function latePaymentRows(creditOperationId: string) {
  return db
    .select()
    .from(schema.latePayment)
    .where(eq(schema.latePayment.creditOperationId, creditOperationId))
    .orderBy(schema.latePayment.installmentNumber);
}

/** Late Payments of an Operation as facts for `@zapbots/finance`, priced from its schedule. */
export function lateFacts(rows: LatePaymentRow[], schedule: Installment[]): LatePaymentFact[] {
  return rows.flatMap(row => {
    const installment = schedule.find(item => item.number === row.installmentNumber);
    return installment
      ? [
          {
            amountCents: installment.installmentCents,
            dueDate: installment.dueDate,
            paidOn: row.paidOn,
          },
        ]
      : [];
  });
}

/** Everything the Holder declared: Credit Operations, Late Payments, Cards and Statements. */
export async function declaredObligations(holderId: string, asOf = today()) {
  const operations = await db
    .select()
    .from(schema.creditOperation)
    .where(eq(schema.creditOperation.holderId, holderId));
  let outstandingDebtCents = 0;
  let dueNext30DaysCents = 0;
  const latePayments: LatePaymentFact[] = [];
  for (const operation of operations) {
    const schedule = await scheduleFor(operation);
    outstandingDebtCents += outstandingBalance(schedule, operation.principalCents, asOf);
    dueNext30DaysCents += dueWithin(schedule, asOf, 30);
    latePayments.push(...lateFacts(await latePaymentRows(operation.id), schedule));
  }

  const cards = await db
    .select()
    .from(schema.creditCard)
    .where(eq(schema.creditCard.holderId, holderId));
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
    : [];
  const in30Days = addDays(asOf, 30);
  let openStatementsCents = 0;
  for (const item of statements) {
    const card = cards.find(candidate => candidate.id === item.creditCardId)!;
    const dueDate = statementDueDate(card, item.referenceMonth);
    if (dueDate >= asOf) openStatementsCents += item.amountCents;
    if (dueDate > asOf && dueDate <= in30Days) dueNext30DaysCents += item.amountCents;
  }

  return {
    dueNext30DaysCents,
    latePayments,
    openStatementsCents,
    outstandingDebtCents,
    totalCardLimitCents: cards.reduce((sum, card) => sum + card.limitCents, 0),
  };
}

/** Installments and Statements due from `asOf` through the next 30 days, soonest first. */
export function upcomingDues(holderId: string, asOf = today()) {
  return duesBetween(holderId, asOf, addDays(asOf, 30));
}

/**
 * Installments, Statements and Gastos recorrentes due from `from` to `to`, both included, soonest
 * first; one on a Cartão comes as a reminder, its Fatura counts it.
 */
export async function duesBetween(holderId: string, from: string, to: string) {
  const inWindow = (dueDate: string) => dueDate >= from && dueDate <= to;
  const dues: { amountCents: number; dueDate: string; label: string }[] = [];

  const operations = await db
    .select()
    .from(schema.creditOperation)
    .where(eq(schema.creditOperation.holderId, holderId));
  for (const operation of operations) {
    for (const installment of await scheduleFor(operation)) {
      if (inWindow(installment.dueDate)) {
        dues.push({
          amountCents: installment.installmentCents,
          dueDate: installment.dueDate,
          label: `${operation.name} · Parcela ${installment.number}/${operation.termMonths}`,
        });
      }
    }
  }

  const cards = await db
    .select()
    .from(schema.creditCard)
    .where(eq(schema.creditCard.holderId, holderId));
  for (const card of cards) {
    const statements = await db
      .select()
      .from(schema.statement)
      .where(eq(schema.statement.creditCardId, card.id));
    for (const item of statements) {
      const dueDate = statementDueDate(card, item.referenceMonth);
      if (inWindow(dueDate)) {
        dues.push({ amountCents: item.amountCents, dueDate, label: `${card.name} · Fatura` });
      }
    }
  }

  // Gastos recorrentes, each month the window touches; one on a Cartão as a reminder.
  const months: string[] = [];
  for (let month = `${from.slice(0, 7)}-01`; month <= to; month = addMonths(month, 1)) {
    months.push(month.slice(0, 7));
  }
  const recurring = await db
    .select()
    .from(schema.recurringExpense)
    .where(eq(schema.recurringExpense.holderId, holderId));
  for (const item of recurring) {
    for (const yearMonth of months) {
      const dueDate = recurringDueInMonth(item, yearMonth);
      if (dueDate && inWindow(dueDate)) {
        dues.push({
          amountCents: item.amountCents,
          dueDate,
          label:
            item.paymentMethod === 'CARD' ? `${item.description} · no cartão` : item.description,
        });
      }
    }
  }

  return dues.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

/** Scores declared Obligations together with the latest SCR Snapshot, which prevails. */
export async function computeAssessment(holderId: string) {
  const asOf = today();
  return assess({
    ...(await declaredObligations(holderId, asOf)),
    asOf,
    monthlyIncomeCents: await monthlyIncome(holderId, asOf),
    scr: await latestScrSummary(holderId),
  });
}

/**
 * Plano de Quitação of a Holder: `monthlyExtraCents` a month to the dearest Credit Operation first.
 * Each payoff carries the Operation's name for display.
 */
export async function payoffPlanFor(holderId: string, monthlyExtraCents: number, asOf = today()) {
  const operations = await db
    .select()
    .from(schema.creditOperation)
    .where(eq(schema.creditOperation.holderId, holderId));
  const all = await Promise.all(
    operations.map(async operation => ({
      id: operation.id,
      input: await scheduleInputFor(operation),
    }))
  );
  // Operations already paid off have nothing left to plan.
  const debts = all.filter(
    debt => payoffOutlook(amortizationSchedule(debt.input), asOf).remainingInstallments > 0
  );
  const plan = avalanchePlan(debts, asOf, monthlyExtraCents);
  const names = new Map(operations.map(operation => [operation.id, operation.name]));
  return {
    ...plan,
    payoffs: plan.payoffs.map(payoff => ({
      creditOperationId: payoff.id,
      name: names.get(payoff.id) ?? '',
      paidOffOn: payoff.paidOffOn,
    })),
  };
}
