import type { Resolvers } from '@zapbots/graphql/server';

import { companyGuides } from '../services/company';

/** The company's guides, read from Adaflow (docs/adr/0023). */
export const companyResolvers: Resolvers = {
  Holder: {
    companyGuides: holder => companyGuides(holder.id),
  },
};
