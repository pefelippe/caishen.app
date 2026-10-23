import type { Viewer } from '@zapbots/auth';
import { db, schema } from '@zapbots/database';
import { eq } from 'drizzle-orm';
import { Decimal, ImpliedRateError, impliedMonthlyRate, type Modality } from '@zapbots/finance';

import { badInput, findHolder, notFound, owned } from '../resolvers/guards';

/**
 * The records a User creates by hand and a Bot can propose (docs/adr/0013). Both paths write here,
 * so a confirmed Proposal passes the same checks as the mutation.
 */

/** `db`, or the transaction a confirmed Proposal writes in. */
export type Executor = Pick<typeof db, 'insert'>;

/** Decimal places of a rate shown in percent on a form: 1,9877% a.m. */
export const RATE_PERCENT_PLACES = 4;

export const isDay = (day: number) => Number.isInteger(day) && day >= 1 && day <= 31;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function checkDate(date: string) {
  if (!DATE.test(date) || Number.isNaN(Date.parse(date))) badInput(`Data inválida: ${date}`);
}

/** A Gasto's (or Receita avulsa's) columns, checked: positive whole cents, a description, a real date. */
export function expenseValues(input: {
  amountCents: number;
  category?: string | null;
  date: string;
  description: string;
}) {
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    badInput('O valor deve ser positivo');
  }
  const description = input.description.trim();
  if (!description) badInput('Preencha a descrição');
  checkDate(input.date);
  return {
    amountCents: input.amountCents,
    category: input.category?.trim() || null,
    date: input.date,
    description,
  };
}

export interface CreditOperationInput {
  collateralDescription?: string | null;
  collateralValueCents?: number | null;
  firstDueDate: string;
  holderId: string;
  installmentCents?: number | null;
  lender?: string | null;
  modality: Modality;
  monthlyRate?: number | null;
  name: string;
  principalCents: number;
  system: 'PRICE' | 'SAC';
  termMonths: number;
}

/** An Operation's columns, checked, with its rate informed or implied by the installment. */
export function creditOperationValues(organizationId: string, input: CreditOperationInput) {
  if (!input.name.trim()) badInput('Dê um nome à Operação');
  if (!Number.isInteger(input.principalCents) || input.principalCents <= 0) {
    badInput('Valor financiado deve ser positivo');
  }
  if (!Number.isInteger(input.termMonths) || input.termMonths <= 0) {
    badInput('Prazo deve ser positivo');
  }
  checkDate(input.firstDueDate);

  let monthlyRate: string;
  let rateSource: 'IMPLIED' | 'INFORMED';
  if (input.monthlyRate != null) {
    if (input.monthlyRate < 0) badInput('Taxa não pode ser negativa');
    monthlyRate = String(input.monthlyRate);
    rateSource = 'INFORMED';
  } else if (input.installmentCents != null) {
    try {
      monthlyRate = impliedMonthlyRate(
        input.system,
        input.principalCents,
        input.installmentCents,
        input.termMonths
      ).toFixed(12);
    } catch (error) {
      if (error instanceof ImpliedRateError) badInput(error.message);
      throw error;
    }
    rateSource = 'IMPLIED';
  } else {
    badInput('Informe a taxa mensal ou o valor da parcela');
  }

  return {
    collateralDescription: input.collateralDescription ?? null,
    collateralValueCents: input.collateralValueCents ?? null,
    firstDueDate: input.firstDueDate,
    holderId: input.holderId,
    lender: input.lender ?? null,
    modality: input.modality,
    monthlyRate,
    name: input.name.trim(),
    organizationId,
    principalCents: input.principalCents,
    rateSource,
    system: input.system,
    termMonths: input.termMonths,
  };
}

export async function createCreditOperation(
  viewer: Viewer,
  input: CreditOperationInput,
  executor: Executor = db
) {
  await findHolder(viewer, input.holderId);
  const [row] = await executor
    .insert(schema.creditOperation)
    .values(creditOperationValues(viewer.organizationId, input))
    .returning();
  return row!;
}

export interface IncomeSourceInput {
  currency?: 'BRL' | 'USD' | null;
  description: string;
  /** Fractions: 0,38% is 0.0038. */
  iofRate?: number | null;
  spreadRate?: number | null;
  endsOn?: string | null;
  holderId: string;
  monthlyNetCents: number;
  paydays?: number[] | null;
  startsOn: string;
}

export function incomeSourceValues(input: IncomeSourceInput) {
  const description = input.description.trim();
  if (!description) badInput('Preencha a descrição');
  if (!Number.isInteger(input.monthlyNetCents) || input.monthlyNetCents <= 0) {
    badInput('O valor deve ser positivo');
  }
  checkDate(input.startsOn);
  if (input.endsOn) {
    checkDate(input.endsOn);
    if (input.endsOn < input.startsOn) badInput('O fim vem antes do início');
  }
  const paydays = [...new Set(input.paydays ?? [])].sort((a, b) => a - b);
  if (paydays.some(day => !isDay(day))) badInput('Dias de pagamento vão de 1 a 31');
  const currency = input.currency ?? 'BRL';
  if (currency !== 'BRL' && currency !== 'USD') badInput('Moeda desconhecida');
  for (const [rate, label] of [
    [input.iofRate, 'IOF'],
    [input.spreadRate, 'spread'],
  ] as const) {
    if (rate != null && (rate < 0 || rate >= 0.2)) badInput(`O ${label} vai de 0% a 20%`);
  }
  const foreign = currency !== 'BRL';
  return {
    currency,
    description,
    iofRate: foreign && input.iofRate != null ? String(input.iofRate) : null,
    spreadRate: foreign && input.spreadRate != null ? String(input.spreadRate) : null,
    endsOn: input.endsOn ?? null,
    holderId: input.holderId,
    monthlyNetCents: input.monthlyNetCents,
    paydays,
    startsOn: input.startsOn,
  };
}

export async function addIncomeSource(
  viewer: Viewer,
  input: IncomeSourceInput,
  executor: Executor = db
) {
  await findHolder(viewer, input.holderId);
  const [row] = await executor
    .insert(schema.incomeSource)
    .values(incomeSourceValues(input))
    .returning();
  return row!;
}

export interface DatedAmountInput {
  amountCents: number;
  category?: string | null;
  date: string;
  description: string;
  holderId: string;
}

export async function addOneOffIncome(
  viewer: Viewer,
  input: DatedAmountInput,
  executor: Executor = db
) {
  await findHolder(viewer, input.holderId);
  const values = expenseValues({ ...input, category: null });
  const [row] = await executor
    .insert(schema.oneOffIncome)
    .values({
      amountCents: values.amountCents,
      date: values.date,
      description: values.description,
      holderId: input.holderId,
      organizationId: viewer.organizationId,
    })
    .returning();
  return row!;
}

export async function addExpense(viewer: Viewer, input: DatedAmountInput, executor: Executor = db) {
  await findHolder(viewer, input.holderId);
  const [row] = await executor
    .insert(schema.expense)
    .values({
      ...expenseValues(input),
      holderId: input.holderId,
      organizationId: viewer.organizationId,
    })
    .returning();
  return row!;
}

export type RecordKind =
  | 'CREDIT_OPERATION'
  | 'EXPENSE'
  | 'INCOME_SOURCE'
  | 'ONE_OFF_INCOME'
  | 'RECURRING_EXPENSE';

export type RecordInput =
  | CreditOperationInput
  | DatedAmountInput
  | IncomeSourceInput
  | RecurringExpenseInput;

export const PAYMENT_METHODS = ['CARD', 'PIX', 'DEBIT', 'BOLETO', 'OTHER'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface RecurringExpenseInput {
  amountCents: number;
  category?: string | null;
  creditCardId?: string | null;
  cycle?: 'MONTHLY' | 'YEARLY' | null;
  description: string;
  dueDay: number;
  dueMonth?: number | null;
  endsOn?: string | null;
  holderId: string;
  paymentMethod?: PaymentMethod | null;
  startsOn?: string | null;
}

/**
 * A Gasto recorrente's columns, checked. Only the name, the amount and the day are required; the
 * rest refines it (a yearly one needs its month; a Cartão only goes with CARD).
 */
export function recurringExpenseValues(input: RecurringExpenseInput) {
  const description = input.description.trim();
  if (!description) badInput('Preencha a descrição');
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    badInput('O valor deve ser positivo');
  }
  if (!isDay(input.dueDay)) badInput('Dia da cobrança vai de 1 a 31');
  const cycle = input.cycle ?? 'MONTHLY';
  const dueMonth = cycle === 'YEARLY' ? input.dueMonth : null;
  if (
    cycle === 'YEARLY' &&
    (dueMonth == null || !Number.isInteger(dueMonth) || dueMonth < 1 || dueMonth > 12)
  ) {
    badInput('Informe o mês da cobrança anual');
  }
  if (input.paymentMethod && !PAYMENT_METHODS.includes(input.paymentMethod)) {
    badInput('Forma de pagamento desconhecida');
  }
  if (input.startsOn) checkDate(input.startsOn);
  if (input.endsOn) {
    checkDate(input.endsOn);
    if (input.startsOn && input.endsOn < input.startsOn) badInput('O fim vem antes do início');
  }
  return {
    amountCents: input.amountCents,
    category: input.category?.trim() || null,
    creditCardId: input.paymentMethod === 'CARD' ? (input.creditCardId ?? null) : null,
    cycle,
    description,
    dueDay: input.dueDay,
    dueMonth: dueMonth ?? null,
    endsOn: input.endsOn ?? null,
    holderId: input.holderId,
    paymentMethod: input.paymentMethod ?? null,
    startsOn: input.startsOn ?? null,
  };
}

/** A Cartão given for a Gasto recorrente must be the Viewer's own. */
async function checkCard(viewer: Viewer, creditCardId: string | null) {
  if (!creditCardId) return;
  const [card] = await db
    .select({ id: schema.creditCard.id })
    .from(schema.creditCard)
    .where(owned(schema.creditCard, viewer, creditCardId));
  if (!card) notFound('Cartão');
}

export async function addRecurringExpense(
  viewer: Viewer,
  input: RecurringExpenseInput,
  executor: Executor = db
) {
  await findHolder(viewer, input.holderId);
  const values = recurringExpenseValues(input);
  await checkCard(viewer, values.creditCardId);
  const [row] = await executor
    .insert(schema.recurringExpense)
    .values({ ...values, organizationId: viewer.organizationId })
    .returning();
  return row!;
}

/** An Income Source only if its Holder belongs to the Viewer's Organization (it has no column). */
export async function findIncomeSource(viewer: Viewer, id: string) {
  const [row] = await db.select().from(schema.incomeSource).where(eq(schema.incomeSource.id, id));
  if (!row) notFound('Fonte de Renda');
  await findHolder(viewer, row.holderId);
  return row;
}

/** A saved record as the input that wrote it, so it can be shown as fields and corrected. */
export async function readRecord(
  viewer: Viewer,
  kind: RecordKind,
  id: string
): Promise<RecordInput> {
  switch (kind) {
    case 'CREDIT_OPERATION': {
      const [row] = await db
        .select()
        .from(schema.creditOperation)
        .where(owned(schema.creditOperation, viewer, id));
      if (!row) notFound('Operação');
      return {
        collateralDescription: row.collateralDescription,
        collateralValueCents: row.collateralValueCents,
        firstDueDate: row.firstDueDate,
        holderId: row.holderId,
        lender: row.lender,
        modality: row.modality,
        // An implied rate is shown as the rate it became; correcting it informs it.
        monthlyRate: Number(row.monthlyRate),
        name: row.name,
        principalCents: row.principalCents,
        system: row.system,
        termMonths: row.termMonths,
      };
    }
    case 'INCOME_SOURCE': {
      const row = await findIncomeSource(viewer, id);
      return {
        currency: row.currency,
        description: row.description,
        iofRate: row.iofRate == null ? null : Number(row.iofRate),
        spreadRate: row.spreadRate == null ? null : Number(row.spreadRate),
        endsOn: row.endsOn,
        holderId: row.holderId,
        monthlyNetCents: row.monthlyNetCents,
        paydays: row.paydays,
        startsOn: row.startsOn,
      };
    }
    case 'EXPENSE': {
      const [row] = await db
        .select()
        .from(schema.expense)
        .where(owned(schema.expense, viewer, id));
      if (!row) notFound('Gasto');
      return { ...row, category: row.category };
    }
    case 'ONE_OFF_INCOME': {
      const [row] = await db
        .select()
        .from(schema.oneOffIncome)
        .where(owned(schema.oneOffIncome, viewer, id));
      if (!row) notFound('Receita');
      return row;
    }
    case 'RECURRING_EXPENSE': {
      const [row] = await db
        .select()
        .from(schema.recurringExpense)
        .where(owned(schema.recurringExpense, viewer, id));
      if (!row) notFound('Gasto recorrente');
      return row;
    }
  }
}

/** Rewrites a saved record with the same checks as creating it; the Holder never changes. */
export async function updateRecord(
  viewer: Viewer,
  kind: RecordKind,
  id: string,
  input: RecordInput,
  executor: Pick<typeof db, 'update'> = db
): Promise<{ id: string }> {
  const { holderId } = await readRecord(viewer, kind, id);
  switch (kind) {
    case 'CREDIT_OPERATION': {
      const { organizationId: _, ...values } = creditOperationValues(viewer.organizationId, {
        ...(input as CreditOperationInput),
        holderId,
      });
      // The form shows the rate rounded; unchanged, it keeps its full precision and its source
      // (an implied rate stays implied).
      const [stored] = await db
        .select({
          monthlyRate: schema.creditOperation.monthlyRate,
          rateSource: schema.creditOperation.rateSource,
        })
        .from(schema.creditOperation)
        .where(owned(schema.creditOperation, viewer, id));
      const shown = new Decimal(stored!.monthlyRate).toDecimalPlaces(RATE_PERCENT_PLACES + 2);
      if (values.rateSource === 'INFORMED' && new Decimal(values.monthlyRate).eq(shown)) {
        values.monthlyRate = stored!.monthlyRate;
        values.rateSource = stored!.rateSource;
      }
      await executor
        .update(schema.creditOperation)
        .set(values)
        .where(owned(schema.creditOperation, viewer, id));
      return { id };
    }
    case 'INCOME_SOURCE': {
      const values = incomeSourceValues({ ...(input as IncomeSourceInput), holderId });
      await executor.update(schema.incomeSource).set(values).where(eq(schema.incomeSource.id, id));
      return { id };
    }
    case 'EXPENSE': {
      await executor
        .update(schema.expense)
        .set(expenseValues(input as DatedAmountInput))
        .where(owned(schema.expense, viewer, id));
      return { id };
    }
    case 'ONE_OFF_INCOME': {
      const { category: _, ...values } = expenseValues({
        ...(input as DatedAmountInput),
        category: null,
      });
      await executor
        .update(schema.oneOffIncome)
        .set(values)
        .where(owned(schema.oneOffIncome, viewer, id));
      return { id };
    }
    case 'RECURRING_EXPENSE': {
      const values = recurringExpenseValues({ ...(input as RecurringExpenseInput), holderId });
      await checkCard(viewer, values.creditCardId);
      await executor
        .update(schema.recurringExpense)
        .set(values)
        .where(owned(schema.recurringExpense, viewer, id));
      return { id };
    }
  }
}

/**
 * Deletes a saved record of the Viewer's Organization; a Bot gets here only through a DELETE
 * Proposal the User confirmed. An Operation takes its Extra Amortizations and late payments along.
 */
export async function deleteRecord(
  viewer: Viewer,
  kind: RecordKind,
  id: string,
  executor: Pick<typeof db, 'delete'> = db
): Promise<{ id: string }> {
  // Not found unless it belongs to the Viewer (an Income Source through its Holder).
  await readRecord(viewer, kind, id);
  switch (kind) {
    case 'CREDIT_OPERATION':
      await executor
        .delete(schema.creditOperation)
        .where(owned(schema.creditOperation, viewer, id));
      break;
    case 'INCOME_SOURCE':
      await executor.delete(schema.incomeSource).where(eq(schema.incomeSource.id, id));
      break;
    case 'EXPENSE':
      await executor.delete(schema.expense).where(owned(schema.expense, viewer, id));
      break;
    case 'ONE_OFF_INCOME':
      await executor.delete(schema.oneOffIncome).where(owned(schema.oneOffIncome, viewer, id));
      break;
    case 'RECURRING_EXPENSE':
      await executor
        .delete(schema.recurringExpense)
        .where(owned(schema.recurringExpense, viewer, id));
      break;
  }
  return { id };
}
