import { closeDb, db, schema } from '@zapbots/database';
import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';

import { createViewer, gql } from '../../test/helpers';
import { viewerHolder } from '../services/viewerHolder';

afterAll(async () => {
  await closeDb();
});

const IMPORT = /* GraphQL */ `
  mutation ($holderId: ID!, $rows: [ExpenseRowInput!]!, $file: ImportFileInput) {
    importExpenses(holderId: $holderId, rows: $rows, file: $file)
  }
`;
const IMPORTS = /* GraphQL */ `
  query ($holderId: ID!) {
    holder(id: $holderId) {
      imports {
        id
        fileName
        source
        bankName
        accountKind
        expenseCount
        totalCents
        firstDate
        lastDate
      }
    }
  }
`;
const UPDATE = /* GraphQL */ `
  mutation ($id: ID!, $input: ExpenseImportInput!) {
    updateExpenseImport(id: $id, input: $input) {
      bankName
      accountKind
      expenseCount
    }
  }
`;
const DELETE = /* GraphQL */ `
  mutation ($id: ID!) {
    deleteExpenseImport(id: $id)
  }
`;

const FILE = { bankName: 'Inter', fileName: 'Extrato.csv', source: 'CSV' };
const ROWS = [
  { amountCents: 450, date: '2026-10-22', description: 'Café' },
  // The same coffee again that day: two lines, both real.
  { amountCents: 450, date: '2026-10-22', description: 'Café' },
  { amountCents: 4590, date: '2026-10-20', description: 'Mercado' },
];

async function importedFile(name = 'Ana') {
  const viewer = await createViewer(name);
  const holder = await viewerHolder(viewer);
  const { data } = await gql(viewer, IMPORT, { file: FILE, holderId: holder.id, rows: ROWS });
  expect(data.importExpenses).toBe(3);
  const listed = await gql(viewer, IMPORTS, { holderId: holder.id });
  return { holder, imports: listed.data.holder.imports, viewer };
}

describe('Importações', () => {
  it('keeps each file with its bank, its Gastos and their dates', async () => {
    const { imports } = await importedFile();
    expect(imports).toEqual([
      {
        accountKind: 'CHECKING',
        bankName: 'Inter',
        expenseCount: 3,
        fileName: 'Extrato.csv',
        firstDate: '2026-10-20',
        id: expect.any(String),
        lastDate: '2026-10-22',
        source: 'CSV',
        totalCents: 5490,
      },
    ]);
  });

  it('adds nothing twice when the same file, or one that overlaps it, comes in again', async () => {
    const { holder, viewer } = await importedFile();
    const overlapping = [...ROWS, { amountCents: 1200, date: '2026-10-23', description: 'Uber' }];
    const again = await gql(viewer, IMPORT, { file: FILE, holderId: holder.id, rows: ROWS });
    expect(again.data.importExpenses).toBe(0);
    const more = await gql(viewer, IMPORT, { file: FILE, holderId: holder.id, rows: overlapping });
    expect(more.data.importExpenses).toBe(1);
    // The file that added nothing is not listed.
    const { data } = await gql(viewer, IMPORTS, { holderId: holder.id });
    expect(data.holder.imports.map((item: { expenseCount: number }) => item.expenseCount)).toEqual([
      1, 3,
    ]);
  });

  it('corrects the bank and the kind of account, and files every Gasto under one category', async () => {
    const { imports, viewer } = await importedFile();
    const { data } = await gql(viewer, UPDATE, {
      id: imports[0].id,
      input: { accountKind: 'SAVINGS', bankName: '  Nubank ', category: 'Mercado' },
    });
    expect(data.updateExpenseImport).toEqual({
      accountKind: 'SAVINGS',
      bankName: 'Nubank',
      expenseCount: 3,
    });
    const rows = await db
      .select({ category: schema.expense.category })
      .from(schema.expense)
      .where(eq(schema.expense.importId, imports[0].id));
    expect(rows.map(row => row.category)).toEqual(['Mercado', 'Mercado', 'Mercado']);
  });

  it('deletes a file with its Gastos, and only the Viewer’s own', async () => {
    const { imports, viewer } = await importedFile();
    const stranger = await createViewer('Bruno');
    expect((await gql(stranger, DELETE, { id: imports[0].id })).errors).toEqual(['NOT_FOUND']);
    expect(
      (await gql(stranger, UPDATE, { id: imports[0].id, input: { category: 'X' } })).errors
    ).toEqual(['NOT_FOUND']);

    expect((await gql(viewer, DELETE, { id: imports[0].id })).data.deleteExpenseImport).toBe(true);
    const left = await db
      .select()
      .from(schema.expense)
      .where(eq(schema.expense.importId, imports[0].id));
    expect(left).toEqual([]);
  });
});
