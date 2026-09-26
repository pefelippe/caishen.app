/**
 * Tables owned by Better Auth (core + organization plugin). Field names must match what Better
 * Auth expects; regenerate from `getAuthTables` in `better-auth/db` when upgrading it.
 */
import { boolean, index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

export const user = pgTable('user', {
  createdAt: createdAt(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  id: text('id').primaryKey(),
  image: text('image'),
  name: text('name').notNull(),
  updatedAt: updatedAt(),
});

export const session = pgTable(
  'session',
  {
    activeOrganizationId: text('active_organization_id'),
    createdAt: createdAt(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    id: text('id').primaryKey(),
    ipAddress: text('ip_address'),
    token: text('token').notNull().unique(),
    updatedAt: updatedAt(),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  table => [index('session_user_idx').on(table.userId)]
);

export const account = pgTable('account', {
  accessToken: text('access_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  accountId: text('account_id').notNull(),
  createdAt: createdAt(),
  id: text('id').primaryKey(),
  idToken: text('id_token'),
  password: text('password'),
  providerId: text('provider_id').notNull(),
  refreshToken: text('refresh_token'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  updatedAt: updatedAt(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

export const verification = pgTable('verification', {
  createdAt: createdAt(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  updatedAt: updatedAt(),
  value: text('value').notNull(),
});

export const organization = pgTable('organization', {
  createdAt: createdAt(),
  id: text('id').primaryKey(),
  logo: text('logo'),
  metadata: text('metadata'),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
});

export const member = pgTable(
  'member',
  {
    createdAt: createdAt(),
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    /** Papel: `admin` or `member` (Better Auth also reserves `owner` for the creator). */
    role: text('role').notNull().default('member'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  table => [index('member_user_idx').on(table.userId)]
);

export const invitation = pgTable('invitation', {
  createdAt: createdAt(),
  email: text('email').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  id: text('id').primaryKey(),
  inviterId: text('inviter_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' }),
  role: text('role'),
  status: text('status').notNull().default('pending'),
});
