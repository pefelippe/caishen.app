import { db, schema } from '@zapbots/database';
import { addMonths, AssessmentError, riskBand, today } from '@zapbots/finance';
import type { Resolvers } from '@zapbots/graphql/server';
import { desc, eq } from 'drizzle-orm';

import { marketIndicators } from '../services/bacen';
import {
  computeAssessment,
  monthlyIncome,
  payoffPlanFor,
  upcomingDues,
} from '../services/obligations';
import { monthStatement } from '../services/month';
import { viewerHolder } from '../services/viewerHolder';
import { badInput, findHolder, notFound, owned, requireViewer } from './guards';

const isDay = (day: number) => Number.isInteger(day) && day >= 1 && day <= 31;

const MAX_IMPORTED_EXPENSES = 2000;

/** A Gasto's (or Receita avulsa's) columns, checked: positive whole cents, a description, a real date. */
function expenseValues(input: {
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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || Number.isNaN(Date.parse(input.date))) {
    badInput(`Data inválida: ${input.date}`);
  }
  return {
    amountCents: input.amountCents,
    category: input.category?.trim() || null,
    date: input.date,
    description,
  };
}

export const holderResolvers: Resolvers = {
  Assessment: {
    breakdown: assessment => assessment.breakdown as never,
    indicators: assessment => assessment.indicators as never,
  },
  Holder: {
    payoffPlan: (holder, { monthlyExtraCents }) => {
      if (!Number.isInteger(monthlyExtraCents) || monthlyExtraCents <= 0) {
        badInput('Informe um valor mensal maior que zero');
      }
      return payoffPlanFor(holder.id, monthlyExtraCents);
    },
    assessments: holder =>
      db
        .select()
        .from(schema.assessment)
        .where(eq(schema.assessment.holderId, holder.id))
        .orderBy(desc(schema.assessment.createdAt)),
    consents: holder =>
      db.select().from(schema.consent).where(eq(schema.consent.holderId, holder.id)),
    creditCards: holder =>
      db.select().from(schema.creditCard).where(eq(schema.creditCard.holderId, holder.id)),
    creditOperations: holder =>
      db
        .select()
        .from(schema.creditOperation)
        .where(eq(schema.creditOperation.holderId, holder.id)),
    incomeSources: holder =>
      db.select().from(schema.incomeSource).where(eq(schema.incomeSource.holderId, holder.id)),
    monthlyIncomeCents: holder => monthlyIncome(holder.id),
    taxes: holder =>
      db
        .select()
        .from(schema.tax)
        .where(eq(schema.tax.holderId, holder.id))
        .orderBy(schema.tax.createdAt),
    upcomingDues: holder => upcomingDues(holder.id),
    month: (holder, { month }) => {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) badInput('Mês inválido: use AAAA-MM');
      return monthStatement(holder.id, month);
    },
    months: (holder, { last }) => {
      if (!Number.isInteger(last) || last < 1 || last > 12) badInput('De 1 a 12 meses');
      const current = today().slice(0, 7);
      const months = Array.from({ length: last }, (_, index) =>
        addMonths(`${current}-01`, index - last + 1).slice(0, 7)
      );
      return Promise.all(months.map(month => monthStatement(holder.id, month)));
    },
    expenses: holder =>
      db
        .select()
        .from(schema.expense)
        .where(eq(schema.expense.holderId, holder.id))
        .orderBy(desc(schema.expense.date), desc(schema.expense.createdAt)),
    reportedScores: holder =>
      db
        .select()
        .from(schema.reportedScore)
        .where(eq(schema.reportedScore.holderId, holder.id))
        .orderBy(desc(schema.reportedScore.consultedOn)),
  },
  Mutation: {
    addReportedScore: async (_, { input }, context) => {
      const viewer = requireViewer(context);
      await findHolder(viewer, input.holderId);
      if (!Number.isInteger(input.score) || input.score < 0 || input.score > 1000) {
        badInput('O score dos birôs vai de 0 a 1000');
      }
      const [row] = await db
        .insert(schema.reportedScore)
        .values({ ...input, createdById: viewer.userId })
        .returning();
      return row!;
    },
    addIncomeSource: async (_, { input }, context) => {
      await findHolder(requireViewer(context), input.holderId);
      const paydays = [...new Set(input.paydays ?? [])].sort((a, b) => a - b);
      if (paydays.some(day => !isDay(day))) badInput('Dias de pagamento vão de 1 a 31');
      const [row] = await db
        .insert(schema.incomeSource)
        .values({
          description: input.description,
          endsOn: input.endsOn ?? null,
          holderId: input.holderId,
          monthlyNetCents: input.monthlyNetCents,
          paydays,
          startsOn: input.startsOn,
        })
        .returning();
      return row!;
    },
    addTax: async (_, { input }, context) => {
      const viewer = requireViewer(context);
      await findHolder(viewer, input.holderId);
      if (input.amountCents <= 0) badInput('Valor deve ser positivo');
      if (!isDay(input.dueDay)) badInput('Dia de vencimento vai de 1 a 31');
      const yearly = input.frequency === 'YEARLY';
      const installments = yearly ? (input.installments ?? 1) : 1;
      if (!Number.isInteger(installments) || installments < 1 || installments > 12) {
        badInput('Parcelas vão de 1 a 12');
      }
      const dueMonth = yearly ? input.dueMonth : null;
      if (
        yearly &&
        (dueMonth == null || !Number.isInteger(dueMonth) || dueMonth < 1 || dueMonth > 12)
      ) {
        badInput('Informe o mês do vencimento');
      }
      const [row] = await db
        .insert(schema.tax)
        .values({
          amountCents: input.amountCents,
          dueDay: input.dueDay,
          dueMonth: dueMonth ?? null,
          frequency: input.frequency,
          holderId: input.holderId,
          installments,
          name: input.name,
          organizationId: viewer.organizationId,
        })
        .returning();
      return row!;
    },
    addExpense: async (_, { input }, context) => {
      const viewer = requireViewer(context);
      await findHolder(viewer, input.holderId);
      const [row] = await db
        .insert(schema.expense)
        .values({
          ...expenseValues(input),
          holderId: input.holderId,
          organizationId: viewer.organizationId,
        })
        .returning();
      return row!;
    },
    importExpenses: async (_, { holderId, rows }, context) => {
      const viewer = requireViewer(context);
      await findHolder(viewer, holderId);
      if (!rows.length) badInput('A planilha não tem linhas de gastos');
      if (rows.length > MAX_IMPORTED_EXPENSES) {
        badInput(`Importe até ${MAX_IMPORTED_EXPENSES} linhas por vez`);
      }
      const values = rows.map(row => ({
        ...expenseValues(row),
        holderId,
        imported: true,
        organizationId: viewer.organizationId,
      }));
      await db.insert(schema.expense).values(values);
      return values.length;
    },
    addOneOffIncome: async (_, { input }, context) => {
      const viewer = requireViewer(context);
      await findHolder(viewer, input.holderId);
      const values = expenseValues({ ...input, category: null });
      const [row] = await db
        .insert(schema.oneOffIncome)
        .values({
          amountCents: values.amountCents,
          date: values.date,
          description: values.description,
          holderId: input.holderId,
          organizationId: viewer.organizationId,
        })
        .returning({ id: schema.oneOffIncome.id });
      return row!.id;
    },
    deleteOneOffIncome: async (_, { id }, context) => {
      const deleted = await db
        .delete(schema.oneOffIncome)
        .where(owned(schema.oneOffIncome, requireViewer(context), id))
        .returning({ id: schema.oneOffIncome.id });
      return deleted.length > 0;
    },
    deleteExpense: async (_, { id }, context) => {
      const deleted = await db
        .delete(schema.expense)
        .where(owned(schema.expense, requireViewer(context), id))
        .returning({ id: schema.expense.id });
      return deleted.length > 0;
    },
    deleteTax: async (_, { id }, context) => {
      const deleted = await db
        .delete(schema.tax)
        .where(owned(schema.tax, requireViewer(context), id))
        .returning({ id: schema.tax.id });
      return deleted.length > 0;
    },
    createHolder: async (_, { input }, context) => {
      const viewer = requireViewer(context);
      const [row] = await db
        .insert(schema.holder)
        .values({
          birthDate: input.birthDate ?? null,
          document: input.document?.replace(/\D/g, '') || null,
          name: input.name,
          organizationId: viewer.organizationId,
        })
        .returning();
      return row!;
    },
    generateAssessment: async (_, { holderId }, context) => {
      const viewer = requireViewer(context);
      await findHolder(viewer, holderId);
      try {
        const result = await computeAssessment(holderId);
        const [row] = await db
          .insert(schema.assessment)
          .values({
            createdById: viewer.userId,
            band: result.band,
            breakdown: result.breakdown,
            holderId,
            indicators: result.indicators,
            modelVersion: result.modelVersion,
            score: result.score,
          })
          .returning();
        return row!;
      } catch (error) {
        if (error instanceof AssessmentError) badInput(error.message);
        throw error;
      }
    },
    grantConsent: async (_, { holderId, source }, context) => {
      const viewer = requireViewer(context);
      await findHolder(viewer, holderId);
      const [row] = await db
        .insert(schema.consent)
        .values({ grantedById: viewer.userId, holderId, source })
        .returning();
      return row!;
    },
    revokeConsent: async (_, { id }, context) => {
      const viewer = requireViewer(context);
      const [consent] = await db.select().from(schema.consent).where(eq(schema.consent.id, id));
      if (!consent) notFound('Consentimento');
      await findHolder(viewer, consent.holderId);
      const [row] = await db
        .update(schema.consent)
        .set({ revokedAt: new Date() })
        .where(eq(schema.consent.id, id))
        .returning();
      return row!;
    },
  },
  ReportedScore: {
    band: reported => riskBand(reported.score),
  },
  Query: {
    holder: async (_, { id }, context) => {
      const viewer = requireViewer(context);
      const [row] = await db
        .select()
        .from(schema.holder)
        .where(owned(schema.holder, viewer, id));
      return row ?? null;
    },
    holders: (_, __, context) =>
      db
        .select()
        .from(schema.holder)
        .where(owned(schema.holder, requireViewer(context)))
        .orderBy(schema.holder.name),
    marketIndicators: () => marketIndicators(),
    viewer: (_, __, context) => context.viewer,
    viewerHolder: (_, __, context) => viewerHolder(requireViewer(context)),
  },
};
