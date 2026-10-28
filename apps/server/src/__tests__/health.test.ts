import { closeDb, db, schema } from '@zapbots/database';
import { eq } from 'drizzle-orm';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createViewer, gql } from '../../test/helpers';
import app from '../app';
import { viewerToday } from '../services/personal/clock';

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

const SET = /* GraphQL */ `
  mutation ($on: Boolean!) {
    setHealthInbox(on: $on) {
      path
      lastReceivedAt
    }
  }
`;

const send = (path: string, body: unknown) =>
  fetch(`${base}${path}`, {
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });

describe('Saúde do celular', () => {
  it('turns what Health Auto Export sends into steps, Medidas, Sono and Treinos, once each', async () => {
    const viewer = await createViewer();
    const today = await viewerToday(viewer);
    const { path } = (await gql(viewer, SET, { on: true })).data.setHealthInbox;
    expect(path).toMatch(/^\/api\/health\/[\w-]{32}$/);

    const payload = (steps: number, kg: number) => ({
      data: {
        metrics: [
          {
            data: [{ date: `${today} 00:00:00 -0300`, qty: steps }],
            name: 'step_count',
            units: 'count',
          },
          {
            data: [{ date: `${today} 07:00:00 -0300`, qty: kg }],
            name: 'weight_body_mass',
            units: 'kg',
          },
          {
            data: [{ sleepEnd: `${today} 06:30:00 -0300`, sleepStart: `${today} 00:15:00 -0300` }],
            name: 'sleep_analysis',
            units: 'hr',
          },
        ],
        workouts: [
          {
            distance: { qty: 5.2, units: 'km' },
            duration: 1800,
            id: 'run-1',
            name: 'Outdoor Run',
            start: `${today} 07:00:00 -0300`,
          },
        ],
      },
    });

    const first = await send(path, payload(4000, 72.5));
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({
      received: { bodyFat: 0, sleeps: 1, steps: 1, weights: 1, workouts: 1 },
    });
    // Later the same day: more steps, a new weight, the same run.
    await send(path, payload(9000, 72.3));
    // A send that counted part of the day takes no steps away.
    await send(path, payload(3000, 72.3));

    const home = (
      await gql(
        viewer,
        `{ fitnessToday { steps lastSleep { bedTime wakeTime } done { title durationMinutes notes } } }`
      )
    ).data.fitnessToday;
    expect(home.steps).toBe(9000);
    expect(home.lastSleep).toEqual({ bedTime: '00:15', wakeTime: '06:30' });
    expect(home.done).toEqual([{ durationMinutes: 30, notes: '5,2 km', title: 'Corrida' }]);

    const weights = await db
      .select({ value: schema.measurement.value })
      .from(schema.measurement)
      .where(eq(schema.measurement.organizationId, viewer.organizationId));
    expect(weights).toEqual([{ value: 72_300 }]);

    const connections = (await gql(viewer, `{ connections { kind connected } }`)).data.connections;
    expect(connections).toContainEqual({ connected: true, kind: 'HEALTH' });
  });

  it('reads Health Connect through HC Webhook, and only at a live address', async () => {
    const viewer = await createViewer();
    const { path } = (await gql(viewer, SET, { on: true })).data.setHealthInbox;
    const response = await send(path, {
      body_fat: [{ percentage: 21.5, time: '2026-10-20T10:00:00Z' }],
      steps: [
        { count: 5000, end_time: '2026-10-20T20:00:00Z', start_time: '2026-10-20T10:00:00Z' },
      ],
      timezone: 'UTC',
    });
    expect(((await response.json()) as { received: unknown }).received).toMatchObject({
      bodyFat: 1,
      steps: 1,
    });
    const [fat] = await db
      .select({ kind: schema.measurement.kind, value: schema.measurement.value })
      .from(schema.measurement)
      .where(eq(schema.measurement.organizationId, viewer.organizationId));
    expect(fat).toEqual({ kind: 'BODY_FAT', value: 215 });

    // A new address: the old one stops working; off removes it, what came stays.
    const next = (await gql(viewer, SET, { on: true })).data.setHealthInbox.path;
    expect((await send(path, {})).status).toBe(404);
    expect((await send(next, {})).status).toBe(200);
    await gql(viewer, SET, { on: false });
    expect((await send(next, {})).status).toBe(404);
    expect((await gql(viewer, `{ healthInbox { path } }`)).data.healthInbox).toBeNull();
    const [kept] = await db
      .select({ steps: schema.activityDay.steps })
      .from(schema.activityDay)
      .where(eq(schema.activityDay.organizationId, viewer.organizationId));
    expect(kept).toEqual({ steps: 5000 });
  });
});
