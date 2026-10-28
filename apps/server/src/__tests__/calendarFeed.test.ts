import { closeDb } from '@zapbots/database';
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

const SET = `mutation ($on: Boolean!) { setCalendarFeed(on: $on) { path } }`;
const CONNECTIONS = `{ connections { kind category connected } }`;

describe('Assinatura da Agenda', () => {
  it('serves the Agenda as a calendar file at a secret link, until it is replaced or removed', async () => {
    const viewer = await createViewer();
    const today = await viewerToday(viewer);
    await gql(viewer, `mutation ($input: EventInput!) { createEvent(input: $input) { id } }`, {
      input: { endTime: '21:00', startTime: '19:00', startsOn: today, title: 'Jantar, com a Bia' },
    });
    await gql(viewer, `mutation ($input: TaskInput!) { createTask(input: $input) { id } }`, {
      input: { dueOn: today, title: 'Levar o bolo' },
    });

    expect((await gql(viewer, `{ calendarFeed { path } }`)).data.calendarFeed).toBeNull();
    const { path } = (await gql(viewer, SET, { on: true })).data.setCalendarFeed;
    expect(path).toMatch(/^\/api\/calendar\/[\w-]{32}\.ics$/);
    expect((await gql(viewer, CONNECTIONS)).data.connections).toContainEqual({
      category: 'CALENDAR',
      connected: true,
      kind: 'CALENDAR_FEED',
    });

    const response = await fetch(`${base}${path}`);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/calendar');
    const ics = await response.text();
    expect(ics).toContain('SUMMARY:Jantar\\, com a Bia');
    expect(ics).toContain('SUMMARY:Levar o bolo');
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);

    // Someone else's link shows nothing of this Agenda.
    const other = await createViewer('Bia');
    const otherPath = (await gql(other, SET, { on: true })).data.setCalendarFeed.path;
    expect(await (await fetch(`${base}${otherPath}`)).text()).not.toContain('Jantar');

    // A new link: the old one stops working.
    const next = (await gql(viewer, SET, { on: true })).data.setCalendarFeed.path;
    expect(next).not.toBe(path);
    expect((await fetch(`${base}${path}`)).status).toBe(404);
    expect((await fetch(`${base}${next}`)).status).toBe(200);

    expect((await gql(viewer, SET, { on: false })).data.setCalendarFeed).toBeNull();
    expect((await fetch(`${base}${next}`)).status).toBe(404);
    expect((await fetch(`${base}/api/calendar/nothing.ics`)).status).toBe(404);
  });
});
