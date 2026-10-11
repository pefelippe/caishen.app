import { db, schema } from '@mny/database';
import { scrStage } from '@mny/finance';
import type { Resolvers } from '@mny/graphql/server';
import { desc, eq } from 'drizzle-orm';

import { declaredObligations } from '../services/obligations';
import { ScrImportError, createScrSnapshot, scrEntries, summarize } from '../services/scr';
import { badInput, findHolder, notFound, requireViewer } from './guards';

export const scrResolvers: Resolvers = {
  Holder: {
    registeredDebtCents: async holder => {
      const declared = await declaredObligations(holder.id);
      return declared.outstandingDebtCents + declared.openStatementsCents;
    },
    scrSnapshots: holder =>
      db
        .select()
        .from(schema.scrSnapshot)
        .where(eq(schema.scrSnapshot.holderId, holder.id))
        .orderBy(desc(schema.scrSnapshot.referenceMonth)),
  },
  Mutation: {
    createScrSnapshot: async (_, { input }, context) => {
      const viewer = requireViewer(context);
      await findHolder(viewer, input.holderId);
      try {
        return await createScrSnapshot(viewer, input.holderId, input.referenceMonth, input.entries);
      } catch (error) {
        if (error instanceof ScrImportError) badInput(error.message);
        throw error;
      }
    },
    deleteScrSnapshot: async (_, { id }, context) => {
      const viewer = requireViewer(context);
      const [snapshot] = await db
        .select()
        .from(schema.scrSnapshot)
        .where(eq(schema.scrSnapshot.id, id));
      if (!snapshot) notFound('Retrato SCR');
      await findHolder(viewer, snapshot.holderId);
      await db.delete(schema.scrSnapshot).where(eq(schema.scrSnapshot.id, id));
      return true;
    },
  },
  ScrSnapshot: {
    entries: snapshot => scrEntries(snapshot.id),
    imported: snapshot => snapshot.sourceHash !== null,
    totals: async snapshot => {
      const entries = await scrEntries(snapshot.id);
      const summary = summarize(snapshot.referenceMonth, entries);
      return {
        debtCents: summary.dueCents + summary.overdueCents + summary.lossCents,
        dueCents: summary.dueCents,
        limitCents: entries.reduce((sum, entry) => sum + entry.limitCents, 0),
        lossCents: summary.lossCents,
        overdueCents: summary.overdueCents,
        stage: scrStage(summary),
      };
    },
  },
};
