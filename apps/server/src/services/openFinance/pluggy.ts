import { Decimal, toCents } from '@zapbots/finance';

import type {
  OpenFinanceProvider,
  ProviderAccount,
  ProviderBill,
  ProviderItem,
  ProviderTransaction,
} from './provider';

/**
 * Pluggy over REST, without its SDK (docs/adr/0020). Built on Meu Pluggy, free for one person's
 * own banks: items are connected in Pluggy's dashboard, so there is no Connect widget here.
 */
const API = 'https://api.pluggy.ai';
/** Pluggy's keys last two hours; one is taken again a little before that. */
const KEY_LIFETIME_MS = 110 * 60 * 1000;

export class PluggyError extends Error {}

let cachedKey: { expiresAt: number; value: string } | null = null;

async function apiKey(fresh = false): Promise<string> {
  if (!fresh && cachedKey && cachedKey.expiresAt > Date.now()) return cachedKey.value;
  const response = await fetch(`${API}/auth`, {
    body: JSON.stringify({
      clientId: process.env.PLUGGY_CLIENT_ID,
      clientSecret: process.env.PLUGGY_CLIENT_SECRET,
    }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });
  if (!response.ok) throw new PluggyError(`A Pluggy recusou as credenciais (${response.status})`);
  const { apiKey: value } = (await response.json()) as { apiKey: string };
  cachedKey = { expiresAt: Date.now() + KEY_LIFETIME_MS, value };
  return value;
}

/** A GET with the key, taken again once if Pluggy says it expired. `null` on 404. */
async function get<T>(path: string, params: Record<string, string> = {}): Promise<T | null> {
  const url = new URL(path, API);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  let response = await fetch(url, { headers: { 'X-API-KEY': await apiKey() } });
  if (response.status === 401 || response.status === 403) {
    response = await fetch(url, { headers: { 'X-API-KEY': await apiKey(true) } });
  }
  if (response.status === 404) return null;
  if (!response.ok) throw new PluggyError(`A Pluggy não respondeu a ${path} (${response.status})`);
  return (await response.json()) as T;
}

/** Reais as Pluggy sends them (a JSON number), as whole cents (docs/adr/0004). */
const cents = (reais: number) => toCents(new Decimal(String(reais)).abs().times(100));

interface Item {
  connector?: { name?: string } | null;
  consentExpiresAt?: string | null;
  error?: { code?: string; message?: string } | null;
  status: string;
}

interface Account {
  balance?: number | null;
  creditData?: {
    balanceCloseDate?: string | null;
    balanceDueDate?: string | null;
    creditLimit?: number | null;
  } | null;
  id: string;
  marketingName?: string | null;
  name: string;
  number?: string | null;
  type: 'BANK' | 'CREDIT';
}

interface Bill {
  billClosingDate?: string | null;
  dueDate: string;
  totalAmount: number;
}

interface Transaction {
  amount: number;
  date: string;
  description?: string | null;
  id: string;
  status?: string | null;
  type: 'CREDIT' | 'DEBIT';
}

/** The day of the month of one of Pluggy's dates (`2026-09-28T00:00:00.000Z`). */
const dayOf = (date?: string | null) => (date ? Number(date.slice(8, 10)) : null);

function itemOf(item: Item): ProviderItem {
  const expired = item.error?.code === 'USER_AUTHORIZATION_EXPIRED';
  const failed = item.status === 'LOGIN_ERROR' || item.status === 'OUTDATED';
  return {
    consentExpiresAt: item.consentExpiresAt ? new Date(item.consentExpiresAt) : null,
    error: failed || expired ? (item.error?.message ?? item.status) : null,
    institution: item.connector?.name ?? 'Banco',
    status: expired ? 'EXPIRED' : failed ? 'ERROR' : 'ACTIVE',
  };
}

export const pluggy: OpenFinanceProvider = {
  accounts: async itemId => {
    const page = await get<{ results: Account[] }>('/accounts', { itemId });
    return (page?.results ?? []).map(
      (account): ProviderAccount => ({
        balanceCents: account.balance == null ? null : cents(account.balance),
        credit:
          account.type === 'CREDIT'
            ? {
                closingDay: dayOf(account.creditData?.balanceCloseDate),
                dueDay: dayOf(account.creditData?.balanceDueDate),
                limitCents:
                  account.creditData?.creditLimit == null
                    ? null
                    : cents(account.creditData.creditLimit),
              }
            : null,
        externalId: account.id,
        kind: account.type,
        name: account.marketingName || account.name,
        number: account.number ?? null,
      })
    );
  },
  // `/bills` pages by number, newest first.
  bills: async accountId => {
    const bills: ProviderBill[] = [];
    for (let page = 1, pages = 1; page <= pages; page++) {
      const result = await get<{ results: Bill[]; totalPages?: number }>('/bills', {
        accountId,
        page: String(page),
      });
      for (const bill of result?.results ?? []) {
        bills.push({
          amountCents: cents(bill.totalAmount),
          closingDate: bill.billClosingDate?.slice(0, 10) ?? null,
          dueDate: bill.dueDate.slice(0, 10),
        });
      }
      pages = result?.totalPages ?? 1;
    }
    return bills;
  },
  configured: () => Boolean(process.env.PLUGGY_CLIENT_ID && process.env.PLUGGY_CLIENT_SECRET),
  item: async id => {
    const item = await get<Item>(`/items/${encodeURIComponent(id)}`);
    return item && itemOf(item);
  },
  key: 'PLUGGY',
  // `/v2/transactions` pages by cursor: each page's `next` carries the `after` of the following
  // one, until it is null. The page-numbered `/transactions` goes away at the end of 2026.
  transactions: async (accountId, since) => {
    const lines: ProviderTransaction[] = [];
    let after: string | null = null;
    do {
      const params: Record<string, string> = { accountId, dateFrom: since };
      if (after) params.after = after;
      const page = await get<{ next?: string | null; results: Transaction[] }>(
        '/v2/transactions',
        params
      );
      for (const line of page?.results ?? []) {
        if (line.status === 'PENDING') continue;
        lines.push({
          amountCents: cents(line.amount),
          date: line.date.slice(0, 10),
          description: line.description?.trim() || 'Sem descrição',
          direction: line.type === 'DEBIT' ? 'OUT' : 'IN',
          externalId: line.id,
        });
      }
      after = page?.next ? new URL(page.next, API).searchParams.get('after') : null;
    } while (after);
    return lines;
  },
};

/** Forgets the key, so tests start from Pluggy's `/auth`. */
export function resetPluggyKey() {
  cachedKey = null;
}
