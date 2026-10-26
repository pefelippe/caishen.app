import { closeDb } from '@zapbots/database';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createViewer, gql } from '../../test/helpers';
import { cnpjHandler, COMPANY, failingCnpjHandler, NEVER_OPTED } from '../../test/msw/brasilapi';
import { mswServer } from '../../test/msw/openrouter';
import { runReadTool } from '../services/bots/tools';
import { forgetCnpjLookups } from '../services/cnpj';
import { viewerHolder } from '../services/viewerHolder';

beforeAll(() => mswServer.listen());
beforeEach(() => forgetCnpjLookups());
afterEach(() => mswServer.resetHandlers());
afterAll(async () => {
  mswServer.close();
  await closeDb();
});

const SET = /* GraphQL */ `
  mutation ($holderId: ID!, $cnpj: String) {
    setCompanyCnpj(holderId: $holderId, cnpj: $cnpj) {
      companyCnpj
    }
  }
`;

const COMPANY_QUERY = /* GraphQL */ `
  query ($holderId: ID!) {
    holder(id: $holderId) {
      companyCnpj
      company {
        legalName
        status
        cnaeCode
        city
        simples {
          opted
          since
          until
        }
        mei {
          opted
          since
          until
        }
      }
    }
  }
`;

const lookup = (viewer: Awaited<ReturnType<typeof createViewer>>, cnpj?: string) =>
  runReadTool(viewer, {
    arguments: JSON.stringify(cnpj ? { cnpj } : {}),
    id: 'call-1',
    name: 'company_lookup',
  });

describe('company CNPJ', () => {
  it('saves the CNPJ in digits and shows the company as the Receita registers it', async () => {
    const brasilApi = cnpjHandler();
    mswServer.use(brasilApi.handler);
    const viewer = await createViewer();
    const holder = await viewerHolder(viewer);

    const saved = await gql(viewer, SET, { cnpj: '11.222.333/0001-81', holderId: holder.id });
    const read = await gql(viewer, COMPANY_QUERY, { holderId: holder.id });
    await gql(viewer, COMPANY_QUERY, { holderId: holder.id });

    expect(saved.data.setCompanyCnpj.companyCnpj).toBe('11222333000181');
    expect(read.data.holder.company).toEqual({
      city: 'SAO PAULO/SP',
      cnaeCode: '6201501',
      legalName: 'ANA DESENVOLVIMENTO LTDA',
      mei: { opted: false, since: '2019-03-15', until: '2020-12-31' },
      simples: { opted: true, since: '2021-01-01', until: null },
      status: 'ATIVA',
    });
    // The second read comes from what was kept.
    expect(brasilApi.requests()).toBe(1);
  });

  it('reads equal dates to opt in and to leave as never opted', async () => {
    mswServer.use(cnpjHandler().handler);
    const viewer = await createViewer();
    const holder = await viewerHolder(viewer);
    await gql(viewer, SET, { cnpj: NEVER_OPTED.cnpj, holderId: holder.id });

    const read = await gql(viewer, COMPANY_QUERY, { holderId: holder.id });

    expect(read.data.holder.company.simples).toEqual({ opted: false, since: null, until: null });
    expect(read.data.holder.company.mei).toEqual({ opted: false, since: null, until: null });
  });

  it('refuses a CNPJ with wrong check digits and forgets it on null', async () => {
    const viewer = await createViewer();
    const holder = await viewerHolder(viewer);

    const wrong = await gql(viewer, SET, { cnpj: '11.222.333/0001-82', holderId: holder.id });
    await gql(viewer, SET, { cnpj: '11222333000181', holderId: holder.id });
    const cleared = await gql(viewer, SET, { cnpj: null, holderId: holder.id });

    expect(wrong.errors).toEqual(['BAD_USER_INPUT']);
    expect(cleared.data.setCompanyCnpj.companyCnpj).toBeNull();
  });

  it("does not reach another Organization's Titular", async () => {
    const owner = await viewerHolder(await createViewer('Ana'));
    const stranger = await createViewer('Bia');

    const result = await gql(stranger, SET, { cnpj: COMPANY.cnpj, holderId: owner.id });

    expect(result.errors).toEqual(['NOT_FOUND']);
  });

  it('says plainly when the Receita lookup does not answer', async () => {
    mswServer.use(failingCnpjHandler);
    const viewer = await createViewer();
    const holder = await viewerHolder(viewer);
    await gql(viewer, SET, { cnpj: COMPANY.cnpj, holderId: holder.id });

    const read = await gql(viewer, COMPANY_QUERY, { holderId: holder.id });

    expect(read.errors).toEqual(['BAD_USER_INPUT']);
    expect(read.data.holder.companyCnpj).toBe(COMPANY.cnpj);
  });
});

describe('company_lookup', () => {
  it("reads the Titular's own company when no CNPJ is given", async () => {
    mswServer.use(cnpjHandler().handler);
    const viewer = await createViewer();
    const holder = await viewerHolder(viewer);
    await gql(viewer, SET, { cnpj: COMPANY.cnpj, holderId: holder.id });

    const answer = await lookup(viewer);

    expect(answer).toContain('ANA DESENVOLVIMENTO LTDA (ANA DEV), CNPJ 11.222.333/0001-81');
    expect(answer).toContain('- Simples Nacional: optante desde 01/01/2021.');
    expect(answer).toContain('- MEI: não optante; saiu em 31/12/2020 (entrou em 15/03/2019).');
  });

  it('points to where the CNPJ is registered when there is none', async () => {
    const answer = await lookup(await createViewer());

    expect(answer).toContain('não cadastrou o CNPJ');
  });

  it('answers in words for an unknown or invalid CNPJ', async () => {
    mswServer.use(cnpjHandler().handler);
    const viewer = await createViewer();

    expect(await lookup(viewer, '11.444.777/0001-61')).toBe(
      'Esse CNPJ não está registrado na Receita.'
    );
    expect(await lookup(viewer, '123')).toBe('CNPJ inválido: confira os 14 números.');
  });
});
