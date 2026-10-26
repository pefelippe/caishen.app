import { MODALITY_KEYS } from '@zapbots/finance';
import { sql } from 'drizzle-orm';
import {
  type AnyPgColumn,
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
  uniqueIndex,
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
    /** The CNPJ of the Titular's own company, digits only; looked up at the Receita (docs/adr/0024). */
    companyCnpj: text('company_cnpj'),
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

export const currency = pgEnum('currency', ['BRL', 'USD']);

export const incomeSource = pgTable('income_source', {
  /** BRL, or the foreign currency it is paid in; then the amounts below are in it. */
  currency: currency('currency').notNull().default('BRL'),
  description: text('description').notNull(),
  endsOn: date('ends_on'),
  holderId: uuid('holder_id')
    .notNull()
    .references(() => holder.id, { onDelete: 'cascade' }),
  id: uuid('id').primaryKey().defaultRandom(),
  /** IOF on converting a foreign payment, as a fraction; `null` uses the 0,38% of the law. */
  iofRate: numeric('iof_rate', { precision: 8, scale: 6 }),
  /** The month's total in `currency`: each payday gets an equal part. */
  monthlyNetCents: cents('monthly_net_cents').notNull(),
  /** Days of the month it is paid on, e.g. [15, 30]; its length is how many times a month. */
  paydays: integer('paydays')
    .array()
    .notNull()
    .default(sql`'{}'::integer[]`),
  /** The bank's or app's spread on the exchange rate, as a fraction; `null` for none. */
  spreadRate: numeric('spread_rate', { precision: 8, scale: 6 }),
  startsOn: date('starts_on').notNull(),
  ...timestamps,
});

/** The Banco Central's PTAX for a day, kept once fetched: reais per unit of `currency`. */
export const exchangeRate = pgTable(
  'exchange_rate',
  {
    /** PTAX de compra: what a bank pays for the currency, as when a salary comes in. */
    buyRate: numeric('buy_rate', { precision: 12, scale: 6 }).notNull(),
    currency: currency('currency').notNull(),
    date: date('date').notNull(),
  },
  table => [unique('exchange_rate_currency_date_unique').on(table.currency, table.date)]
);

/** The rate a payment of a foreign Fonte de Renda really got, typed by the User over the PTAX. */
export const incomeRateOverride = pgTable(
  'income_rate_override',
  {
    date: date('date').notNull(),
    id: uuid('id').primaryKey().defaultRandom(),
    incomeSourceId: uuid('income_source_id')
      .notNull()
      .references(() => incomeSource.id, { onDelete: 'cascade' }),
    rate: numeric('rate', { precision: 12, scale: 6 }).notNull(),
    ...timestamps,
  },
  table => [unique('income_rate_override_source_date_unique').on(table.incomeSourceId, table.date)]
);

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

export const taxRegime = pgEnum('tax_regime', ['MEI', 'SIMPLES', 'PRESUMIDO', 'REAL']);
export const simplesAnnex = pgEnum('simples_annex', ['I', 'II', 'III', 'IV', 'V']);
export const companyActivity = pgEnum('company_activity', [
  'COMMERCE',
  'INDUSTRY',
  'SERVICES',
  'COMMERCE_SERVICES',
]);

/**
 * A Titular's company (Empresa) as ADR 0016 worked out its taxes. Unused since ADR 0023, which stopped
 * working out a company's taxes. Kept because migrations stay additive.
 */
export const company = pgTable(
  'company',
  {
    activity: companyActivity('activity').notNull().default('SERVICES'),
    /** Simples Nacional: the Anexo it registered; with `fatorR`, III or V by its payroll. */
    annex: simplesAnnex('annex'),
    /** 14 characters, digits or (from July 2026) letters, as the Receita writes them. */
    cnpj: text('cnpj').notNull(),
    /** Its revenue comes from abroad: exports pay no PIS, Cofins, ISS, ICMS or IPI. */
    exports: boolean('exports').notNull().default(false),
    fatorR: boolean('fator_r').notNull().default(false),
    holderId: uuid('holder_id')
      .notNull()
      .unique()
      .references(() => holder.id, { onDelete: 'cascade' }),
    id: uuid('id').primaryKey().defaultRandom(),
    /** Lucro Presumido: the city's ISS rate, as a fraction. */
    issRate: numeric('iss_rate', { precision: 8, scale: 6 }),
    name: text('name'),
    organizationId: organizationId(),
    /** The partners' monthly pró-labore, gross; 0 for none. */
    proLaboreCents: cents('pro_labore_cents').notNull().default(0),
    regime: taxRegime('regime').notNull(),
    /** The Fonte de Renda its revenue arrives as, when the Titular is paid through it. */
    revenueSourceId: uuid('revenue_source_id').references(() => incomeSource.id, {
      onDelete: 'set null',
    }),
    /** The first month whose taxes count. */
    startsOn: date('starts_on').notNull(),
    ...timestamps,
  },
  table => [index('company_organization_idx').on(table.organizationId)]
);

/** A company's revenue for one competência (ADR 0016). Unused since ADR 0023, kept like `company`. */
export const companyRevenue = pgTable(
  'company_revenue',
  {
    amountCents: cents('amount_cents').notNull(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => company.id, { onDelete: 'cascade' }),
    id: uuid('id').primaryKey().defaultRandom(),
    /** `YYYY-MM`. */
    month: text('month').notNull(),
    organizationId: organizationId(),
    /** The revenue of the 12 months before, as the PGDAS-D shows it; otherwise worked out. */
    rbt12Cents: cents('rbt12_cents'),
    ...timestamps,
  },
  table => [unique('company_revenue_company_month_unique').on(table.companyId, table.month)]
);

/**
 * A guide the Titular's company owes (DAS, DARF…), meant to be read from Adaflow (docs/adr/0023).
 * Unused: Adaflow's API has no way to read guides. Kept because migrations stay additive.
 */
export const companyGuide = pgTable(
  'company_guide',
  {
    amountCents: cents('amount_cents').notNull(),
    /** `YYYY-MM`, the month the guide is for. */
    competence: text('competence').notNull(),
    dueDate: date('due_date').notNull(),
    /** The guide's id at the source, so reading it again updates it. */
    externalId: text('external_id').notNull(),
    holderId: uuid('holder_id')
      .notNull()
      .references(() => holder.id, { onDelete: 'cascade' }),
    id: uuid('id').primaryKey().defaultRandom(),
    /** As the source names it: "DAS - Documento de Arrecadação do Simples Nacional". */
    name: text('name').notNull(),
    organizationId: organizationId(),
    /** As the source says; the Caishen never marks a guide paid (docs/adr/0009). */
    paid: boolean('paid').notNull().default(false),
    ...timestamps,
  },
  table => [
    unique('company_guide_holder_external_unique').on(table.holderId, table.externalId),
    index('company_guide_holder_due_idx').on(table.holderId, table.dueDate),
  ]
);

export const importSource = pgEnum('import_source', ['CSV', 'XLSX', 'OFX', 'PDF']);
export const importAccountKind = pgEnum('import_account_kind', [
  'CHECKING',
  'CREDIT_CARD',
  'SAVINGS',
  'OTHER',
]);

/**
 * An Importação: one file of Gastos brought in at once, with the bank and the kind of account it
 * came from, both editable later. Deleting it takes its Gastos.
 */
export const expenseImport = pgTable(
  'expense_import',
  {
    accountKind: importAccountKind('account_kind').notNull().default('CHECKING'),
    bankName: text('bank_name'),
    fileName: text('file_name').notNull(),
    holderId: uuid('holder_id')
      .notNull()
      .references(() => holder.id, { onDelete: 'cascade' }),
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: organizationId(),
    source: importSource('source').notNull(),
    ...timestamps,
  },
  table => [index('expense_import_holder_idx').on(table.holderId, table.createdAt)]
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
    /** The Vínculo bancário it came from; unlinking the bank takes it along. */
    bankLinkId: uuid('bank_link_id').references(() => bankLink.id, { onDelete: 'cascade' }),
    /** The line's key where it came from (`ofx:…`, `pluggy:…`), so importing it again adds nothing. */
    externalId: text('external_id'),
    /** Came from a spreadsheet rather than typed in. */
    imported: boolean('imported').notNull().default(false),
    /** The Importação it came in with; deleting the Importação takes it along. */
    importId: uuid('import_id').references(() => expenseImport.id, { onDelete: 'cascade' }),
    organizationId: organizationId(),
    ...timestamps,
  },
  table => [
    index('expense_holder_date_idx').on(table.holderId, table.date),
    unique('expense_holder_external_unique').on(table.holderId, table.externalId),
  ]
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
    /**
     * The Open Finance card it is read from (docs/adr/0020): its limit, days and Faturas come from
     * the bank on each read. `null` when typed in.
     */
    bankAccountId: uuid('bank_account_id')
      .unique('credit_card_bank_account_unique')
      .references((): AnyPgColumn => bankAccount.id, { onDelete: 'cascade' }),
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

export const recurringCycle = pgEnum('recurring_cycle', ['MONTHLY', 'YEARLY']);
export const paymentMethod = pgEnum('payment_method', ['CARD', 'PIX', 'DEBIT', 'BOLETO', 'OTHER']);

/**
 * A Gasto recorrente: what goes out by itself every month or year (gym, Netflix, car insurance).
 * One paid on a Cartão is already in its Fatura, so the month shows it without counting it again.
 */
export const recurringExpense = pgTable(
  'recurring_expense',
  {
    /** One charge: a month's when MONTHLY, the year's when YEARLY. */
    amountCents: cents('amount_cents').notNull(),
    category: text('category'),
    /** The Cartão it is charged to, when `paymentMethod` is CARD. */
    creditCardId: uuid('credit_card_id').references(() => creditCard.id, { onDelete: 'set null' }),
    cycle: recurringCycle('cycle').notNull().default('MONTHLY'),
    description: text('description').notNull(),
    dueDay: integer('due_day').notNull(),
    /** YEARLY: the month it is charged. */
    dueMonth: integer('due_month'),
    /** Cancelled from this day on; `null` while it runs. */
    endsOn: date('ends_on'),
    holderId: uuid('holder_id')
      .notNull()
      .references(() => holder.id, { onDelete: 'cascade' }),
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: organizationId(),
    paymentMethod: paymentMethod('payment_method'),
    startsOn: date('starts_on'),
    ...timestamps,
  },
  table => [index('recurring_expense_holder_idx').on(table.holderId)]
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

/** Where a Conversation happens: the app's chat, or WhatsApp (docs/adr/0019). */
export const conversationChannel = pgEnum('conversation_channel', ['APP', 'WHATSAPP']);

export const conversation = pgTable(
  'conversation',
  {
    botId: uuid('bot_id')
      .notNull()
      .references(() => bot.id, { onDelete: 'cascade' }),
    channel: conversationChannel('channel').notNull().default('APP'),
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: organizationId(),
    title: text('title')
      .notNull()
      .default(sql`'Nova conversa'`),
    /** When the Bot started the reply it is writing; null once it is saved. */
    replyingSince: timestamp('replying_since', { withTimezone: true }),
    /** Parar was pressed: the reply being written ends with what it has. */
    stopRequestedAt: timestamp('stop_requested_at', { withTimezone: true }),
    ...timestamps,
  },
  table => [
    index('conversation_bot_idx').on(table.botId, table.updatedAt),
    // One WhatsApp Conversation per Organization, even when two first messages arrive at once.
    uniqueIndex('conversation_whatsapp_once')
      .on(table.organizationId)
      .where(sql`${table.channel} = 'WHATSAPP'`),
  ]
);

export const message = pgTable(
  'message',
  {
    /**
     * Files the User attached in the chat, by name and kind only: their contents go to the Model
     * once and are never kept (docs/adr/0017).
     */
    attachments: jsonb('attachments').$type<{ kind: 'IMAGE' | 'PDF' | 'TEXT'; name: string }[]>(),
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

export const proposalKind = pgEnum('proposal_kind', [
  'CREDIT_OPERATION',
  'INCOME_SOURCE',
  'ONE_OFF_INCOME',
  'EXPENSE',
  'RECURRING_EXPENSE',
]);
export const proposalStatus = pgEnum('proposal_status', ['PENDING', 'CONFIRMED', 'CANCELLED']);
export const proposalAction = pgEnum('proposal_action', ['CREATE', 'UPDATE', 'DELETE']);

/**
 * Proposal: a record a Bot offers to create, or a saved one it offers to correct or delete, from a
 * Conversation. Nothing is written until the User confirms it; then the same service as the
 * mutation writes it (docs/adr/0013).
 */
export const proposal = pgTable(
  'proposal',
  {
    action: proposalAction('action').notNull().default('CREATE'),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversation.id, { onDelete: 'cascade' }),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    decidedById: text('decided_by_id').references(() => user.id, { onDelete: 'set null' }),
    id: uuid('id').primaryKey().defaultRandom(),
    /** The mutation's input, already in cents and checked, Holder included. */
    input: jsonb('input').notNull(),
    kind: proposalKind('kind').notNull(),
    /** The Bot's Message that offered it; set once the reply is saved. */
    messageId: uuid('message_id').references(() => message.id, { onDelete: 'cascade' }),
    organizationId: organizationId(),
    /** For an UPDATE or a DELETE, the record's input when it was proposed, to show what changes. */
    previous: jsonb('previous'),
    /** The row written on confirmation: the new one, or the corrected one. */
    recordId: uuid('record_id'),
    status: proposalStatus('status').notNull().default('PENDING'),
    /** For an UPDATE or a DELETE, the saved record it acts on. */
    targetId: uuid('target_id'),
    ...timestamps,
  },
  table => [index('proposal_conversation_idx').on(table.conversationId, table.createdAt)]
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

/** Who brings a bank's Open Finance data in (docs/adr/0020); a new one is a new adapter. */
export const bankProvider = pgEnum('bank_provider', ['PLUGGY']);
export const bankLinkStatus = pgEnum('bank_link_status', ['ACTIVE', 'ERROR', 'EXPIRED']);
export const bankAccountKind = pgEnum('bank_account_kind', ['BANK', 'CREDIT']);

/**
 * A Vínculo bancário: one bank a Titular authorized through Open Finance, as the provider's item.
 * Deleting it takes its accounts and the Gastos that came from it.
 */
export const bankLink = pgTable(
  'bank_link',
  {
    consentExpiresAt: timestamp('consent_expires_at', { withTimezone: true }),
    consentId: uuid('consent_id').references(() => consent.id, { onDelete: 'set null' }),
    /** The provider's last word on why it stopped, while `status` is not ACTIVE. */
    error: text('error'),
    /** The provider's id for it (Pluggy's item id). */
    externalId: text('external_id').notNull(),
    holderId: uuid('holder_id')
      .notNull()
      .references(() => holder.id, { onDelete: 'cascade' }),
    id: uuid('id').primaryKey().defaultRandom(),
    institution: text('institution').notNull(),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    organizationId: organizationId(),
    provider: bankProvider('provider').notNull(),
    status: bankLinkStatus('status').notNull().default('ACTIVE'),
    ...timestamps,
  },
  // One item is one bank of one person: it cannot be linked twice, by anyone.
  table => [unique('bank_link_provider_external_unique').on(table.provider, table.externalId)]
);

/** An account or a credit card of a Vínculo bancário, as the bank reports it. */
export const bankAccount = pgTable(
  'bank_account',
  {
    balanceCents: cents('balance_cents'),
    bankLinkId: uuid('bank_link_id')
      .notNull()
      .references(() => bankLink.id, { onDelete: 'cascade' }),
    externalId: text('external_id').notNull(),
    id: uuid('id').primaryKey().defaultRandom(),
    kind: bankAccountKind('kind').notNull(),
    name: text('name').notNull(),
    number: text('number'),
    organizationId: organizationId(),
    ...timestamps,
  },
  table => [unique('bank_account_link_external_unique').on(table.bankLinkId, table.externalId)]
);

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

/**
 * What a User did with an Alert: read it or removed it. Alerts are computed, not stored, so this
 * keys them by `alertKey`, which changes when the Alert says something new (a new due date, a new
 * amount in arrears), and that one shows again unread.
 */
export const alertState = pgTable(
  'alert_state',
  {
    alertKey: text('alert_key').notNull(),
    dismissedAt: timestamp('dismissed_at', { withTimezone: true }),
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: organizationId(),
    readAt: timestamp('read_at', { withTimezone: true }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    ...timestamps,
  },
  table => [unique('alert_state_user_key').on(table.userId, table.alertKey)]
);

export const budgetMethod = pgEnum('budget_method', [
  'AUVP',
  'CUSTOM',
  'FIFTY_THIRTY_TWENTY',
  'SEVENTY_TWENTY_TEN',
]);

/**
 * Orçamento: how a Holder splits the income into slices, and which slice each spending category
 * goes to. Without one, the month is shown against a method picked from the data (docs/adr/0018).
 */
export const budget = pgTable('budget', {
  /** Category → slice key; the pseudo-categories Parcelas, Faturas and Impostos included. */
  categories: jsonb('categories').$type<Record<string, string>>().notNull().default({}),
  holderId: uuid('holder_id')
    .notNull()
    .unique()
    .references(() => holder.id, { onDelete: 'cascade' }),
  id: uuid('id').primaryKey().defaultRandom(),
  method: budgetMethod('method').notNull(),
  organizationId: organizationId(),
  slices: jsonb('slices').$type<{ key: string; label: string; percent: number }[]>().notNull(),
  ...timestamps,
});

/**
 * WhatsApp link: the number a User talks to the Caishen from, kept as Meta sends it (the `wa_id`,
 * not normalized). Unlinked rows stay, with `unlinkedAt`, so a number can link again (docs/adr/0019).
 */
export const whatsappLink = pgTable(
  'whatsapp_link',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    linkedAt: timestamp('linked_at', { withTimezone: true }).notNull().defaultNow(),
    organizationId: organizationId(),
    phone: text('phone').notNull(),
    unlinkedAt: timestamp('unlinked_at', { withTimezone: true }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  table => [
    // A number and a User each have at most one active link.
    uniqueIndex('whatsapp_link_phone_active')
      .on(table.phone)
      .where(sql`${table.unlinkedAt} is null`),
    uniqueIndex('whatsapp_link_user_active')
      .on(table.userId)
      .where(sql`${table.unlinkedAt} is null`),
  ]
);

/** The one-time code a User sends from WhatsApp to link the number; valid for 15 minutes. */
export const whatsappLinkCode = pgTable('whatsapp_link_code', {
  /** Upper case, as sent. */
  code: text('code').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: organizationId(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  ...timestamps,
});

/** Each WhatsApp message received, by Meta's id only, so a delivery sent twice is handled once. */
export const whatsappMessage = pgTable('whatsapp_message', {
  receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
  wamid: text('wamid').primaryKey(),
});

/**
 * An unlinked number already told how to link, as a SHA-256 hash: neither the number nor what it
 * wrote is kept. It hears the instructions once.
 */
export const whatsappStranger = pgTable('whatsapp_stranger', {
  phoneHash: text('phone_hash').primaryKey(),
  toldAt: timestamp('told_at', { withTimezone: true }).notNull().defaultNow(),
});

/** WhatsApp messages sent in a month of São Paulo, against the free cap (docs/adr/0019). */
export const whatsappUsage = pgTable('whatsapp_usage', {
  /** `YYYY-MM`. */
  month: text('month').primaryKey(),
  sent: integer('sent').notNull().default(0),
});

/** The companies a Model can be called through (`@zapbots/ai`'s ProviderName, upper case). */
export const aiProvider = pgEnum('ai_provider', ['ANTHROPIC', 'GOOGLE', 'OPENAI', 'OPENROUTER']);

/**
 * An Organization's key to a Model provider, pasted on Integrações (docs/adr/0022). Kept sealed
 * with AES-256-GCM; only its last four characters ever leave the server.
 */
export const aiKey = pgTable(
  'ai_key',
  {
    /** `iv.tag.ciphertext`, each in base64url. */
    ciphertext: text('ciphertext').notNull(),
    id: uuid('id').primaryKey().defaultRandom(),
    last4: text('last4').notNull(),
    organizationId: organizationId(),
    provider: aiProvider('provider').notNull(),
    ...timestamps,
  },
  table => [unique('ai_key_organization_provider_unique').on(table.organizationId, table.provider)]
);
