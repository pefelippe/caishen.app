import type { Resolvers } from '@zapbots/graphql/server';

import { billingResolvers } from './billing';
import { botResolvers } from './bots';
import { companyResolvers } from './company';
import { connectionResolvers } from './connections';
import { documentResolvers } from './documents';
import { holderResolvers } from './holders';
import { obligationResolvers } from './obligations';
import { scalars } from './scalars';
import { scrResolvers } from './scr';
import { settingsResolvers } from './settings';

const modules: Resolvers[] = [
  holderResolvers,
  companyResolvers,
  obligationResolvers,
  scrResolvers,
  botResolvers,
  connectionResolvers,
  documentResolvers,
  settingsResolvers,
  billingResolvers,
];

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
