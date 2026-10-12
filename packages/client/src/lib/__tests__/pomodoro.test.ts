import { describe, expect, it } from 'vitest';

import { advance, clock, startFocus } from '../pomodoro';

const MINUTE = 60_000;
const task = { id: 't1', title: 'Configurar o domínio' };

describe('pomodoro timer', () => {
  it('keeps running until the 25 minutes are over', () => {
    const timer = startFocus(0, task);
    expect(advance(timer, 24 * MINUTE)).toEqual({ finished: null, timer });
  });

  it('finishes the focus block and starts a 5 minute break where the focus ended', () => {
    const timer = startFocus(0, task);
    expect(advance(timer, 26 * MINUTE)).toEqual({
      finished: timer,
      timer: { endsAt: 30 * MINUTE, phase: 'BREAK', task },
    });
  });

  it('goes idle after the break without finishing anything', () => {
    expect(advance({ endsAt: 30 * MINUTE, phase: 'BREAK', task }, 30 * MINUTE)).toEqual({
      finished: null,
      timer: null,
    });
  });

  it('records a block that ended while the page was closed, but skips the missed break', () => {
    const timer = startFocus(0, null);
    expect(advance(timer, 40 * MINUTE)).toEqual({ finished: timer, timer: null });
  });

  it('drops a block that ended more than an hour ago', () => {
    expect(advance(startFocus(0, null), 90 * MINUTE)).toEqual({ finished: null, timer: null });
  });

  it('writes the time left as minutes and seconds', () => {
    expect([clock(25 * MINUTE), clock(61_500), clock(-5)]).toEqual(['25:00', '01:02', '00:00']);
  });
});
