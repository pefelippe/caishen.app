import { jsonb, pgTable, text } from 'drizzle-orm/pg-core';

import { user } from './auth';
import { organizationId, timestamps } from './columns';

/** One card of the Página inicial as a User left it: shown or hidden, in the list's order. */
export interface HomeCardSetting {
  hidden: boolean;
  key: string;
}

/**
 * The Página inicial a User arranged: which cards show and in what order. Without a row, the
 * default; cards added to the app later join a saved layout in their default place.
 */
export const homeLayout = pgTable('home_layout', {
  cards: jsonb('cards').$type<HomeCardSetting[]>().notNull(),
  organizationId: organizationId(),
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  ...timestamps,
});
