import { randomBytes } from 'node:crypto';

import type { Viewer } from '@zapbots/auth';
import { db, schema } from '@zapbots/database';
import { lineFingerprint, parseMoney } from '@zapbots/finance';
import { wallClock } from '@zapbots/personal';
import { and, eq } from 'drizzle-orm';
import { GraphQLError } from 'graphql';

import { viewerTimeZone } from './personal/clock';
import { expenseValues, importExpenses, type ImportedExpense } from './records';
import { viewerHolder } from './viewerHolder';

/**
 * Automação (docs/adr/0033): a secret address Zapier, Make, n8n or any script sends Gastos to,
 * as JSON. They go in through `importExpenses`, as any other imported Gasto, each once: under
 * the `id` the sender gives, or the line's fingerprint when it gives none.
 */
const pathOf = (token: string) => `/api/inbox/${token}`;
const MAX_LINES = 100;

type InboxRow = typeof schema.automationInbox.$inferSelect;

const shown = (row: InboxRow) => ({
  createdAt: row.createdAt,
  lastAdded: row.lastAdded,
  lastReceivedAt: row.lastReceivedAt,
  path: pathOf(row.token),
});

export async function automationInbox(viewer: Viewer) {
  const [row] = await db
    .select()
    .from(schema.automationInbox)
    .where(eq(schema.automationInbox.userId, viewer.userId));
  return row && row.organizationId === viewer.organizationId ? shown(row) : null;
}

/** On: a new secret (the old address stops working). Off: no address; what came stays. */
export async function setAutomationInbox(viewer: Viewer, on: boolean) {
  if (!on) {
    await db.delete(schema.automationInbox).where(eq(schema.automationInbox.userId, viewer.userId));
    return null;
  }
  const token = randomBytes(24).toString('base64url');
  const [row] = await db
    .insert(schema.automationInbox)
    .values({ organizationId: viewer.organizationId, token, userId: viewer.userId })
    .onConflictDoUpdate({
      set: { lastAdded: null, lastReceivedAt: null, organizationId: viewer.organizationId, token },
      target: schema.automationInbox.userId,
    })
    .returning();
  return shown(row!);
}

/** Who an address belongs to, while they are still in its Organization. */
async function inboxViewer(token: string): Promise<null | Viewer> {
  if (!/^[\w-]{16,64}$/.test(token)) return null;
  const [row] = await db
    .select({
      organizationId: schema.automationInbox.organizationId,
      role: schema.member.role,
      userId: schema.automationInbox.userId,
    })
    .from(schema.automationInbox)
    .innerJoin(
      schema.member,
      and(
        eq(schema.member.userId, schema.automationInbox.userId),
        eq(schema.member.organizationId, schema.automationInbox.organizationId)
      )
    )
    .where(eq(schema.automationInbox.token, token));
  return row ?? null;
}

/** The first of these fields that is there, so senders may write in Portuguese or English. */
function field(line: Record<string, unknown>, ...names: string[]): unknown {
  for (const name of names) if (line[name] !== undefined && line[name] !== null) return line[name];
  return undefined;
}

/** A day as senders write it: 2026-10-28, an ISO instant (on the User's clock) or 28/10/2026. */
function dayOf(value: unknown, zone: string): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const text = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  if (br) return `${br[3]}-${br[2]!.padStart(2, '0')}-${br[1]!.padStart(2, '0')}`;
  const instant = new Date(text);
  return Number.isNaN(instant.getTime()) ? null : wallClock(instant, zone).date;
}

export interface AutomationResult {
  added: number;
  errors: { line: number; reason: string }[];
  repeated: number;
}

/**
 * Reads one Gasto, a list of them or `{ gastos: [...] }` (`expenses` too) and saves each once.
 * Null for an unknown address. Lines that cannot be read are told back by their number, from 1.
 */
export async function receiveAutomation(
  token: string,
  body: unknown
): Promise<AutomationResult | null> {
  const viewer = await inboxViewer(token);
  if (!viewer) return null;
  const wrapped = body as { expenses?: unknown; gastos?: unknown } | null;
  const lines = Array.isArray(body)
    ? body
    : Array.isArray(wrapped?.gastos)
      ? wrapped.gastos
      : Array.isArray(wrapped?.expenses)
        ? wrapped.expenses
        : [body];
  if (lines.length > MAX_LINES) {
    return {
      added: 0,
      errors: [{ line: 0, reason: `Mande até ${MAX_LINES} gastos por vez.` }],
      repeated: 0,
    };
  }

  const zone = await viewerTimeZone(viewer);
  const today = wallClock(new Date(), zone).date;
  const errors: AutomationResult['errors'] = [];
  const rows: ImportedExpense[] = [];
  lines.forEach((raw, index) => {
    const line = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const amount = field(line, 'valor', 'amount');
    const amountCents =
      typeof amount === 'number' || typeof amount === 'string' ? parseMoney(amount) : null;
    const when = field(line, 'data', 'date');
    const date = when === undefined ? today : dayOf(when, zone);
    const description = field(line, 'descricao', 'descrição', 'description');
    const category = field(line, 'categoria', 'category');
    const id = field(line, 'id');
    if (!amountCents)
      return void errors.push({ line: index + 1, reason: 'Falta o valor, maior que zero.' });
    if (!date) return void errors.push({ line: index + 1, reason: 'A data não é uma data.' });
    if (typeof description !== 'string' || !description.trim()) {
      return void errors.push({ line: index + 1, reason: 'Falta a descrição.' });
    }
    try {
      const values = expenseValues({
        amountCents,
        category: typeof category === 'string' ? category : null,
        date,
        description: description.slice(0, 200),
      });
      // Without an id of the sender's, the same line sent twice is still one Gasto.
      const externalId =
        id !== undefined && String(id).trim()
          ? `hook:${String(id).trim().slice(0, 200)}`
          : `hook:${lineFingerprint(values, 0)}`;
      rows.push({ ...values, externalId });
    } catch (error) {
      if (!(error instanceof GraphQLError)) throw error;
      errors.push({ line: index + 1, reason: error.message });
    }
  });

  const holder = await viewerHolder(viewer);
  const added = await importExpenses(viewer, holder.id, rows);
  await db
    .update(schema.automationInbox)
    .set({ lastAdded: added, lastReceivedAt: new Date() })
    .where(eq(schema.automationInbox.userId, viewer.userId));
  return { added, errors, repeated: rows.length - added };
}
