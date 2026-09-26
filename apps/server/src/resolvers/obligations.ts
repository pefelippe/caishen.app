import { db, schema } from '@mny/database';
import {
  ImpliedRateError,
  MODALITIES,
  daysLate,
  impliedMonthlyRate,
  monthlyToAnnualRate,
  outstandingBalance,
  overdueCents,
  stageOf,
  today,
} from '@mny/finance';
import type { Resolvers } from '@mny/graphql/server';
import { and, eq } from 'drizzle-orm';

import { marketRate } from '../services/bacen';
import {
  installmentDueDate,
  lateFacts,
  latePaymentRows,
  scheduleFor,
  statementDueDate,
} from '../services/obligations';
import { badInput, findHolder, notFound, requireViewer } from './guards';

async function operationById(id: string) {
  const [operation] = await db
    .select()
    .from(schema.creditOperation)
    .where(eq(schema.creditOperation.id, id));
  return operation!;
}

/** Loads a Credit Operation only if it belongs to the Organization. */
async function findOperation(organizationId: string, id: string) {
  const [operation] = await db
    .select()
    .from(schema.creditOperation)
    .where(
      and(
        eq(schema.creditOperation.id, id),
        eq(schema.creditOperation.organizationId, organizationId)
      )
    );
  return operation ?? notFound('Operação');
}

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

function checkDay(day: number, label: string) {
  if (!Number.isInteger(day) || day < 1 || day > 31) badInput(`${label} deve estar entre 1 e 31`);
}

export const obligationResolvers: Resolvers = {
  CreditCard: {
    statements: card =>
      db
        .select()
        .from(schema.statement)
        .where(eq(schema.statement.creditCardId, card.id))
        .orderBy(schema.statement.referenceMonth),
  },
  CreditOperation: {
    annualRate: operation => monthlyToAnnualRate(operation.monthlyRate).toNumber(),
    holder: async operation => {
      const [holder] = await db
        .select()
        .from(schema.holder)
        .where(eq(schema.holder.id, operation.holderId));
      return holder!;
    },
    installmentCents: async operation => (await scheduleFor(operation))[0]?.installmentCents ?? 0,
    marketRate: operation => marketRate(operation.modality),
    modalityLabel: operation => MODALITIES[operation.modality].label,
    monthlyRate: operation => Number(operation.monthlyRate),
    outstandingBalanceCents: async operation =>
      outstandingBalance(await scheduleFor(operation), operation.principalCents, today()),
    paidInstallments: async operation =>
      (await scheduleFor(operation)).filter(row => row.dueDate <= today()).length,
    latePayments: operation => latePaymentRows(operation.id),
    overdueCents: async operation =>
      overdueCents(
        lateFacts(await latePaymentRows(operation.id), await scheduleFor(operation)),
        today()
      ),
    schedule: async operation => {
      const asOf = today();
      const late = new Map(
        (await latePaymentRows(operation.id)).map(row => [row.installmentNumber, row])
      );
      return (await scheduleFor(operation)).map(row => {
        const record = late.get(row.number);
        const paidOn = record ? record.paidOn : row.dueDate <= asOf ? row.dueDate : null;
        const status = record
          ? record.paidOn
            ? ('PAID_LATE' as const)
            : ('OPEN_LATE' as const)
          : row.dueDate <= asOf
            ? ('PAID' as const)
            : ('UPCOMING' as const);
        return {
          ...row,
          daysLate: record ? daysLate({ ...row, amountCents: 0, paidOn: record.paidOn }, asOf) : 0,
          paidOn,
          status,
        };
      });
    },
    stage: async operation =>
      stageOf(
        lateFacts(await latePaymentRows(operation.id), await scheduleFor(operation)),
        today()
      ),
  },
  LatePayment: {
    daysLate: async row => {
      const operation = await operationById(row.creditOperationId);
      const dueDate = installmentDueDate(operation, row.installmentNumber);
      return daysLate({ amountCents: 0, dueDate, paidOn: row.paidOn }, today());
    },
    dueDate: async row =>
      installmentDueDate(await operationById(row.creditOperationId), row.installmentNumber),
  },
  Mutation: {
    clearLatePayment: async (_, { creditOperationId, installmentNumber }, context) => {
      await findOperation(requireViewer(context).organizationId, creditOperationId);
      const deleted = await db
        .delete(schema.latePayment)
        .where(
          and(
            eq(schema.latePayment.creditOperationId, creditOperationId),
            eq(schema.latePayment.installmentNumber, installmentNumber)
          )
        )
        .returning({ id: schema.latePayment.id });
      return deleted.length > 0;
    },
    recordLatePayment: async (_, { creditOperationId, installmentNumber, paidOn }, context) => {
      const operation = await findOperation(
        requireViewer(context).organizationId,
        creditOperationId
      );
      if (installmentNumber < 1 || installmentNumber > operation.termMonths) {
        badInput('Parcela inexistente');
      }
      const dueDate = installmentDueDate(operation, installmentNumber);
      if (dueDate > today()) badInput('Essa Parcela ainda não venceu');
      if (paidOn && paidOn <= dueDate) badInput('Pagamento no vencimento não é Atraso');
      const [row] = await db
        .insert(schema.latePayment)
        .values({ creditOperationId, installmentNumber, paidOn: paidOn ?? null })
        .onConflictDoUpdate({
          set: { paidOn: paidOn ?? null },
          target: [schema.latePayment.creditOperationId, schema.latePayment.installmentNumber],
        })
        .returning();
      return row!;
    },
    createCreditCard: async (_, { input }, context) => {
      const viewer = requireViewer(context);
      await findHolder(viewer, input.holderId);
      checkDay(input.closingDay, 'Dia de fechamento');
      checkDay(input.dueDay, 'Dia de vencimento');
      const [row] = await db
        .insert(schema.creditCard)
        .values({ ...input, issuer: input.issuer ?? null, organizationId: viewer.organizationId })
        .returning();
      return row!;
    },
    createCreditOperation: async (_, { input }, context) => {
      const viewer = requireViewer(context);
      await findHolder(viewer, input.holderId);
      if (input.principalCents <= 0) badInput('Valor financiado deve ser positivo');
      if (input.termMonths <= 0) badInput('Prazo deve ser positivo');

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

      const [row] = await db
        .insert(schema.creditOperation)
        .values({
          collateralDescription: input.collateralDescription ?? null,
          collateralValueCents: input.collateralValueCents ?? null,
          firstDueDate: input.firstDueDate,
          holderId: input.holderId,
          lender: input.lender ?? null,
          modality: input.modality,
          monthlyRate,
          name: input.name,
          organizationId: viewer.organizationId,
          principalCents: input.principalCents,
          rateSource,
          system: input.system,
          termMonths: input.termMonths,
        })
        .returning();
      return row!;
    },
    deleteCreditOperation: async (_, { id }, context) => {
      const viewer = requireViewer(context);
      const deleted = await db
        .delete(schema.creditOperation)
        .where(
          and(
            eq(schema.creditOperation.id, id),
            eq(schema.creditOperation.organizationId, viewer.organizationId)
          )
        )
        .returning({ id: schema.creditOperation.id });
      return deleted.length > 0;
    },
    upsertStatement: async (_, { input }, context) => {
      const viewer = requireViewer(context);
      if (!MONTH.test(input.referenceMonth)) badInput('Mês deve estar no formato YYYY-MM');
      const [card] = await db
        .select()
        .from(schema.creditCard)
        .where(
          and(
            eq(schema.creditCard.id, input.creditCardId),
            eq(schema.creditCard.organizationId, viewer.organizationId)
          )
        );
      if (!card) notFound('Cartão');
      const [row] = await db
        .insert(schema.statement)
        .values(input)
        .onConflictDoUpdate({
          set: { amountCents: input.amountCents },
          target: [schema.statement.creditCardId, schema.statement.referenceMonth],
        })
        .returning();
      return row!;
    },
  },
  Query: {
    creditOperation: async (_, { id }, context) => {
      const viewer = requireViewer(context);
      const [row] = await db
        .select()
        .from(schema.creditOperation)
        .where(
          and(
            eq(schema.creditOperation.id, id),
            eq(schema.creditOperation.organizationId, viewer.organizationId)
          )
        );
      return row ?? null;
    },
  },
  Statement: {
    dueDate: async item => {
      const [card] = await db
        .select({ dueDay: schema.creditCard.dueDay })
        .from(schema.creditCard)
        .where(eq(schema.creditCard.id, item.creditCardId));
      return statementDueDate(card!, item.referenceMonth);
    },
  },
};
