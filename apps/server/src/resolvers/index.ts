import type { Resolvers } from '@mny/graphql/server';

import { holderResolvers } from './holders';
import { noteResolvers } from './notes';
import { obligationResolvers } from './obligations';
import { scalars } from './scalars';

const modules = [holderResolvers, obligationResolvers, noteResolvers];

export const resolvers: Resolvers = {
  ...Object.assign({}, ...modules),
  ...scalars,
  Mutation: Object.assign({}, ...modules.map(module => module.Mutation)),
  Query: Object.assign({}, ...modules.map(module => module.Query)),
};
