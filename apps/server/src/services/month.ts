import { db, schema } from '@zapbots/database';
import { addMonths, dateInMonth, recurringDueInMonth, taxDueInMonth } from '@zapbots/finance';
import { and, asc, eq, gte, isNull, lte, or } from 'drizzle-orm';

import { incomePayments } from './income';
import { scheduleFor, statementDueDate } from './obligations';

type LineKind = 'INSTALLMENT' | 'ONE_OFF' | 'RECURRING' | 'SALARY' | 'STATEMENT' | 'TAX';

/** One line of a month: what came in or what fell due, on a date. */
export interface MonthLine {
  amountCents: number;
  date: string;
  /** The record the line comes from, when there is one: Receita avulsa, Fonte de Renda, Operação or Gasto recorrente. */
  id: string | null;
  kind: LineKind;
  label: string;
  /** A payment in a foreign currency: its amount there and the rate it was converted at. */
  foreign?: {
    amountCents: number;
    currency: 'USD';
    rate: number | null;
    rateDate: string | null;
    rateSource: 'INFORMED' | 'PTAX';
  } | null;
}

const byDate = (a: MonthLine, b: MonthLine) => a.date.localeCompare(b.date);
const sum = (lines: { amountCents: number }[]) =>
  lines.reduce((total, line) => total + line.amountCents, 0);

/**
 * A Holder's month (`YYYY-MM`): the Receitas (Fontes de Renda in force and Receitas avulsas), the
 * Compromissos that fall due (Installments, Statements, Impostos and Gastos recorrentes not paid on
 * a Cartão; those are listed apart, in `onCard`, as their Fatura counts them) and the Gastos, with their
 * totals in whole cents (docs/adr/0004) and what is left.
 */
export async function monthStatement(holderId: string, yearMonth: string) {
  const first = `${yearMonth}-01`;
  const last = dateInMonth(yearMonth, 31);
  const inMonth = (date: string) => date >= first && date <= last;

  const sources = await db
    .select()
    .from(schema.incomeSource)
    .where(
      and(
        eq(schema.incomeSource.holderId, holderId),
        lte(schema.incomeSource.startsOn, last),
        or(isNull(schema.incomeSource.endsOn), gte(schema.incomeSource.endsOn, first))
      )
    );
  const oneOffs = await db
    .select()
    .from(schema.oneOffIncome)
    .where(
      and(
        eq(schema.oneOffIncome.holderId, holderId),
        gte(schema.oneOffIncome.date, first),
        lte(schema.oneOffIncome.date, last)
      )
    );
  const salaries: MonthLine[] = [];
  for (const source of sources) {
    for (const payment of await incomePayments(source, yearMonth)) {
      salaries.push({
        amountCents: payment.amountCents,
        date: payment.date,
        foreign: payment.foreign && {
          amountCents: payment.foreign.amountCents,
          currency: payment.foreign.currency,
          rate: payment.foreign.rate?.toNumber() ?? null,
          rateDate: payment.foreign.rateDate,
          rateSource: payment.foreign.rateSource,
        },
        // The Fonte de Renda behind it, so the line can lead to it or delete it.
        id: source.id,
        kind: 'SALARY' as const,
        label: source.description,
      });
    }
  }
  const incomes: MonthLine[] = [
    ...salaries,
    ...oneOffs.map(item => ({
      amountCents: item.amountCents,
      date: item.date,
      id: item.id,
      kind: 'ONE_OFF' as const,
      label: item.description,
    })),
  ].sort(byDate);

  const commitments: MonthLine[] = [];
  const operations = await db
    .select()
    .from(schema.creditOperation)
    .where(eq(schema.creditOperation.holderId, holderId));
  for (const operation of operations) {
    for (const installment of await scheduleFor(operation)) {
      if (!inMonth(installment.dueDate)) continue;
      commitments.push({
        amountCents: installment.installmentCents,
        date: installment.dueDate,
        id: operation.id,
        kind: 'INSTALLMENT',
        label: `${operation.name} · Parcela ${installment.number}/${operation.termMonths}`,
      });
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
      if (!inMonth(dueDate)) continue;
      commitments.push({
        amountCents: item.amountCents,
        date: dueDate,
        id: null,
        kind: 'STATEMENT',
        label: `${card.name} · Fatura`,
      });
    }
  }
  const taxes = await db.select().from(schema.tax).where(eq(schema.tax.holderId, holderId));
  for (const tax of taxes) {
    const due = taxDueInMonth(tax, yearMonth);
    if (!due) continue;
    commitments.push({
      amountCents: due.amountCents,
      date: due.dueDate,
      id: null,
      kind: 'TAX',
      label:
        tax.installments > 1 ? `${tax.name} · ${due.installment}/${tax.installments}` : tax.name,
    });
  }
  // Gastos recorrentes: on a Cartão they are already in its Fatura, so they are shown, not counted.
  const onCard: MonthLine[] = [];
  const recurring = await db
    .select()
    .from(schema.recurringExpense)
    .where(eq(schema.recurringExpense.holderId, holderId));
  for (const item of recurring) {
    const dueDate = recurringDueInMonth(item, yearMonth);
    if (!dueDate) continue;
    (item.paymentMethod === 'CARD' ? onCard : commitments).push({
      amountCents: item.amountCents,
      date: dueDate,
      id: item.id,
      kind: 'RECURRING',
      label: item.description,
    });
  }
  commitments.sort(byDate);
  onCard.sort(byDate);

  const expenses = await db
    .select()
    .from(schema.expense)
    .where(
      and(
        eq(schema.expense.holderId, holderId),
        gte(schema.expense.date, first),
        lte(schema.expense.date, last)
      )
    )
    .orderBy(asc(schema.expense.date), asc(schema.expense.createdAt));

  const incomeCents = sum(incomes);
  const commitmentsCents = sum(commitments);
  const expensesCents = sum(expenses);
  return {
    balanceCents: incomeCents - commitmentsCents - expensesCents,
    commitments,
    commitmentsCents,
    expenses,
    expensesCents,
    incomeCents,
    incomes,
    month: yearMonth,
    onCard,
  };
}

/** The longest period one sheet covers. */
export const MAX_PERIOD_DAYS = 731;

/**
 * Any span of days (`from` and `to` inclusive) as one statement: the months it touches, each built
 * as above, with only the lines that fall inside it and their totals. `month` reads `from..to`.
 */
export async function periodStatement(holderId: string, from: string, to: string) {
  const months: string[] = [];
  for (let month = from.slice(0, 7); month <= to.slice(0, 7);) {
    months.push(month);
    month = addMonths(`${month}-01`, 1).slice(0, 7);
  }
  const statements = await Promise.all(months.map(month => monthStatement(holderId, month)));
  const inside = <T extends { date: string }>(lines: T[]) =>
    lines.filter(line => line.date >= from && line.date <= to);
  const incomes = inside(statements.flatMap(statement => statement.incomes));
  const commitments = inside(statements.flatMap(statement => statement.commitments));
  const onCard = inside(statements.flatMap(statement => statement.onCard));
  const expenses = inside(statements.flatMap(statement => statement.expenses));
  const incomeCents = sum(incomes);
  const commitmentsCents = sum(commitments);
  const expensesCents = sum(expenses);
  return {
    balanceCents: incomeCents - commitmentsCents - expensesCents,
    commitments,
    commitmentsCents,
    expenses,
    expensesCents,
    incomeCents,
    incomes,
    month: `${from}..${to}`,
    onCard,
  };
}
