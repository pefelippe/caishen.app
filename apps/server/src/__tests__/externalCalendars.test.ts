import { closeDb, db, schema } from '@zapbots/database';
import { eq } from 'drizzle-orm';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createViewer, gql } from '../../test/helpers';
import {
  calendarHandlers,
  GONE_URL,
  GOOGLE_URL,
  ICLOUD_URL,
  NOT_A_CALENDAR_URL,
  OUTLOOK_URL,
} from '../../test/msw/calendars';
import { mswServer } from '../../test/msw/openrouter';
import { publicBookingSlots } from '../services/personal/booking';
import { calendarFeedFile } from '../services/personal/feed';

beforeAll(() => mswServer.listen());
afterEach(() => mswServer.resetHandlers());
afterAll(async () => {
  mswServer.close();
  await closeDb();
});

const ADD = /* GraphQL */ `
  mutation ($name: String!, $url: String!) {
    addExternalCalendar(name: $name, url: $url) {
      id
      name
      source
      host
      error
    }
  }
`;
const AGENDA = /* GraphQL */ `
  query ($from: Date!, $to: Date!) {
    agenda(from: $from, to: $to) {
      kind
      date
      startTime
      endTime
      title
      source
    }
  }
`;

describe('Agendas de fora', () => {
  it('reads iCloud, Google and Outlook by their links into the Agenda, on the owner’s clock', async () => {
    mswServer.use(...calendarHandlers);
    const viewer = await createViewer();

    // The iPhone's webcal:// link is read as https.
    const icloud = await gql(viewer, ADD, {
      name: 'Casa',
      url: ICLOUD_URL.replace('https://', 'webcal://'),
    });
    expect(icloud.errors).toEqual([]);
    expect(icloud.data.addExternalCalendar).toMatchObject({
      host: 'p52-caldav.icloud.com',
      name: 'Casa',
      source: 'ICLOUD',
    });
    const google = await gql(viewer, ADD, { name: '', url: GOOGLE_URL });
    expect(google.data.addExternalCalendar).toMatchObject({
      name: 'Google Agenda',
      source: 'GOOGLE',
    });
    await gql(viewer, ADD, { name: 'Trabalho', url: OUTLOOK_URL });

    const { agenda } = (await gql(viewer, AGENDA, { from: '2026-11-09', to: '2026-11-25' })).data;
    const external = agenda
      .filter((item: { kind: string }) => item.kind === 'EXTERNAL')
      .map(({ date, endTime, source, startTime, title }: Record<string, string>) =>
        [date, startTime, endTime, title, source].join(' ')
      );
    expect(external).toEqual([
      '2026-11-10 10:00 11:00 Dentista Casa',
      '2026-11-10 19:00 20:00 Inglês Casa',
      '2026-11-11 10:00 11:00 Reunião, time Google Agenda',
      '2026-11-12 09:00 09:30 Daily Trabalho',
      '2026-11-20   Consciência Negra Google Agenda',
      // The 17th was skipped and the 24th moved to eight.
      '2026-11-24 20:00 21:00 Inglês (remarcada) Casa',
    ]);

    // On a clock three hours ahead, the same meeting is at one.
    await gql(viewer, `mutation { setTimeZone(timezone: "Europe/Lisbon") }`);
    const lisbon = (await gql(viewer, AGENDA, { from: '2026-11-11', to: '2026-11-11' })).data
      .agenda;
    expect(lisbon).toContainEqual(
      expect.objectContaining({ startTime: '13:00', title: 'Reunião, time' })
    );

    // Someone else sees none of it.
    const other = await createViewer('Bia');
    expect(
      (await gql(other, AGENDA, { from: '2026-11-09', to: '2026-11-25' })).data.agenda
    ).toEqual([]);
  });

  it('takes their time out of the booking links and leaves them out of the Agenda’s own link', async () => {
    mswServer.use(...calendarHandlers);
    const viewer = await createViewer();
    await gql(viewer, ADD, { name: 'Trabalho', url: OUTLOOK_URL });
    const windows = [0, 1, 2, 3, 4, 5, 6].map(weekday => ({
      end: '10:00',
      start: '09:00',
      weekday,
    }));
    const slug = `link-${crypto.randomUUID().slice(0, 8)}`;
    await gql(
      viewer,
      `mutation ($input: BookingTypeInput!) { saveBookingType(input: $input) { id } }`,
      {
        input: {
          daysAhead: 2,
          durationMinutes: 30,
          minNoticeMinutes: 0,
          slug,
          title: 'Conversa',
          windows,
        },
      }
    );
    const slots = await publicBookingSlots(slug, new Date('2026-11-11T12:00:00Z'));
    const iso = slots.map(slot => slot.toISOString());
    // The Daily, 09:00 to 09:30 in São Paulo, takes the first half hour of the 12th.
    expect(iso).not.toContain('2026-11-12T12:00:00.000Z');
    expect(iso).toContain('2026-11-12T12:30:00.000Z');

    const { setCalendarFeed } = (
      await gql(viewer, `mutation { setCalendarFeed(on: true) { path } }`)
    ).data;
    const file = await calendarFeedFile(
      /\/api\/calendar\/(.+)\.ics$/.exec(setCalendarFeed.path)![1]!
    );
    expect(file).not.toContain('Daily');
  });

  it('refuses what is not a calendar or not public, and keeps showing one whose link stops working', async () => {
    mswServer.use(...calendarHandlers);
    const viewer = await createViewer();
    const refused = async (url: string) => (await gql(viewer, ADD, { name: 'X', url })).errors;

    expect(await refused(NOT_A_CALENDAR_URL)).toEqual(['BAD_USER_INPUT']);
    expect(await refused(GONE_URL)).toEqual(['BAD_USER_INPUT']);
    expect(await refused('ftp://example.com/a.ics')).toEqual(['BAD_USER_INPUT']);
    // Nothing inside the server's own network.
    expect(await refused('https://127.0.0.1/calendar.ics')).toEqual(['BAD_USER_INPUT']);
    expect(await refused('https://169.254.169.254/latest/meta-data')).toEqual(['BAD_USER_INPUT']);
    expect(await refused('https://localhost/calendar.ics')).toEqual(['BAD_USER_INPUT']);
    expect((await gql(viewer, `{ externalCalendars { id } }`)).data.externalCalendars).toEqual([]);

    const { id } = (await gql(viewer, ADD, { name: 'Casa', url: ICLOUD_URL })).data
      .addExternalCalendar;
    const [row] = await db
      .select({ sealedUrl: schema.externalCalendar.sealedUrl })
      .from(schema.externalCalendar)
      .where(eq(schema.externalCalendar.id, id));
    // The secret address is kept sealed.
    expect(row!.sealedUrl).not.toContain('icloud');

    mswServer.use(http.get(ICLOUD_URL, () => new HttpResponse(null, { status: 404 })));
    const refreshed = await gql(
      viewer,
      `mutation ($id: ID!) { refreshExternalCalendar(id: $id) { error } }`,
      { id }
    );
    expect(refreshed.data.refreshExternalCalendar.error).toBe('O link não existe mais.');
    const { agenda } = (await gql(viewer, AGENDA, { from: '2026-11-10', to: '2026-11-10' })).data;
    expect(agenda).toContainEqual(expect.objectContaining({ title: 'Dentista' }));

    expect(
      (await gql(viewer, `mutation ($id: ID!) { removeExternalCalendar(id: $id) }`, { id })).data
    ).toEqual({ removeExternalCalendar: true });
    expect(
      (await gql(viewer, AGENDA, { from: '2026-11-10', to: '2026-11-10' })).data.agenda
    ).toEqual([]);
  });
});
