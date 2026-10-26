import type { Viewer } from '@zapbots/auth';
import { db, schema, type BankLinkRow } from '@zapbots/database';
import {
  addDays,
  importedCategory,
  isBillPayment,
  isInvestmentMove,
  isOwnTransfer,
  today,
} from '@zapbots/finance';
import { and, asc, eq, isNull } from 'drizzle-orm';

import { badInput, findHolder, notFound, owned } from '../../resolvers/guards';
import { MAX_IMPORTED_EXPENSES, importExpenses } from '../records';
import { viewerHolder } from '../viewerHolder';
import { pluggy } from './pluggy';
import type { OpenFinanceProvider, ProviderAccount } from './provider';

/**
 * Open Finance (docs/adr/0020): a bank a Titular authorized, read through a provider, its debits
 * brought in as Gastos and its cards as Cartões with their Faturas. Only reads (docs/adr/0009); the consent is given at the bank.
 */
const provider: OpenFinanceProvider = pluggy;

/** How far back the first read goes; later ones go back a week, for lines the bank posts late. */
const FIRST_READ_DAYS = 90;
const OVERLAP_DAYS = 7;

/**
 * Who may link banks on this server. Meu Pluggy is free for one person's own data and forbids
 * commercial use, and its one key reads every item it has: so only the e-mails in
 * `OPEN_FINANCE_EMAILS` may, never anyone else.
 */
async function allowedEmail(viewer: Viewer): Promise<boolean> {
  const allowed = (process.env.OPEN_FINANCE_EMAILS ?? '')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);
  if (!allowed.length) return false;
  const [user] = await db
    .select({ email: schema.user.email })
    .from(schema.user)
    .where(eq(schema.user.id, viewer.userId));
  return Boolean(user && allowed.includes(user.email.toLowerCase()));
}

/** Why this Viewer cannot use Open Finance here, or `null` when they can. */
export async function openFinanceUnavailable(viewer: Viewer): Promise<string | null> {
  if (!provider.configured()) return 'O Open Finance ainda não está ligado neste servidor.';
  if (!(await allowedEmail(viewer))) return 'O Open Finance ainda não está aberto para sua conta.';
  return null;
}

async function requireOpenFinance(viewer: Viewer) {
  const reason = await openFinanceUnavailable(viewer);
  if (reason) badInput(reason);
}

export function bankLinks(viewer: Viewer) {
  return db
    .select()
    .from(schema.bankLink)
    .where(owned(schema.bankLink, viewer))
    .orderBy(asc(schema.bankLink.createdAt));
}

export function bankAccounts(link: BankLinkRow) {
  return db
    .select()
    .from(schema.bankAccount)
    .where(eq(schema.bankAccount.bankLinkId, link.id))
    .orderBy(asc(schema.bankAccount.name));
}

/**
 * A card of the bank as the Titular's Cartão: made on its first read, then its limit, days and
 * Faturas follow the bank (its name stays as the User leaves it). Its Gastos are not brought in:
 * the Fatura counts them.
 */
async function syncCard(
  link: BankLinkRow,
  account: ProviderAccount,
  bankAccountId: string,
  organizationId: string
) {
  const bills = await provider.bills(account.externalId);
  const latest = bills.reduce<(typeof bills)[number] | undefined>(
    (last, bill) => (!last || bill.dueDate > last.dueDate ? bill : last),
    undefined
  );
  // The last Fatura's days, or the bank's word on the open one.
  const dayOf = (date?: string | null) => (date ? Number(date.slice(8, 10)) : null);
  const dueDay = dayOf(latest?.dueDate) ?? account.credit?.dueDay;
  const closingDay = dayOf(latest?.closingDate) ?? account.credit?.closingDay;
  const known = {
    ...(account.credit?.limitCents != null && { limitCents: account.credit.limitCents }),
    ...(dueDay && { dueDay }),
    ...(closingDay && { closingDay }),
  };
  const [card] = await db
    .insert(schema.creditCard)
    .values({
      bankAccountId,
      // A card the bank says little about still gets days, until a Fatura tells them.
      closingDay: 1,
      dueDay: 10,
      holderId: link.holderId,
      issuer: link.institution,
      limitCents: 0,
      name: account.name,
      organizationId,
      ...known,
    })
    .onConflictDoUpdate({
      set: { ...known, updatedAt: new Date() },
      target: schema.creditCard.bankAccountId,
    })
    .returning({ id: schema.creditCard.id });
  for (const bill of bills) {
    await db
      .insert(schema.statement)
      .values({
        amountCents: bill.amountCents,
        creditCardId: card!.id,
        referenceMonth: bill.dueDate.slice(0, 7),
      })
      .onConflictDoUpdate({
        set: { amountCents: bill.amountCents, updatedAt: new Date() },
        target: [schema.statement.creditCardId, schema.statement.referenceMonth],
      });
  }
}

/**
 * Links a bank by the provider's id for it (Meu Pluggy's item, copied from Pluggy's dashboard),
 * records the consent and reads it a first time.
 */
export async function linkBank(viewer: Viewer, itemId: string) {
  await requireOpenFinance(viewer);
  const externalId = itemId.trim();
  if (!externalId) badInput('Cole o id do item da Pluggy');
  const [taken] = await db
    .select()
    .from(schema.bankLink)
    .where(
      and(eq(schema.bankLink.provider, provider.key), eq(schema.bankLink.externalId, externalId))
    );
  if (taken) {
    if (taken.organizationId !== viewer.organizationId) badInput('Esse banco já está conectado');
    return syncBankLink(viewer, taken.id);
  }
  const item = await provider.item(externalId);
  if (!item) badInput('A Pluggy não conhece esse item. Confira o id copiado do painel.');

  const holder = await viewerHolder(viewer);
  const link = await db.transaction(async tx => {
    const [consent] = await tx
      .insert(schema.consent)
      .values({ grantedById: viewer.userId, holderId: holder.id, source: 'OPEN_FINANCE' })
      .returning({ id: schema.consent.id });
    const [row] = await tx
      .insert(schema.bankLink)
      .values({
        consentExpiresAt: item.consentExpiresAt,
        consentId: consent!.id,
        error: item.error,
        externalId,
        holderId: holder.id,
        institution: item.institution,
        organizationId: viewer.organizationId,
        provider: provider.key,
        status: item.status,
      })
      .returning();
    return row!;
  });
  return syncBankLink(viewer, link.id);
}

/**
 * Reads a Vínculo bancário again: its state, its accounts and the accounts' new lines. Money out
 * of an account becomes Gastos, but not paying a Fatura, which the Fatura already counts, nor
 * money moved to the Titular's investments or own accounts; money in is left out (salary is a
 * Fonte de Renda). A card becomes a Cartão, its limit and Faturas read from the bank.
 */
export async function syncBankLink(viewer: Viewer, id: string) {
  await requireOpenFinance(viewer);
  const [link] = await db
    .select()
    .from(schema.bankLink)
    .where(owned(schema.bankLink, viewer, id));
  if (!link) notFound('Vínculo bancário');

  const item = await provider.item(link.externalId);
  if (!item) {
    const [gone] = await db
      .update(schema.bankLink)
      .set({ error: 'A Pluggy não tem mais esse item.', status: 'ERROR', updatedAt: new Date() })
      .where(eq(schema.bankLink.id, link.id))
      .returning();
    return { added: 0, link: gone! };
  }

  let added = 0;
  if (item.status === 'ACTIVE') {
    // Money sent to the Titular's own accounts is not spent.
    const owner = (await findHolder(viewer, link.holderId)).name;
    const since = link.lastSyncedAt
      ? addDays(link.lastSyncedAt.toISOString().slice(0, 10), -OVERLAP_DAYS)
      : addDays(today(), -FIRST_READ_DAYS);
    for (const account of await provider.accounts(link.externalId)) {
      const [saved] = await db
        .insert(schema.bankAccount)
        .values({
          balanceCents: account.balanceCents,
          bankLinkId: link.id,
          externalId: account.externalId,
          kind: account.kind,
          name: account.name,
          number: account.number,
          organizationId: viewer.organizationId,
        })
        .onConflictDoUpdate({
          set: {
            balanceCents: account.balanceCents,
            kind: account.kind,
            name: account.name,
            number: account.number,
            updatedAt: new Date(),
          },
          target: [schema.bankAccount.bankLinkId, schema.bankAccount.externalId],
        })
        .returning({ id: schema.bankAccount.id });
      if (account.kind === 'CREDIT') {
        await syncCard(link, account, saved!.id, viewer.organizationId);
        continue;
      }
      const rows = (await provider.transactions(account.externalId, since))
        .filter(
          line =>
            line.direction === 'OUT' &&
            line.amountCents > 0 &&
            !isBillPayment(line.description) &&
            !isInvestmentMove(line.description) &&
            !isOwnTransfer(line.description, owner)
        )
        .map(line => ({
          amountCents: line.amountCents,
          category: importedCategory(line.description),
          date: line.date,
          description: line.description,
          externalId: `${provider.key.toLowerCase()}:${line.externalId}`,
        }));
      for (let start = 0; start < rows.length; start += MAX_IMPORTED_EXPENSES) {
        const batch = rows.slice(start, start + MAX_IMPORTED_EXPENSES);
        added += await importExpenses(viewer, link.holderId, batch, { bankLinkId: link.id });
      }
    }
  }

  const [updated] = await db
    .update(schema.bankLink)
    .set({
      consentExpiresAt: item.consentExpiresAt,
      error: item.error,
      institution: item.institution,
      lastSyncedAt: item.status === 'ACTIVE' ? new Date() : link.lastSyncedAt,
      status: item.status,
      updatedAt: new Date(),
    })
    .where(eq(schema.bankLink.id, link.id))
    .returning();
  return { added, link: updated! };
}

/**
 * Unlinks a bank: its accounts, the Cartões read from them and the Gastos that came from it go, and the consent is marked
 * revoked. The authorization at the bank ends in Meu Pluggy, where it was given.
 */
export async function unlinkBank(viewer: Viewer, id: string): Promise<boolean> {
  const [link] = await db
    .delete(schema.bankLink)
    .where(owned(schema.bankLink, viewer, id))
    .returning();
  if (!link) return false;
  if (link.consentId) {
    await db
      .update(schema.consent)
      .set({ revokedAt: new Date() })
      .where(and(eq(schema.consent.id, link.consentId), isNull(schema.consent.revokedAt)));
  }
  return true;
}
