import { MODALITY_KEYS } from '@zapbots/finance';
import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
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
export const taxFrequency = pgEnum('tax_frequency', ['MONTHLY', 'YEARLY']);
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
  /** Days of the month it is paid on, e.g. [15, 30]; its length is how many times a month. */
  paydays: integer('paydays')
    .array()
    .notNull()
    .default(sql`'{}'::integer[]`),
  startsOn: date('starts_on').notNull(),
  ...timestamps,
});

/** An Imposto: what a Holder pays to the government, monthly or once a year in installments. */
export const tax = pgTable(
  'tax',
  {
    /** A month's amount when MONTHLY; the year's total when YEARLY. */
    amountCents: cents('amount_cents').notNull(),
    dueDay: integer('due_day').notNull(),
    /** YEARLY: the month of the first installment. */
    dueMonth: integer('due_month'),
    frequency: taxFrequency('frequency').notNull(),
    holderId: uuid('holder_id')
      .notNull()
      .references(() => holder.id, { onDelete: 'cascade' }),
    id: uuid('id').primaryKey().defaultRandom(),
    installments: integer('installments').notNull().default(1),
    name: text('name').notNull(),
    organizationId: organizationId(),
    ...timestamps,
  },
  table => [index('tax_holder_idx').on(table.holderId)]
);

/** A Gasto: money that went out on `date`, typed in or imported from a spreadsheet. */
export const expense = pgTable(
  'expense',
  {
    amountCents: cents('amount_cents').notNull(),
    category: text('category'),
    date: date('date').notNull(),
    description: text('description').notNull(),
    holderId: uuid('holder_id')
      .notNull()
      .references(() => holder.id, { onDelete: 'cascade' }),
    id: uuid('id').primaryKey().defaultRandom(),
    /** Came from a spreadsheet rather than typed in. */
    imported: boolean('imported').notNull().default(false),
    organizationId: organizationId(),
    ...timestamps,
  },
  table => [index('expense_holder_date_idx').on(table.holderId, table.date)]
);

/** A Receita avulsa: money that came in once, on `date`, outside the Fontes de Renda. */
export const oneOffIncome = pgTable(
  'one_off_income',
  {
    amountCents: cents('amount_cents').notNull(),
    date: date('date').notNull(),
    description: text('description').notNull(),
    holderId: uuid('holder_id')
      .notNull()
      .references(() => holder.id, { onDelete: 'cascade' }),
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: organizationId(),
    ...timestamps,
  },
  table => [index('one_off_income_holder_date_idx').on(table.holderId, table.date)]
);

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

export const botKey = pgEnum('bot_key', ['FINANCE']);
export const messageRole = pgEnum('message_role', ['USER', 'BOT']);
export const jobStatus = pgEnum('job_status', ['QUEUED', 'RUNNING', 'DONE', 'FAILED']);
export const routineCadence = pgEnum('routine_cadence', ['WEEKLY', 'MONTHLY']);

/**
 * A Bot an Organization has on its team. Name and personality come from the catalog in code; only
 * the Model is chosen here (docs/adr/0010).
 */
export const bot = pgTable(
  'bot',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    key: botKey('key').notNull(),
    /** OpenRouter model id; `null` follows the server default. */
    model: text('model'),
    organizationId: organizationId(),
    ...timestamps,
  },
  table => [unique('bot_organization_key_unique').on(table.organizationId, table.key)]
);

export const conversation = pgTable(
  'conversation',
  {
    botId: uuid('bot_id')
      .notNull()
      .references(() => bot.id, { onDelete: 'cascade' }),
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: organizationId(),
    title: text('title')
      .notNull()
      .default(sql`'Nova conversa'`),
    ...timestamps,
  },
  table => [index('conversation_bot_idx').on(table.botId, table.updatedAt)]
);

export const message = pgTable(
  'message',
  {
    content: text('content').notNull(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversation.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    id: uuid('id').primaryKey().defaultRandom(),
    role: messageRole('role').notNull(),
  },
  table => [index('message_conversation_idx').on(table.conversationId, table.createdAt)]
);

/** Routine: the same Job handed to a Bot again every week or month (docs/adr/0010). */
export const routine = pgTable(
  'routine',
  {
    botId: uuid('bot_id')
      .notNull()
      .references(() => bot.id, { onDelete: 'cascade' }),
    cadence: routineCadence('cadence').notNull(),
    /** The User the Jobs run as, for their Connections; the Routine stops without one. */
    createdById: text('created_by_id').references(() => user.id, { onDelete: 'set null' }),
    id: uuid('id').primaryKey().defaultRandom(),
    instructions: text('instructions').notNull(),
    nextRunAt: timestamp('next_run_at', { withTimezone: true }).notNull(),
    organizationId: organizationId(),
    /** Set while the Routine is paused: the clock skips it until it is resumed. */
    pausedAt: timestamp('paused_at', { withTimezone: true }),
    ...timestamps,
  },
  table => [index('routine_next_run_idx').on(table.nextRunAt)]
);

/** Job: work handed to a Bot, done in the background and finished with a Deliverable. */
export const job = pgTable(
  'job',
  {
    botId: uuid('bot_id')
      .notNull()
      .references(() => bot.id, { onDelete: 'cascade' }),
    createdById: text('created_by_id').references(() => user.id, { onDelete: 'set null' }),
    /** The Deliverable as the Bot wrote it, in plain text; set when `DONE`. */
    deliverable: text('deliverable'),
    /** The User's edit of the Deliverable, in Markdown; `null` keeps the Bot's. */
    editedDeliverable: text('edited_deliverable'),
    /** Why the Job failed, in pt-BR; set when `FAILED`. */
    error: text('error'),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    id: uuid('id').primaryKey().defaultRandom(),
    instructions: text('instructions').notNull(),
    /** OpenRouter id of the Model that wrote the Deliverable. */
    model: text('model'),
    organizationId: organizationId(),
    /** The Routine that handed this Job over, if any. */
    routineId: uuid('routine_id').references(() => routine.id, { onDelete: 'set null' }),
    startedAt: timestamp('started_at', { withTimezone: true }),
    status: jobStatus('status').notNull().default('QUEUED'),
    ...timestamps,
  },
  table => [index('job_bot_idx').on(table.botId, table.createdAt)]
);

/** A Connection file (Google Drive) handed to a Bot with a Job. */
export const attachment = pgTable(
  'attachment',
  {
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    /** File id in the external service. */
    fileId: text('file_id').notNull(),
    id: uuid('id').primaryKey().defaultRandom(),
    jobId: uuid('job_id')
      .notNull()
      .references(() => job.id, { onDelete: 'cascade' }),
    mimeType: text('mime_type').notNull(),
    name: text('name').notNull(),
    organizationId: organizationId(),
    url: text('url').notNull(),
  },
  table => [index('attachment_job_idx').on(table.jobId)]
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

/** SCR Snapshot: a Holder's debts in the Bacen SCR for one reference month (docs/adr/0006). */
export const scrSnapshot = pgTable(
  'scr_snapshot',
  {
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    holderId: uuid('holder_id')
      .notNull()
      .references(() => holder.id, { onDelete: 'cascade' }),
    id: uuid('id').primaryKey().defaultRandom(),
    importedById: text('imported_by_id').references(() => user.id, { onDelete: 'set null' }),
    /** `YYYY-MM` data-base of the report. */
    referenceMonth: text('reference_month').notNull(),
    /** SHA-256 of the imported file; the file itself is discarded. `null` for manual entry. */
    sourceHash: text('source_hash'),
  },
  table => [
    unique('scr_snapshot_holder_month_unique').on(table.holderId, table.referenceMonth),
    unique('scr_snapshot_holder_hash_unique').on(table.holderId, table.sourceHash),
  ]
);

/** One institution × Modality line of an SCR Snapshot. */
export const scrEntry = pgTable('scr_entry', {
  dueCents: cents('due_cents').notNull().default(0),
  id: uuid('id').primaryKey().defaultRandom(),
  institution: text('institution').notNull(),
  limitCents: cents('limit_cents').notNull().default(0),
  lossCents: cents('loss_cents').notNull().default(0),
  /** Modality as written in the report (SCR naming, not our Modality enum). */
  modality: text('modality').notNull(),
  overdueCents: cents('overdue_cents').notNull().default(0),
  /** Upper bound in days of the worst overdue bucket; null when unknown. */
  overdueMaxDays: integer('overdue_max_days'),
  scrSnapshotId: uuid('scr_snapshot_id')
    .notNull()
    .references(() => scrSnapshot.id, { onDelete: 'cascade' }),
});

export const plan = pgEnum('plan', ['FREE', 'PRO']);

/**
 * Subscription: an Organization's paid Plan, as Stripe last reported it (docs/adr/0011). An
 * Organization without one, or with one no longer active, is on the free Plan.
 */
export const subscription = pgTable('subscription', {
  cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: organizationId().unique(),
  plan: plan('plan').notNull().default('FREE'),
  /** Stripe's own status: `active`, `trialing`, `past_due`, `canceled`… */
  status: text('status').notNull().default('incomplete'),
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  ...timestamps,
});

/** Usage code: adds Jobs and Messages to the Limit of the month it is redeemed in. */
export const usageCode = pgTable('usage_code', {
  /** Upper case, as typed. */
  code: text('code').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  id: uuid('id').primaryKey().defaultRandom(),
  jobs: integer('jobs').notNull().default(0),
  /** How many Organizations may redeem it; null for no cap. */
  maxRedemptions: integer('max_redemptions'),
  messages: integer('messages').notNull().default(0),
  ...timestamps,
});

export const usageCodeRedemption = pgTable(
  'usage_code_redemption',
  {
    codeId: uuid('code_id')
      .notNull()
      .references(() => usageCode.id, { onDelete: 'cascade' }),
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: organizationId(),
    redeemedAt: timestamp('redeemed_at', { withTimezone: true }).notNull().defaultNow(),
    redeemedById: text('redeemed_by_id').references(() => user.id, { onDelete: 'set null' }),
  },
  table => [
    unique('usage_code_redemption_once').on(table.codeId, table.organizationId),
    index('usage_code_redemption_organization_idx').on(table.organizationId),
  ]
);

/** Stripe events already handled, so a webhook delivered twice changes nothing the second time. */
export const stripeEvent = pgTable('stripe_event', {
  id: text('id').primaryKey(),
  receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
  type: text('type').notNull(),
});
