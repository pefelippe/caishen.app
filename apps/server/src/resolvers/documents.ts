import { db, schema } from '@zapbots/database';
import type { Resolvers } from '@zapbots/graphql/server';
import { and, desc, eq } from 'drizzle-orm';

import { owned, requireViewer } from './guards';

const LIMIT = 100;

export const documentResolvers: Resolvers = {
  Query: {
    documents: async (_, __, context) => {
      const viewer = requireViewer(context);
      const [deliverables, attachments] = await Promise.all([
        db
          .select()
          .from(schema.job)
          .where(and(owned(schema.job, viewer), eq(schema.job.status, 'DONE')))
          .orderBy(desc(schema.job.finishedAt))
          .limit(LIMIT),
        db
          .select()
          .from(schema.attachment)
          .where(owned(schema.attachment, viewer))
          .orderBy(desc(schema.attachment.createdAt))
          .limit(LIMIT),
      ]);
      return { attachments, deliverables };
    },
  },
};
