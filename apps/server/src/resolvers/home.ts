import { db, schema } from '@zapbots/database';
import type { HomeCardKey, Resolvers } from '@zapbots/graphql/server';
import { and, eq } from 'drizzle-orm';

import { badInput, requireViewer } from './guards';

/** Every card the Página inicial knows; a saved key that is no longer here is left out. */
const CARD_KEYS = {
  CHATS: true,
  DUES: true,
  MARKET: true,
  MONTH: true,
  OVERVIEW: true,
} satisfies Record<HomeCardKey, true>;

const isCardKey = (key: string): key is HomeCardKey => Object.hasOwn(CARD_KEYS, key);

/** The saved cards that still exist, each once, in the saved order. */
function knownCards(cards: { hidden: boolean; key: string }[]) {
  const seen = new Set<string>();
  return cards.flatMap(({ hidden, key }) => {
    if (!isCardKey(key) || seen.has(key)) return [];
    seen.add(key);
    return [{ hidden: Boolean(hidden), key }];
  });
}

export const homeResolvers: Resolvers = {
  Mutation: {
    saveHomeLayout: async (_, { cards }, context) => {
      const viewer = requireViewer(context);
      // The layout is the User's own, inside the Organization they are signed in to.
      const mine = and(
        eq(schema.homeLayout.userId, viewer.userId),
        eq(schema.homeLayout.organizationId, viewer.organizationId)
      );
      if (!cards) {
        await db.delete(schema.homeLayout).where(mine);
        return null;
      }
      if (cards.length > Object.keys(CARD_KEYS).length * 2) badInput('Cards demais.');
      const saved = knownCards(cards);
      await db
        .insert(schema.homeLayout)
        .values({ cards: saved, organizationId: viewer.organizationId, userId: viewer.userId })
        .onConflictDoUpdate({
          set: { cards: saved, organizationId: viewer.organizationId },
          target: schema.homeLayout.userId,
        });
      return saved;
    },
  },
  Query: {
    homeLayout: async (_, __, context) => {
      const viewer = requireViewer(context);
      const [row] = await db
        .select({ cards: schema.homeLayout.cards })
        .from(schema.homeLayout)
        .where(
          and(
            eq(schema.homeLayout.userId, viewer.userId),
            eq(schema.homeLayout.organizationId, viewer.organizationId)
          )
        );
      return row ? knownCards(row.cards) : null;
    },
  },
};
