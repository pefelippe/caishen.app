import { closeDb, db, schema } from '@zapbots/database';
import { asc, eq } from 'drizzle-orm';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createViewer, gql } from '../../test/helpers';
import app from '../app';

let base = '';
let close: () => void;

beforeAll(async () => {
  const server = app.listen(0);
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  close = () => server.close();
});
afterAll(async () => {
  close();
  await closeDb();
});

const INBOX = `mutation($on: Boolean!) { setAutomationInbox(on: $on) { path lastAdded } }`;

const send = async (path: string, body: unknown) => {
  const response = await fetch(`${base}${path}`, {
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });
  return { body: await response.json(), status: response.status };
};

describe('Automação', () => {
  it('takes Gastos from Zapier, Make or n8n, each once, as imported ones', async () => {
    const viewer = await createViewer();
    const { path } = (await gql(viewer, INBOX, { on: true })).data.setAutomationInbox;
    expect(path).toMatch(/^\/api\/inbox\/[\w-]{32}$/);

    const first = await send(path, {
      gastos: [
        {
          categoria: 'Mercado',
          data: '2026-10-27',
          descricao: 'Pão de Açúcar',
          id: 'z-1',
          valor: '45,90',
        },
        { amount: 12.5, date: '28/10/2026', description: 'Uber' },
        { descricao: 'Sem valor' },
        { data: 'ontem', descricao: 'Data ruim', valor: 10 },
      ],
    });
    expect(first).toEqual({
      body: {
        added: 2,
        errors: [
          { line: 3, reason: 'Falta o valor, maior que zero.' },
          { line: 4, reason: 'A data não é uma data.' },
        ],
        repeated: 0,
      },
      status: 200,
    });

    // Zapier retries: the line with the same id, and the same line without one, add nothing.
    const again = await send(path, [
      { descricao: 'Pão de Açúcar (editado)', id: 'z-1', valor: '45,90' },
      { amount: 12.5, date: '28/10/2026', description: 'Uber' },
    ]);
    expect(again.body).toEqual({ added: 0, errors: [], repeated: 2 });

    const expenses = await db
      .select()
      .from(schema.expense)
      .where(eq(schema.expense.organizationId, viewer.organizationId))
      .orderBy(asc(schema.expense.date));
    expect(
      expenses.map(row => [row.date, row.description, row.amountCents, row.category, row.imported])
    ).toEqual([
      ['2026-10-27', 'Pão de Açúcar', 4590, 'Mercado', true],
      ['2026-10-28', 'Uber', 1250, null, true],
    ]);

    const { data } = await gql(viewer, `{ automationInbox { lastAdded lastReceivedAt } }`);
    expect(data.automationInbox.lastAdded).toBe(0);
    expect(data.automationInbox.lastReceivedAt).not.toBeNull();
  });

  it('refuses a send where nothing can be read, and an address that was changed', async () => {
    const viewer = await createViewer();
    const { path } = (await gql(viewer, INBOX, { on: true })).data.setAutomationInbox;
    expect((await send(path, { descricao: 'Nada' })).status).toBe(400);

    const { path: next } = (await gql(viewer, INBOX, { on: true })).data.setAutomationInbox;
    expect(next).not.toBe(path);
    expect((await send(path, { descricao: 'Café', valor: 5 })).status).toBe(404);
    expect((await send(next, { descricao: 'Café', valor: 5 })).status).toBe(200);

    await gql(viewer, INBOX, { on: false });
    expect((await send(next, { descricao: 'Café 2', valor: 5 })).status).toBe(404);
    expect((await send('/api/inbox/nao-existe', {})).status).toBe(404);
  });
});
