import type { Resolvers } from '@mny/graphql/server';

import { holderResolvers } from './holders';
import { noteResolvers } from './notes';
import { obligationResolvers } from './obligations';
import { scalars } from './scalars';
import { scrResolvers } from './scr';

const modules: Resolvers[] = [holderResolvers, obligationResolvers, noteResolvers, scrResolvers];

/** Merges per type, so several modules can each add fields to the same type (e.g. Holder). */
function mergeResolvers(parts: Resolvers[]): Resolvers {
  const merged: Record<string, Record<string, unknown>> = {};
  for (const part of parts) {
    for (const [type, fields] of Object.entries(part)) {
      merged[type] = { ...merged[type], ...(fields as Record<string, unknown>) };
    }
  }
  return merged as Resolvers;
}

export const resolvers: Resolvers = { ...mergeResolvers(modules), ...scalars };
