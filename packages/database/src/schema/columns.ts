import { bigint, text, timestamp } from 'drizzle-orm/pg-core';

import { organization } from './auth';

/** Money columns: integer cents (docs/adr/0004). `number` mode is exact up to R$ 90 trilhões. */
export const cents = (name: string) => bigint(name, { mode: 'number' });

export const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const organizationId = () =>
  text('organization_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' });
