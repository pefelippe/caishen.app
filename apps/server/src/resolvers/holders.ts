import { db, schema } from '@mny/database';
import { AssessmentError, riskBand } from '@mny/finance';
import type { Resolvers } from '@mny/graphql/server';
import { and, desc, eq } from 'drizzle-orm';

import { marketIndicators } from '../services/bacen';
import { computeAssessment, monthlyIncome, upcomingDues } from '../services/obligations';
import { viewerHolder } from '../services/viewerHolder';
import { badInput, findHolder, notFound, requireViewer } from './guards';

export const holderResolvers: Resolvers = {
  Assessment: {
    breakdown: assessment => assessment.breakdown as never,
    indicators: assessment => assessment.indicators as never,
  },
  Holder: {
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
      const [row] = await db
        .insert(schema.incomeSource)
        .values({
          description: input.description,
          endsOn: input.endsOn ?? null,
          holderId: input.holderId,
          monthlyNetCents: input.monthlyNetCents,
          startsOn: input.startsOn,
        })
        .returning();
      return row!;
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
        .where(
          and(eq(schema.holder.id, id), eq(schema.holder.organizationId, viewer.organizationId))
        );
      return row ?? null;
    },
    holders: (_, __, context) =>
      db
        .select()
        .from(schema.holder)
        .where(eq(schema.holder.organizationId, requireViewer(context).organizationId))
        .orderBy(schema.holder.name),
    marketIndicators: () => marketIndicators(),
    viewer: (_, __, context) => context.viewer,
    viewerHolder: (_, __, context) => viewerHolder(requireViewer(context)),
  },
};
