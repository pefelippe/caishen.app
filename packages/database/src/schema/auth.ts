/**
 * Tables owned by Better Auth (core + organization plugin). Field names must match what Better
 * Auth expects; regenerate from `getAuthTables` in `better-auth/db` when upgrading it.
 */
import { boolean, index, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

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
  /** The app's language for this User, `pt` or `en`; chosen on the Profile page. */
  language: text('language').notNull().default('pt'),
  name: text('name').notNull(),
  /** Whether signing in with a password also asks for a code from an authenticator app. */
  twoFactorEnabled: boolean('two_factor_enabled').notNull().default(false),
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

/**
 * A User's authenticator secret and recovery codes (Better Auth's `twoFactor` plugin), both
 * encrypted by Better Auth under `BETTER_AUTH_SECRET`.
 */
export const twoFactor = pgTable(
  'two_factor',
  {
    backupCodes: text('backup_codes').notNull(),
    failedVerificationCount: integer('failed_verification_count').notNull().default(0),
    id: text('id').primaryKey(),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    secret: text('secret').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    /** False between turning it on and typing the first code. */
    verified: boolean('verified').notNull().default(true),
  },
  table => [
    index('two_factor_user_idx').on(table.userId),
    index('two_factor_secret_idx').on(table.secret),
  ]
);

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
