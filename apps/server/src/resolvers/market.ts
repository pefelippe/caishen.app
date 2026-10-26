import type { Resolvers } from '@zapbots/graphql/server';

import { indicators } from '../services/indicators';
import { requireViewer } from './guards';

/** The market's figures (docs/adr/0025): public, but only for people signed in. */
export const marketResolvers: Resolvers = {
  Query: {
    indicators: (_, __, context) => {
      requireViewer(context);
      return indicators();
    },
  },
};
