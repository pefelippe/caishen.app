import { db, schema } from '@zapbots/database';
import { AssessmentError, riskBand } from '@zapbots/finance';
import type { Resolvers } from '@zapbots/graphql/server';
import { desc, eq } from 'drizzle-orm';

import { marketIndicators } from '../services/bacen';
import {
  computeAssessment,
  monthlyIncome,
  payoffPlanFor,
  upcomingDues,
} from '../services/obligations';
import { viewerHolder } from '../services/viewerHolder';
import { badInput, findHolder, notFound, owned, requireViewer } from './guards';

const isDay = (day: number) => Number.isInteger(day) && day >= 1 && day <= 31;

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
