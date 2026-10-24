import { closeDb, db, schema } from '@zapbots/database';
import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';

import { createViewer, gql } from '../../test/helpers';
import { viewerHolder } from '../services/viewerHolder';

afterAll(async () => {
  await closeDb();
});

const FIELDS = /* GraphQL */ `
  query ($kind: RecordKind!, $id: ID!) {
    recordFields(kind: $kind, id: $id) {
      key
      value
    }
  }
`;
const UPDATE = /* GraphQL */ `
  mutation ($kind: RecordKind!, $id: ID!, $values: [RecordValueInput!]!) {
    updateRecord(kind: $kind, id: $id, values: $values)
  }
`;

/** The fields as the page shows them, with some changed, as the page sends them back. */
async function edited(
  viewer: Awaited<ReturnType<typeof createViewer>>,
  kind: string,
  id: string,
  changes: Record<string, string>
) {
  const { data } = await gql(viewer, FIELDS, { id, kind });
  return (data.recordFields as { key: string; value: string }[]).map(field => ({
    key: field.key,
    value: changes[field.key] ?? field.value,
  }));
}

describe('editing saved records', () => {
  it('corrects a Gasto typed with the wrong amount', async () => {
    const viewer = await createViewer();
    const holder = await viewerHolder(viewer);
    const [expense] = await db
      .insert(schema.expense)
      .values({
        amountCents: 5000,
        date: '2026-10-22',
        description: 'Açaí',
        holderId: holder.id,
        organizationId: viewer.organizationId,
      })
      .returning();

    const { data } = await gql(viewer, FIELDS, { id: expense!.id, kind: 'EXPENSE' });
    expect(data.recordFields).toContainEqual({ key: 'amount', value: '50,00' });

    const values = await edited(viewer, 'EXPENSE', expense!.id, {
      amount: '45,90',
      category: 'Alimentação',
    });
    expect(
      (await gql(viewer, UPDATE, { id: expense!.id, kind: 'EXPENSE', values })).errors
    ).toEqual([]);
    const [row] = await db.select().from(schema.expense).where(eq(schema.expense.id, expense!.id));
    expect(row).toMatchObject({ amountCents: 4590, category: 'Alimentação', date: '2026-10-22' });
  });

  it('recomputes an Operação from a corrected term and rate', async () => {
    const viewer = await createViewer();
    const holder = await viewerHolder(viewer);
    const [operation] = await db
      .insert(schema.creditOperation)
      .values({
        firstDueDate: '2026-11-10',
        holderId: holder.id,
        modality: 'PERSONAL_LOAN',
        monthlyRate: '0.025',
        name: 'Empréstimo Itaú',
        organizationId: viewer.organizationId,
        principalCents: 2_000_000,
        rateSource: 'INFORMED',
        system: 'PRICE',
        termMonths: 24,
      })
      .returning();

    const values = await edited(viewer, 'CREDIT_OPERATION', operation!.id, {
      monthlyRatePercent: '1,99',
      termMonths: '36',
    });
    const result = await gql(viewer, UPDATE, {
      id: operation!.id,
      kind: 'CREDIT_OPERATION',
      values,
    });
    expect(result.errors).toEqual([]);
    const [row] = await db
      .select()
      .from(schema.creditOperation)
      .where(eq(schema.creditOperation.id, operation!.id));
    expect(row).toMatchObject({ principalCents: 2_000_000, termMonths: 36 });
    expect(Number(row!.monthlyRate)).toBe(0.0199);
  });

  it('reads paydays typed as text on a Fonte de Renda', async () => {
    const viewer = await createViewer();
    const holder = await viewerHolder(viewer);
    const [source] = await db
      .insert(schema.incomeSource)
      .values({
        description: 'Salário',
        holderId: holder.id,
        monthlyNetCents: 800_000,
        paydays: [5],
        startsOn: '2026-01-01',
      })
      .returning();

    const values = await edited(viewer, 'INCOME_SOURCE', source!.id, {
      monthlyAmount: '8.500,00',
      paydays: '5, 20',
    });
    expect(
      (await gql(viewer, UPDATE, { id: source!.id, kind: 'INCOME_SOURCE', values })).errors
    ).toEqual([]);
    const [row] = await db
      .select()
      .from(schema.incomeSource)
      .where(eq(schema.incomeSource.id, source!.id));
    expect(row).toMatchObject({ monthlyNetCents: 850_000, paydays: [5, 20] });
  });

  it('refuses unreadable values and records of another Organization', async () => {
    const viewer = await createViewer();
    const stranger = await createViewer('Bruno');
    const holder = await viewerHolder(viewer);
    const [income] = await db
      .insert(schema.oneOffIncome)
      .values({
        amountCents: 100_000,
        date: '2026-10-01',
        description: 'Freela',
        holderId: holder.id,
        organizationId: viewer.organizationId,
      })
      .returning();
    const values = await edited(viewer, 'ONE_OFF_INCOME', income!.id, { amount: 'mil' });

    expect(
      (await gql(viewer, UPDATE, { id: income!.id, kind: 'ONE_OFF_INCOME', values })).errors
    ).toEqual(['BAD_USER_INPUT']);
    expect(
      (await gql(stranger, FIELDS, { id: income!.id, kind: 'ONE_OFF_INCOME' })).errors
    ).toEqual(['NOT_FOUND']);
    expect(
      (
        await gql(stranger, UPDATE, {
          id: income!.id,
          kind: 'ONE_OFF_INCOME',
          values: values.map(field =>
            field.key === 'amount' ? { ...field, value: '1,00' } : field
          ),
        })
      ).errors
    ).toEqual(['NOT_FOUND']);
    const [row] = await db
      .select()
      .from(schema.oneOffIncome)
      .where(eq(schema.oneOffIncome.id, income!.id));
    expect(row!.amountCents).toBe(100_000);
  });

  it('keeps what an edit does not touch: the financed asset and an implied rate', async () => {
    const viewer = await createViewer();
    const holder = await viewerHolder(viewer);
    const [operation] = await db
      .insert(schema.creditOperation)
      .values({
        collateralDescription: 'Onix 2022',
        collateralValueCents: 8_500_000,
        firstDueDate: '2026-11-10',
        holderId: holder.id,
        modality: 'VEHICLE_FINANCING',
        monthlyRate: '0.019876543210',
        name: 'Financiamento do carro',
        organizationId: viewer.organizationId,
        principalCents: 6_000_000,
        rateSource: 'IMPLIED',
        system: 'PRICE',
        termMonths: 48,
      })
      .returning();

    const values = await edited(viewer, 'CREDIT_OPERATION', operation!.id, { name: 'Carro' });
    expect(
      (await gql(viewer, UPDATE, { id: operation!.id, kind: 'CREDIT_OPERATION', values })).errors
    ).toEqual([]);

    const [row] = await db
      .select()
      .from(schema.creditOperation)
      .where(eq(schema.creditOperation.id, operation!.id));
    expect(row).toMatchObject({
      collateralDescription: 'Onix 2022',
      collateralValueCents: 8_500_000,
      monthlyRate: '0.019876543210',
      name: 'Carro',
      rateSource: 'IMPLIED',
    });
  });

  it('deletes a Fonte de Renda from every month, only for its own Organization', async () => {
    const viewer = await createViewer();
    const stranger = await createViewer('Bruno');
    const holder = await viewerHolder(viewer);
    const [source] = await db
      .insert(schema.incomeSource)
      .values({
        description: 'SALARIO',
        holderId: holder.id,
        monthlyNetCents: 2_200_000,
        paydays: [1],
        startsOn: '2026-01-01',
      })
      .returning();
    const DELETE = /* GraphQL */ `
      mutation ($kind: RecordKind!, $id: ID!) {
        deleteRecord(kind: $kind, id: $id)
      }
    `;
    const rows = () =>
      db.select().from(schema.incomeSource).where(eq(schema.incomeSource.id, source!.id));

    expect((await gql(stranger, DELETE, { id: source!.id, kind: 'INCOME_SOURCE' })).errors).toEqual(
      ['NOT_FOUND']
    );
    expect(await rows()).toHaveLength(1);

    expect((await gql(viewer, DELETE, { id: source!.id, kind: 'INCOME_SOURCE' })).errors).toEqual(
      []
    );
    expect(await rows()).toHaveLength(0);
  });
});

const IMPORT = /* GraphQL */ `
  mutation ($holderId: ID!, $rows: [ExpenseRowInput!]!) {
    importExpenses(holderId: $holderId, rows: $rows)
  }
`;

describe('importing a statement', () => {
  it('skips the lines of an OFX imported before, by their key', async () => {
    const viewer = await createViewer();
    const holder = await viewerHolder(viewer);
    const rows = [
      { amountCents: 4590, date: '2026-10-21', description: 'Padaria', externalId: 'ofx:1:A1' },
      { amountCents: 990, date: '2026-10-11', description: 'Café', externalId: 'ofx:1:A2' },
    ];
    expect((await gql(viewer, IMPORT, { holderId: holder.id, rows })).data.importExpenses).toBe(2);
    const again = [
      ...rows,
      { amountCents: 1200, date: '2026-10-22', description: 'Uber', externalId: 'ofx:1:A3' },
    ];
    expect(
      (await gql(viewer, IMPORT, { holderId: holder.id, rows: again })).data.importExpenses
    ).toBe(1);
    // Lines without a key, from a spreadsheet, always come in.
    const sheet = [{ amountCents: 500, date: '2026-10-22', description: 'Água' }];
    await gql(viewer, IMPORT, { holderId: holder.id, rows: sheet });
    expect(
      (await gql(viewer, IMPORT, { holderId: holder.id, rows: sheet })).data.importExpenses
    ).toBe(1);
  });

  it("keeps each Holder's keys apart", async () => {
    const ana = await createViewer();
    const bruno = await createViewer('Bruno');
    const row = { amountCents: 100, date: '2026-10-21', description: 'Pão', externalId: 'ofx:x:1' };
    for (const viewer of [ana, bruno]) {
      const holder = await viewerHolder(viewer);
      expect(
        (await gql(viewer, IMPORT, { holderId: holder.id, rows: [row] })).data.importExpenses
      ).toBe(1);
    }
  });
});

describe('deleting a Cartão', () => {
  it("takes its Faturas, keeps what was charged on it, and only the Viewer's own", async () => {
    const viewer = await createViewer();
    const stranger = await createViewer('Bruno');
    const holder = await viewerHolder(viewer);
    const [card] = await db
      .insert(schema.creditCard)
      .values({
        closingDay: 3,
        dueDay: 10,
        holderId: holder.id,
        limitCents: 500000,
        name: 'Nubank',
        organizationId: viewer.organizationId,
      })
      .returning();
    await db.insert(schema.statement).values({
      amountCents: 120000,
      creditCardId: card!.id,
      referenceMonth: '2026-10',
    });
    const [gym] = await db
      .insert(schema.recurringExpense)
      .values({
        amountCents: 9990,
        creditCardId: card!.id,
        description: 'Academia',
        dueDay: 5,
        holderId: holder.id,
        organizationId: viewer.organizationId,
        paymentMethod: 'CARD',
      })
      .returning();
    const DELETE = 'mutation ($id: ID!) { deleteCreditCard(id: $id) }';

    expect((await gql(stranger, DELETE, { id: card!.id })).data.deleteCreditCard).toBe(false);
    expect((await gql(viewer, DELETE, { id: card!.id })).data.deleteCreditCard).toBe(true);
    const statements = await db
      .select()
      .from(schema.statement)
      .where(eq(schema.statement.creditCardId, card!.id));
    expect(statements).toEqual([]);
    const [kept] = await db
      .select()
      .from(schema.recurringExpense)
      .where(eq(schema.recurringExpense.id, gym!.id));
    expect(kept!.creditCardId).toBeNull();
  });
});
