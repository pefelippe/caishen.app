import { closeDb, db, schema } from '@zapbots/database';
import { afterAll, describe, expect, it } from 'vitest';

import { createViewer, gql } from '../../test/helpers';
import { viewerHolder } from '../services/viewerHolder';

afterAll(async () => {
  await closeDb();
});

const GUIDES = /* GraphQL */ `
  query ($id: ID!, $month: String!) {
    holder(id: $id) {
      companyGuides {
        name
        competence
        amountCents
        dueDate
        paid
      }
      month(month: $month) {
        commitmentsCents
        commitments {
          kind
          label
          amountCents
          date
        }
      }
    }
  }
`;

describe('Impostos da empresa', () => {
  it('shows the guides read from Adaflow and counts them in the month they fall due', async () => {
    const viewer = await createViewer();
    const holder = await viewerHolder(viewer);
    const other = await viewerHolder(await createViewer('Bia'));
    const guide = (values: {
      amountCents: number;
      competence: string;
      dueDate: string;
      externalId: string;
      holderId: string;
      name: string;
      paid?: boolean;
    }) => ({ ...values, organizationId: viewer.organizationId });
    await db.insert(schema.companyGuide).values([
      guide({
        amountCents: 71_736,
        competence: '2026-09',
        dueDate: '2026-10-20',
        externalId: 'das-2026-09',
        holderId: holder.id,
        name: 'DAS - Documento de Arrecadação do Simples Nacional',
      }),
      guide({
        amountCents: 17_831,
        competence: '2026-09',
        dueDate: '2026-10-20',
        externalId: 'darf-2026-09',
        holderId: holder.id,
        name: 'DARF - Documento de Arrecadação de Receitas Federais',
        paid: true,
      }),
      guide({
        amountCents: 70_000,
        competence: '2026-08',
        dueDate: '2026-09-22',
        externalId: 'das-2026-08',
        holderId: holder.id,
        name: 'DAS - Documento de Arrecadação do Simples Nacional',
        paid: true,
      }),
    ]);
    await db.insert(schema.companyGuide).values({
      amountCents: 99_999,
      competence: '2026-09',
      dueDate: '2026-10-20',
      externalId: 'das-2026-09',
      holderId: other.id,
      name: 'DAS de outra pessoa',
      organizationId: other.organizationId,
    });

    const { data, errors } = await gql(viewer, GUIDES, { id: holder.id, month: '2026-10' });
    expect(errors).toEqual([]);
    expect(
      data.holder.companyGuides.map((item: { competence: string }) => item.competence)
    ).toEqual(['2026-09', '2026-09', '2026-08']);
    expect(data.holder.companyGuides[1]).toMatchObject({ amountCents: 17_831, paid: true });

    // Paid or not, a guide is money out of that month, before what is left for the debts.
    const company = data.holder.month.commitments.filter(
      (line: { kind: string }) => line.kind === 'COMPANY_TAX'
    );
    expect(company).toEqual([
      expect.objectContaining({ amountCents: 71_736, date: '2026-10-20' }),
      expect.objectContaining({ amountCents: 17_831, date: '2026-10-20' }),
    ]);
    expect(data.holder.month.commitmentsCents).toBe(89_567);
  });
});
