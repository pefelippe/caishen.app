import {
  type CreditCardRow,
  type CreditOperationRow,
  type LatePaymentRow,
  db,
  schema,
} from '@mny/database';
import {
  addDays,
  addMonths,
  amortizationSchedule,
  assess,
  dateInMonth,
  dueWithin,
  outstandingBalance,
  today,
  type Installment,
  type LatePaymentFact,
} from '@mny/finance';
import { and, eq, gte, inArray, isNull, lte, or } from 'drizzle-orm';

import { latestScrSummary } from './scr';

export async function scheduleFor(operation: CreditOperationRow): Promise<Installment[]> {
  const extras = await db
    .select({
      amountCents: schema.extraAmortization.amountCents,
      date: schema.extraAmortization.date,
    })
    .from(schema.extraAmortization)
    .where(eq(schema.extraAmortization.creditOperationId, operation.id));
  return amortizationSchedule({
    extraAmortizations: extras,
    firstDueDate: operation.firstDueDate,
    monthlyRate: operation.monthlyRate,
    principalCents: operation.principalCents,
    system: operation.system,
    termMonths: operation.termMonths,
  });
}

export function statementDueDate(card: Pick<CreditCardRow, 'dueDay'>, referenceMonth: string) {
  return dateInMonth(referenceMonth, card.dueDay);
}

/** Sum of Income Sources in force on `asOf`. */
export async function monthlyIncome(holderId: string, asOf = today()): Promise<number> {
  const sources = await db
    .select({ monthlyNetCents: schema.incomeSource.monthlyNetCents })
    .from(schema.incomeSource)
    .where(
      and(
        eq(schema.incomeSource.holderId, holderId),
        lte(schema.incomeSource.startsOn, asOf),
        or(isNull(schema.incomeSource.endsOn), gte(schema.incomeSource.endsOn, asOf))
      )
    );
  return sources.reduce((sum, source) => sum + source.monthlyNetCents, 0);
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

/** Late Payments of an Operation as facts for `@mny/finance`, priced from its schedule. */
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
