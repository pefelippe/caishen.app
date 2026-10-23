import { db, schema } from '@zapbots/database';
import { addMonths, AssessmentError, riskBand, today } from '@zapbots/finance';
import type { Resolvers } from '@zapbots/graphql/server';
import { and, desc, eq } from 'drizzle-orm';

import { marketIndicators } from '../services/bacen';
import {
  computeAssessment,
  monthlyIncome,
  payoffPlanFor,
  upcomingDues,
} from '../services/obligations';
import { monthlyNetBrlCents } from '../services/income';
import { MAX_PERIOD_DAYS, monthStatement, periodStatement } from '../services/month';
import { fieldsFor, inputFor } from '../services/recordForms';
import {
  addExpense,
  addIncomeSource,
  addOneOffIncome,
  addRecurringExpense,
  expenseValues,
  isDay,
  deleteRecord,
  findIncomeSource,
  readRecord,
  updateRecord,
} from '../services/records';
import { viewerHolder } from '../services/viewerHolder';
import { badInput, findHolder, notFound, owned, requireViewer } from './guards';

const MAX_IMPORTED_EXPENSES = 2000;

export const holderResolvers: Resolvers = {
  IncomeSource: {
    iofRate: source => (source.iofRate == null ? null : Number(source.iofRate)),
    monthlyNetBrlCents: source => monthlyNetBrlCents(source, today()),
    spreadRate: source => (source.spreadRate == null ? null : Number(source.spreadRate)),
  },
  RecurringExpense: {
    creditCard: async item => {
      if (!item.creditCardId) return null;
      const [card] = await db
        .select()
        .from(schema.creditCard)
        .where(eq(schema.creditCard.id, item.creditCardId));
      return card ?? null;
    },
  },
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
    recurringExpenses: holder =>
      db
        .select()
        .from(schema.recurringExpense)
        .where(eq(schema.recurringExpense.holderId, holder.id))
        .orderBy(schema.recurringExpense.dueDay),
    upcomingDues: holder => upcomingDues(holder.id),
    month: (holder, { month }) => {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) badInput('Mês inválido: use AAAA-MM');
      return monthStatement(holder.id, month);
    },
    period: (holder, { from, to }) => {
      if (from > to) badInput('O início vem depois do fim');
      if (Date.parse(to) - Date.parse(from) > MAX_PERIOD_DAYS * 86_400_000) {
        badInput('Escolha um período de até dois anos');
      }
      return periodStatement(holder.id, from, to);
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
    addIncomeSource: (_, { input }, context) => addIncomeSource(requireViewer(context), input),
    setIncomeRate: async (_, { date, incomeSourceId, rate }, context) => {
      const viewer = requireViewer(context);
      const source = await findIncomeSource(viewer, incomeSourceId);
      if (source.currency === 'BRL') badInput('Esta renda já é em reais');
      if (rate == null) {
        await db
          .delete(schema.incomeRateOverride)
          .where(
            and(
              eq(schema.incomeRateOverride.incomeSourceId, source.id),
              eq(schema.incomeRateOverride.date, date)
            )
          );
        return true;
      }
      if (!(rate > 0) || rate > 100) badInput('Cotação inválida');
      await db
        .insert(schema.incomeRateOverride)
        .values({ date, incomeSourceId: source.id, rate: String(rate) })
        .onConflictDoUpdate({
          set: { rate: String(rate) },
          target: [schema.incomeRateOverride.incomeSourceId, schema.incomeRateOverride.date],
        });
      return true;
    },
    addRecurringExpense: (_, { input }, context) =>
      addRecurringExpense(requireViewer(context), input),
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
    addExpense: (_, { input }, context) => addExpense(requireViewer(context), input),
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
    deleteRecord: async (_, { id, kind }, context) => {
      await deleteRecord(requireViewer(context), kind, id);
      return true;
    },
    updateRecord: async (_, { id, kind, values }, context) => {
      const viewer = requireViewer(context);
      const { holderId } = await readRecord(viewer, kind, id);
      const args = Object.fromEntries(values.map(({ key, value }) => [key, value]));
      await updateRecord(viewer, kind, id, inputFor(kind, args, holderId, viewer.organizationId));
      return true;
    },
    addOneOffIncome: async (_, { input }, context) =>
      (await addOneOffIncome(requireViewer(context), input)).id,
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
    recordFields: async (_, { id, kind }, context) =>
      fieldsFor(kind, await readRecord(requireViewer(context), kind, id)),
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
