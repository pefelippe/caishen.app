import { closeDb } from '@zapbots/database';
import { addDays, today } from '@zapbots/finance';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createViewer, gql } from '../../test/helpers';
import { ptaxHandler, sgsHandler } from '../../test/msw/bacen';
import { mswServer } from '../../test/msw/openrouter';
import { forgetIndicators } from '../services/indicators';

beforeAll(() => mswServer.listen());
beforeEach(() => forgetIndicators());
afterEach(() => mswServer.resetHandlers());
afterAll(async () => {
  mswServer.close();
  await closeDb();
});

const INDICATORS = /* GraphQL */ `
  query {
    indicators {
      dollar {
        rate
        date
        change
      }
      selic {
        rate
        date
      }
      cdi {
        rate
        date
      }
      ipca12m {
        rate
        date
      }
    }
  }
`;

/** `2026-10-23` as the SGS writes it: `23/10/2026`. */
const sgsDate = (iso: string) => iso.split('-').reverse().join('/');

const day = today();
const yesterday = addDays(day, -1);

describe('Dashboard indicators', () => {
  it('reads the dollar, the Selic, the CDI and the IPCA from the Banco Central', async () => {
    const sgs = sgsHandler({
      // The Selic target is published ahead, up to the next Copom meeting.
      432: [
        { data: sgsDate(yesterday), valor: '13.75' },
        { data: sgsDate(day), valor: '13.75' },
        { data: sgsDate(addDays(day, 5)), valor: '14.25' },
      ],
      4389: [
        { data: sgsDate(day), valor: '13.65' },
        { data: sgsDate(yesterday), valor: '13.60' },
      ],
      13522: [
        { data: '01/08/2026', valor: '4.22' },
        { data: '01/09/2026', valor: '4.58' },
      ],
    });
    mswServer.use(sgs.handler, ptaxHandler({ [day]: 5.5, [yesterday]: 5.45 }).handler);
    const viewer = await createViewer();

    const { data, errors } = await gql(viewer, INDICATORS);
    await gql(viewer, INDICATORS);

    expect(errors).toEqual([]);
    const { cdi, dollar, ipca12m, selic } = data.indicators;
    expect(selic).toEqual({ date: day, rate: 0.1375 });
    expect(cdi).toEqual({ date: day, rate: 0.1365 });
    expect(ipca12m).toEqual({ date: '2026-09-01', rate: 0.0458 });
    expect(dollar).toMatchObject({ date: day, rate: 5.5 });
    expect(dollar.change).toBeCloseTo(5.5 / 5.45 - 1, 10);
    // The second read comes from what was kept: one request per series.
    expect(sgs.requests()).toBe(3);
  });

  it('leaves out what the Banco Central does not answer', async () => {
    mswServer.use(sgsHandler({}).handler, ptaxHandler({ [day]: 5.5 }).handler);
    const viewer = await createViewer();

    const { data, errors } = await gql(viewer, INDICATORS);

    expect(errors).toEqual([]);
    expect(data.indicators).toMatchObject({ cdi: null, ipca12m: null, selic: null });
    expect(data.indicators.dollar).toMatchObject({ date: day, rate: 5.5 });
  });
});
