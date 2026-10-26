import { http, HttpResponse, type HttpHandler } from 'msw';

const API = 'https://api.pluggy.ai';

export interface FakeTransaction {
  amount: number;
  date: string;
  description: string;
  id: string;
  status?: 'PENDING' | 'POSTED';
  type: 'CREDIT' | 'DEBIT';
}

export interface FakeBill {
  billClosingDate: string;
  dueDate: string;
  totalAmount: number;
}

export interface FakeItem {
  accounts: {
    balance: number;
    creditData?: { balanceDueDate: string; creditLimit: number };
    id: string;
    name: string;
    number: string;
    type: 'BANK' | 'CREDIT';
  }[];
  error?: { code: string; message: string };
  status?: string;
  /** Per card, its Faturas, newest first, as one page. */
  bills?: Record<string, FakeBill[]>;
  /** Per account, pages of lines: each page's `next` points at the following one. */
  transactions: Record<string, FakeTransaction[][]>;
}

/**
 * Fakes the parts of Pluggy's API zapbots reads: `/auth`, `/items/:id`, `/accounts`, `/bills` and
 * the cursor-paged `/v2/transactions`. Records what was asked, so tests see the cursor followed.
 */
export function pluggyHandlers(items: Record<string, FakeItem>): {
  handlers: HttpHandler[];
  requests: URL[];
} {
  const requests: URL[] = [];
  const authorized = (request: Request) => request.headers.get('X-API-KEY') === 'test-api-key';
  const handlers = [
    http.post(`${API}/auth`, async ({ request }) => {
      const body = (await request.json()) as { clientId: string; clientSecret: string };
      return body.clientId === 'test-pluggy-id' && body.clientSecret === 'test-pluggy-secret'
        ? HttpResponse.json({ apiKey: 'test-api-key' })
        : new HttpResponse(null, { status: 401 });
    }),
    http.get(`${API}/items/:id`, ({ params, request }) => {
      requests.push(new URL(request.url));
      if (!authorized(request)) return new HttpResponse(null, { status: 403 });
      const item = items[String(params.id)];
      if (!item) return new HttpResponse(null, { status: 404 });
      return HttpResponse.json({
        connector: { name: 'MeuPluggy' },
        consentExpiresAt: '2027-10-01T00:00:00.000Z',
        error: item.error ?? null,
        id: params.id,
        status: item.status ?? 'UPDATED',
      });
    }),
    http.get(`${API}/accounts`, ({ request }) => {
      const url = new URL(request.url);
      requests.push(url);
      const item = items[url.searchParams.get('itemId') ?? ''];
      return HttpResponse.json({ page: 1, results: item?.accounts ?? [], total: 0, totalPages: 1 });
    }),
    http.get(`${API}/bills`, ({ request }) => {
      const url = new URL(request.url);
      requests.push(url);
      const accountId = url.searchParams.get('accountId') ?? '';
      const results = Object.values(items).find(item => item.bills?.[accountId])?.bills?.[
        accountId
      ];
      return HttpResponse.json({ page: 1, results: results ?? [], total: 0, totalPages: 1 });
    }),
    http.get(`${API}/v2/transactions`, ({ request }) => {
      const url = new URL(request.url);
      requests.push(url);
      const accountId = url.searchParams.get('accountId') ?? '';
      const pages = Object.values(items).find(item => item.transactions[accountId])?.transactions[
        accountId
      ] ?? [[]];
      const index = Number(url.searchParams.get('after') ?? 0);
      const next =
        index + 1 < pages.length
          ? `/v2/transactions?accountId=${accountId}&after=${index + 1}`
          : null;
      return HttpResponse.json({ next, results: pages[index] ?? [] });
    }),
  ];
  return { handlers, requests };
}
