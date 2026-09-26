import { MODALITY_KEYS } from '@mny/finance';
import { sql } from 'drizzle-orm';
import {
  bigint,
  customType,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import { organization, user } from './auth';

/** Money columns: integer cents (docs/adr/0004). `number` mode is exact up to R$ 90 trilhões. */
const cents = (name: string) => bigint(name, { mode: 'number' });

const bytea = customType<{ data: Uint8Array; driverData: Buffer }>({
  dataType: () => 'bytea',
  fromDriver: value => new Uint8Array(value),
  toDriver: value => Buffer.from(value),
});

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

const organizationId = () =>
  text('organization_id')
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' });

export const holderKind = pgEnum('holder_kind', ['PF', 'PJ']);
export const modality = pgEnum('modality', MODALITY_KEYS);
export const amortizationSystem = pgEnum('amortization_system', ['PRICE', 'SAC']);
export const rateSource = pgEnum('rate_source', ['INFORMED', 'IMPLIED']);
export const dataSource = pgEnum('data_source', ['BACEN_REGISTRATO', 'BUREAU', 'OPEN_FINANCE']);
export const riskBand = pgEnum('risk_band', ['HIGH', 'MEDIUM', 'LOW']);
export const bureau = pgEnum('bureau', ['SPC', 'SERASA', 'BOA_VISTA', 'QUOD']);

export const holder = pgTable(
  'holder',
  {
    birthDate: date('birth_date'),
    /** CPF (PF) or CNPJ (PJ), digits only. */
    document: text('document'),
    id: uuid('id').primaryKey().defaultRandom(),
    kind: holderKind('kind').notNull().default('PF'),
    name: text('name').notNull(),
    organizationId: organizationId(),
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  table => [index('holder_organization_idx').on(table.organizationId)]
);

export const incomeSource = pgTable('income_source', {
  description: text('description').notNull(),
  endsOn: date('ends_on'),
  holderId: uuid('holder_id')
    .notNull()
    .references(() => holder.id, { onDelete: 'cascade' }),
  id: uuid('id').primaryKey().defaultRandom(),
  monthlyNetCents: cents('monthly_net_cents').notNull(),
  startsOn: date('starts_on').notNull(),
  ...timestamps,
});

export const creditOperation = pgTable(
  'credit_operation',
  {
    collateralDescription: text('collateral_description'),
    collateralValueCents: cents('collateral_value_cents'),
    firstDueDate: date('first_due_date').notNull(),
    holderId: uuid('holder_id')
      .notNull()
      .references(() => holder.id, { onDelete: 'cascade' }),
    id: uuid('id').primaryKey().defaultRandom(),
    lender: text('lender'),
    modality: modality('modality').notNull(),
    /** Monthly effective rate as a fraction; derived from the installment when `IMPLIED`. */
    monthlyRate: numeric('monthly_rate', { precision: 16, scale: 12 }).notNull(),
    name: text('name').notNull(),
    organizationId: organizationId(),
    principalCents: cents('principal_cents').notNull(),
    rateSource: rateSource('rate_source').notNull(),
    system: amortizationSystem('system').notNull().default('PRICE'),
    termMonths: integer('term_months').notNull(),
    ...timestamps,
  },
  table => [index('credit_operation_holder_idx').on(table.holderId)]
);

export const extraAmortization = pgTable('extra_amortization', {
  amountCents: cents('amount_cents').notNull(),
  creditOperationId: uuid('credit_operation_id')
    .notNull()
    .references(() => creditOperation.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  id: uuid('id').primaryKey().defaultRandom(),
  ...timestamps,
});

export const creditCard = pgTable(
  'credit_card',
  {
    closingDay: integer('closing_day').notNull(),
    dueDay: integer('due_day').notNull(),
    holderId: uuid('holder_id')
      .notNull()
      .references(() => holder.id, { onDelete: 'cascade' }),
    id: uuid('id').primaryKey().defaultRandom(),
    issuer: text('issuer'),
    limitCents: cents('limit_cents').notNull(),
    name: text('name').notNull(),
    organizationId: organizationId(),
    ...timestamps,
  },
  table => [index('credit_card_holder_idx').on(table.holderId)]
);

export const statement = pgTable(
  'statement',
  {
    amountCents: cents('amount_cents').notNull(),
    creditCardId: uuid('credit_card_id')
      .notNull()
      .references(() => creditCard.id, { onDelete: 'cascade' }),
    id: uuid('id').primaryKey().defaultRandom(),
    /** `YYYY-MM` of the month the Statement is due. */
    referenceMonth: text('reference_month').notNull(),
    ...timestamps,
  },
  table => [unique('statement_card_month_unique').on(table.creditCardId, table.referenceMonth)]
);

export const note = pgTable(
  'note',
  {
    /** Yjs document state (Y.encodeStateAsUpdate), owned by the collab app. */
    content: bytea('content'),
    createdById: text('created_by_id').references(() => user.id, { onDelete: 'set null' }),
    creditCardId: uuid('credit_card_id').references(() => creditCard.id, { onDelete: 'set null' }),
    creditOperationId: uuid('credit_operation_id').references(() => creditOperation.id, {
      onDelete: 'set null',
    }),
    holderId: uuid('holder_id').references(() => holder.id, { onDelete: 'set null' }),
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: organizationId(),
    title: text('title')
      .notNull()
      .default(sql`'Sem título'`),
    ...timestamps,
  },
  table => [index('note_organization_idx').on(table.organizationId)]
);

export const consent = pgTable('consent', {
  grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
  grantedById: text('granted_by_id')
    .notNull()
    .references(() => user.id),
  holderId: uuid('holder_id')
    .notNull()
    .references(() => holder.id, { onDelete: 'cascade' }),
  id: uuid('id').primaryKey().defaultRandom(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
  source: dataSource('source').notNull(),
});

export const assessment = pgTable(
  'assessment',
  {
    band: riskBand('band').notNull(),
    /** Points per component: punctuality, capacity, utilization. */
    breakdown: jsonb('breakdown').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    createdById: text('created_by_id').references(() => user.id, { onDelete: 'set null' }),
    holderId: uuid('holder_id')
      .notNull()
      .references(() => holder.id, { onDelete: 'cascade' }),
    id: uuid('id').primaryKey().defaultRandom(),
    indicators: jsonb('indicators').notNull(),
    modelVersion: text('model_version').notNull(),
    score: integer('score').notNull(),
  },
  table => [index('assessment_holder_idx').on(table.holderId, table.createdAt)]
);

/** An installment not paid on its due date; open while `paidOn` is null. */
export const latePayment = pgTable(
  'late_payment',
  {
    creditOperationId: uuid('credit_operation_id')
      .notNull()
      .references(() => creditOperation.id, { onDelete: 'cascade' }),
    id: uuid('id').primaryKey().defaultRandom(),
    installmentNumber: integer('installment_number').notNull(),
    paidOn: date('paid_on'),
    ...timestamps,
  },
  table => [
    unique('late_payment_installment_unique').on(table.creditOperationId, table.installmentNumber),
  ]
);

/** A bureau score the Holder looked up and typed in, kept to compare with ours. */
export const reportedScore = pgTable(
  'reported_score',
  {
    bureau: bureau('bureau').notNull(),
    consultedOn: date('consulted_on').notNull(),
    createdById: text('created_by_id').references(() => user.id, { onDelete: 'set null' }),
    holderId: uuid('holder_id')
      .notNull()
      .references(() => holder.id, { onDelete: 'cascade' }),
    id: uuid('id').primaryKey().defaultRandom(),
    score: integer('score').notNull(),
    ...timestamps,
  },
  table => [index('reported_score_holder_idx').on(table.holderId, table.consultedOn)]
);
