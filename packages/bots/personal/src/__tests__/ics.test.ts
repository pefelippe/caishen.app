import { describe, expect, it } from 'vitest';

import { icsCalendar } from '../ics';

const now = new Date('2026-10-28T12:00:00Z');

describe('icsCalendar', () => {
  it('writes timed entries in UTC from the owner’s clock, and all-day ones as dates', () => {
    const ics = icsCalendar({
      entries: [
        { date: '2026-11-10', endTime: '21:30', startTime: '19:00', title: 'Jantar', uid: 'a' },
        { date: '2026-11-10', endTime: null, startTime: '07:00', title: 'Corrida', uid: 'b' },
        { date: '2026-11-10', endTime: '01:00', startTime: '23:00', title: 'Festa', uid: 'c' },
        { date: '2026-11-12', endTime: null, startTime: null, title: 'Internet', uid: 'd' },
      ],
      name: 'Caishen',
      now,
      timeZone: 'America/Sao_Paulo',
    });
    const lines = ics.split('\r\n');
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    // São Paulo is UTC-3.
    expect(lines).toContain('DTSTART:20261110T220000Z');
    expect(lines).toContain('DTEND:20261111T003000Z');
    expect(lines).toContain('DTEND:20261110T110000Z');
    // A party that ends after midnight ends the next day.
    expect(lines).toContain('DTEND:20261111T040000Z');
    expect(lines).toContain('DTSTART;VALUE=DATE:20261112');
    expect(lines).toContain('DTEND;VALUE=DATE:20261113');
    expect(lines.filter(line => line === 'DTSTAMP:20261028T120000Z')).toHaveLength(4);
  });

  it('escapes text and folds long lines', () => {
    const ics = icsCalendar({
      entries: [
        {
          date: '2026-11-12',
          description: `Vence hoje; valor: R$ 120,00\nPague pelo app ${'é'.repeat(60)}`,
          endTime: null,
          startTime: null,
          title: 'Internet, casa',
          uid: 'd',
        },
      ],
      name: 'Caishen',
      now,
      timeZone: 'America/Sao_Paulo',
    });
    expect(ics).toContain('SUMMARY:Internet\\, casa');
    expect(ics).toContain('DESCRIPTION:Vence hoje\\; valor: R$ 120\\,00\\nPague pelo app ');
    for (const line of ics.split('\r\n')) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
    // Unfolded, the text is whole again.
    expect(ics.replace(/\r\n /g, '')).toContain(`Pague pelo app ${'é'.repeat(60)}`);
  });
});
