export const FOCUS_MINUTES = 25;
export const BREAK_MINUTES = 5;

const MINUTE = 60_000;
/** A focus block that ended this long ago, with mny closed, is dropped instead of recorded late. */
const STALE = 60 * MINUTE;
const STORAGE_KEY = 'mny.pomodoro';

/** The running clock: a block of focus, optionally on a Task, or the break that follows it. */
export interface Timer {
  /** Epoch milliseconds. Time left is always computed from it, never counted down. */
  endsAt: number;
  phase: 'BREAK' | 'FOCUS';
  task: { id: string; title: string } | null;
}

export function startFocus(now: number, task: Timer['task']): Timer {
  return { endsAt: now + FOCUS_MINUTES * MINUTE, phase: 'FOCUS', task };
}

/**
 * What the Timer is at `now`. When a focus block ended on the way, it comes back as `finished`,
 * to be recorded as a Pomodoro, and the break starts where the focus ended.
 */
export function advance(
  timer: Timer | null,
  now: number
): { finished: Timer | null; timer: Timer | null } {
  if (!timer || now < timer.endsAt) return { finished: null, timer };
  if (timer.phase === 'BREAK') return { finished: null, timer: null };
  const breakEndsAt = timer.endsAt + BREAK_MINUTES * MINUTE;
  return {
    finished: now - timer.endsAt < STALE ? timer : null,
    timer: now < breakEndsAt ? { endsAt: breakEndsAt, phase: 'BREAK', task: timer.task } : null,
  };
}

/** "24:13" for the time left. */
export function clock(milliseconds: number): string {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

// The Timer lives in localStorage so a reload or a second tab sees the same clock. Storage can be
// blocked (private windows), so a copy in memory keeps the page working without it.
let memory: Timer | null = null;

export function readTimer(): Timer | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    memory = stored ? (JSON.parse(stored) as Timer) : null;
  } catch {
    // Keep the copy in memory.
  }
  return memory;
}

export function writeTimer(timer: Timer | null): void {
  memory = timer;
  try {
    if (timer) localStorage.setItem(STORAGE_KEY, JSON.stringify(timer));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Keep the copy in memory.
  }
}
