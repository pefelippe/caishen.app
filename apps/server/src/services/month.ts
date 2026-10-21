import { db, schema } from '@zapbots/database';
import { dateInMonth, taxDueInMonth } from '@zapbots/finance';
import { and, asc, eq, gte, isNull, lte, or } from 'drizzle-orm';

import { scheduleFor, statementDueDate } from './obligations';

type LineKind = 'INSTALLMENT' | 'ONE_OFF' | 'SALARY' | 'STATEMENT' | 'TAX';

/** One line of a month: what came in or what fell due, on a date. */
export interface MonthLine {
  amountCents: number;
  date: string;
  /** The Receita avulsa or the Credit Operation the line comes from, when there is one. */
  id: string | null;
  kind: LineKind;
  label: string;
}

const byDate = (a: MonthLine, b: MonthLine) => a.date.localeCompare(b.date);
const sum = (lines: { amountCents: number }[]) =>
  lines.reduce((total, line) => total + line.amountCents, 0);

/**
 * A Holder's month (`YYYY-MM`): the Receitas (Fontes de Renda in force and Receitas avulsas), the
 * Compromissos that fall due (Installments, Statements and Impostos) and the Gastos, with their
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
  const incomes: MonthLine[] = [
    ...sources.map(source => ({
      amountCents: source.monthlyNetCents,
      date: dateInMonth(yearMonth, source.paydays[0] ?? 1),
      id: null,
      kind: 'SALARY' as const,
      label: source.description,
    })),
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
  commitments.sort(byDate);

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
  };
}
