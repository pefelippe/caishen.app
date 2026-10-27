import type { Repeat } from '@zapbots/personal';
import {
  type AnyPgColumn,
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { user } from './auth';
import { organizationId, timestamps } from './columns';

/**
 * Pessoal: Tarefas, Notas, Agenda and Metas. Like everything else they belong to the Organization,
 * which is personal (docs/adr/0007); `createdById` only says who wrote them. Days and times are
 * the User's own wall clock (`user.timezone`), so a date is a plain date and a time is "HH:MM".
 */

const createdById = () => text('created_by_id').references(() => user.id, { onDelete: 'set null' });

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

/** Lista: a named group of Tarefas (Casa, Trabalho, Mercado…). */
export const taskList = pgTable('task_list', {
  color: text('color'),
  createdById: createdById(),
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  organizationId: organizationId(),
  position: integer('position').notNull().default(0),
  ...timestamps,
});

export const taskPriority = pgEnum('task_priority', ['LOW', 'NORMAL', 'HIGH']);

/**
 * Tarefa: something to do, maybe by a day and time. A repeating one, once done, stays done and
 * gives way to a new Tarefa on the next date of its series.
 */
export const task = pgTable(
  'task',
  {
    createdById: createdById(),
    doneAt: timestamp('done_at', { withTimezone: true }),
    dueOn: date('due_on'),
    /** "HH:MM", only with `dueOn`. */
    dueTime: text('due_time'),
    goalId: uuid('goal_id').references((): AnyPgColumn => goal.id, { onDelete: 'set null' }),
    id: uuid('id').primaryKey().defaultRandom(),
    listId: uuid('list_id').references(() => taskList.id, { onDelete: 'set null' }),
    notes: text('notes').notNull().default(''),
    organizationId: organizationId(),
    priority: taskPriority('priority').notNull().default('NORMAL'),
    repeat: jsonb('repeat').$type<Repeat>(),
    title: text('title').notNull(),
    ...timestamps,
  },
  table => [index('task_open_idx').on(table.organizationId, table.doneAt, table.dueOn)]
);

/** Nota: free text in Markdown, pinned ones first. */
export const note = pgTable(
  'note',
  {
    body: text('body').notNull().default(''),
    createdById: createdById(),
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: organizationId(),
    pinned: boolean('pinned').notNull().default(false),
    title: text('title').notNull().default(''),
    ...timestamps,
  },
  table => [index('note_updated_idx').on(table.organizationId, table.updatedAt)]
);

/**
 * Evento: a day in the Agenda, all day (no `startTime`) or at a time, maybe over several days
 * (`endsOn`), maybe repeating. Editing a repeating one changes the whole series.
 */
export const event = pgTable(
  'event',
  {
    createdById: createdById(),
    /** "HH:MM", only with `startTime`. */
    endTime: text('end_time'),
    /** The last day of an Evento over several days; null for one day. */
    endsOn: date('ends_on'),
    id: uuid('id').primaryKey().defaultRandom(),
    location: text('location').notNull().default(''),
    notes: text('notes').notNull().default(''),
    organizationId: organizationId(),
    repeat: jsonb('repeat').$type<Repeat>(),
    startsOn: date('starts_on').notNull(),
    /** "HH:MM"; null for all day. */
    startTime: text('start_time'),
    title: text('title').notNull(),
    ...timestamps,
  },
  table => [index('event_starts_idx').on(table.organizationId, table.startsOn)]
);

export const goalArea = pgEnum('goal_area', ['PERSONAL', 'FINANCE', 'FITNESS']);
/** MONEY counts cents, COUNT counts units (livros, km…), CHECK is done once. */
export const goalKind = pgEnum('goal_kind', ['MONEY', 'COUNT', 'CHECK']);

/** Meta: where the User wants to get, and by when; Progresso adds up towards `target`. */
export const goal = pgTable('goal', {
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  area: goalArea('area').notNull().default('PERSONAL'),
  createdById: createdById(),
  dueOn: date('due_on'),
  id: uuid('id').primaryKey().defaultRandom(),
  kind: goalKind('kind').notNull(),
  organizationId: organizationId(),
  /** Cents for MONEY (docs/adr/0004), units for COUNT, 1 for CHECK. */
  target: bigint('target', { mode: 'number' }).notNull(),
  title: text('title').notNull(),
  /** What COUNT counts, e.g. "livros". */
  unit: text('unit'),
  ...timestamps,
});

/** Progresso: one step towards a Meta, in its unit (cents for MONEY). */
export const goalProgress = pgTable(
  'goal_progress',
  {
    amount: bigint('amount', { mode: 'number' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    goalId: uuid('goal_id')
      .notNull()
      .references(() => goal.id, { onDelete: 'cascade' }),
    id: uuid('id').primaryKey().defaultRandom(),
    note: text('note').notNull().default(''),
    organizationId: organizationId(),
  },
  table => [index('goal_progress_goal_idx').on(table.goalId)]
);
