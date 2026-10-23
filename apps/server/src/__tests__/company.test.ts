import { closeDb } from '@zapbots/database';
import { afterAll, describe, expect, it } from 'vitest';

import { createViewer, gql } from '../../test/helpers';
import { viewerHolder } from '../services/viewerHolder';

afterAll(async () => {
  await closeDb();
});

const SAVE = /* GraphQL */ `
  mutation ($input: CompanyInput!) {
    saveCompany(input: $input) {
      id
      cnpj
      proLabore {
        inssCents
        irrfCents
        netCents
      }
    }
  }
`;
const REVENUE = /* GraphQL */ `
  mutation ($input: CompanyRevenueInput!) {
    setCompanyRevenue(input: $input) {
      bracket
      effectiveRate
      guides {
        name
        amountCents
        dueDate
      }
    }
  }
`;
const MONTH = /* GraphQL */ `
  query ($id: ID!, $month: String!) {
    holder(id: $id) {
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

describe('Empresa', () => {
  it('works out a Simples DAS and the pró-labore DARF, due in the month after', async () => {
    const viewer = await createViewer();
    const holder = await viewerHolder(viewer);
    const saved = await gql(viewer, SAVE, {
      input: {
        annex: 'III',
        cnpj: '11.222.333/0001-81',
        exports: true,
        holderId: holder.id,
        proLaboreCents: 162_100,
        regime: 'SIMPLES',
        startsOn: '2026-01-01',
      },
    });
    expect(saved.errors).toEqual([]);
    expect(saved.data.saveCompany).toMatchObject({
      cnpj: '11222333000181',
      proLabore: { inssCents: 17_831, irrfCents: 0, netCents: 144_269 },
    });

    const september = await gql(viewer, REVENUE, {
      input: {
        amountCents: 2_348_910,
        companyId: saved.data.saveCompany.id,
        month: '2026-09',
        rbt12Cents: 15_000_000,
      },
    });
    expect(september.errors).toEqual([]);
    expect(september.data.setCompanyRevenue.bracket).toBe(1);
    expect(september.data.setCompanyRevenue.guides).toEqual([
      { amountCents: 71_736, dueDate: '2026-10-20', name: 'DAS · 09/2026' },
      { amountCents: 17_831, dueDate: '2026-10-20', name: 'DARF · pró-labore 09/2026' },
    ]);

    // In Lançamentos, October pays September's guides.
    const october = (await gql(viewer, MONTH, { id: holder.id, month: '2026-10' })).data.holder
      .month;
    expect(october.commitments).toEqual(
      expect.arrayContaining([
        { amountCents: 71_736, date: '2026-10-20', kind: 'COMPANY_TAX', label: 'DAS · 09/2026' },
        {
          amountCents: 17_831,
          date: '2026-10-20',
          kind: 'COMPANY_TAX',
          label: 'DARF · pró-labore 09/2026',
        },
      ])
    );
  });

  it('reads a month without a declaration from its Fonte de Renda, and averages the first year', async () => {
    const viewer = await createViewer();
    const holder = await viewerHolder(viewer);
    const source = await gql(
      viewer,
      /* GraphQL */ `
        mutation ($input: AddIncomeSourceInput!) {
          addIncomeSource(input: $input) {
            id
          }
        }
      `,
      {
        input: {
          description: 'Faturamento',
          holderId: holder.id,
          monthlyNetCents: 500_000,
          paydays: [5],
          startsOn: '2026-01-01',
        },
      }
    );
    expect(source.errors).toEqual([]);
    const saved = await gql(viewer, SAVE, {
      input: {
        annex: 'III',
        cnpj: '11222333000181',
        holderId: holder.id,
        regime: 'SIMPLES',
        revenueSourceId: source.data.addIncomeSource.id,
        startsOn: '2026-07-01',
      },
    });
    const months = await gql(
      viewer,
      /* GraphQL */ `
        query ($id: ID!) {
          holder(id: $id) {
            company {
              months(upTo: "2026-09", last: 1) {
                revenueCents
                revenueOrigin
                rbt12Cents
                rbt12Typed
                guides {
                  name
                  amountCents
                }
              }
            }
          }
        }
      `,
      { id: holder.id }
    );
    expect(saved.errors).toEqual([]);
    // July and August, R$ 5.000 each, averaged times 12: R$ 60.000, the first bracket (6%).
    expect(months.data.holder.company.months).toEqual([
      {
        guides: [{ amountCents: 30_000, name: 'DAS · 09/2026' }],
        rbt12Cents: 6_000_000,
        rbt12Typed: false,
        revenueCents: 500_000,
        revenueOrigin: 'INCOME_SOURCE',
      },
    ]);
  });

  it('works out only the pró-labore DARF in the Lucro Real', async () => {
    const viewer = await createViewer();
    const holder = await viewerHolder(viewer);
    const saved = await gql(viewer, SAVE, {
      input: {
        cnpj: '11222333000181',
        holderId: holder.id,
        proLaboreCents: 162_100,
        regime: 'REAL',
        startsOn: '2026-01-01',
      },
    });
    const september = await gql(viewer, REVENUE, {
      input: { amountCents: 1_000_000, companyId: saved.data.saveCompany.id, month: '2026-09' },
    });
    // The company's 20% too: in the Lucro Real it is paid apart from any DAS.
    expect(september.data.setCompanyRevenue.guides).toEqual([
      { amountCents: 17_831 + 32_420, dueDate: '2026-10-20', name: 'DARF · pró-labore 09/2026' },
    ]);
  });

  it('refuses a wrong CNPJ and a Simples company without its Anexo', async () => {
    const viewer = await createViewer();
    const holder = await viewerHolder(viewer);
    const base = { holderId: holder.id, regime: 'SIMPLES', startsOn: '2026-01-01' };
    const wrong = await gql(viewer, SAVE, {
      input: { ...base, annex: 'III', cnpj: '11.222.333/0001-82' },
    });
    expect(wrong.errors).toEqual(['BAD_USER_INPUT']);
    const noAnnex = await gql(viewer, SAVE, { input: { ...base, cnpj: '11222333000181' } });
    expect(noAnnex.errors).toEqual(['BAD_USER_INPUT']);
  });

  it('keeps one company to its Organization', async () => {
    const viewer = await createViewer();
    const stranger = await createViewer('Bruno');
    const holder = await viewerHolder(viewer);
    const saved = await gql(viewer, SAVE, {
      input: {
        cnpj: '11222333000181',
        holderId: holder.id,
        regime: 'MEI',
        startsOn: '2026-01-01',
      },
    });
    const theirs = await gql(stranger, REVENUE, {
      input: { amountCents: 100, companyId: saved.data.saveCompany.id, month: '2026-09' },
    });
    expect(theirs.errors).toEqual(['NOT_FOUND']);
  });
});
