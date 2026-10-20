import type { Resolvers } from '@zapbots/graphql/server';

import { connections } from '../services/connections';
import { requireViewer } from './guards';

export const connectionResolvers: Resolvers = {
  Query: {
    connections: (_, __, context) => connections(requireViewer(context)),
  },
};
