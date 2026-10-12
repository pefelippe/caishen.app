import { useMutation, useQuery } from '@apollo/client/react';
import { FocusDocument, LogPomodoroDocument } from '@mny/graphql/client';
import { SquareIcon } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import {
  advance,
  BREAK_MINUTES,
  clock,
  FOCUS_MINUTES,
  readTimer,
  startFocus,
  writeTimer,
  type Timer,
} from '../lib/pomodoro';

interface Pomodoro {
  /** Milliseconds left in the current phase. */
  remaining: number;
  start(task?: Timer['task']): void;
  stop(): void;
  timer: Timer | null;
}

const PomodoroContext = createContext<Pomodoro | null>(null);

export function usePomodoro(): Pomodoro {
  const value = useContext(PomodoroContext);
  if (!value) throw new Error('usePomodoro needs a PomodoroProvider above it');
  return value;
}

/** Two short notes when a phase ends. Browsers may refuse audio; the clock still shows it. */
function chime() {
  try {
    const audio = new AudioContext();
    for (const [index, frequency] of [660, 880].entries()) {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.value = 0.08;
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start(audio.currentTime + index * 0.25);
      oscillator.stop(audio.currentTime + index * 0.25 + 0.2);
    }
  } catch {
    // No sound.
  }
}

/**
 * Runs the Pomodoro clock above the routes, so it survives moving between pages. The stored
 * Timer is the source of truth: every tick reads it, which also keeps two tabs in step and
 * records each finished block once.
 */
export function PomodoroProvider({ children }: { children: ReactNode }) {
  const [timer, setTimer] = useState(readTimer);
  const [now, setNow] = useState(Date.now);
  const [log] = useMutation(LogPomodoroDocument, { refetchQueries: 'active' });

  const tick = useCallback(() => {
    const stored = readTimer();
    const next = advance(stored, Date.now());
    if (next.timer !== stored) {
      writeTimer(next.timer);
      chime();
      if (next.finished) {
        void log({
          variables: { minutes: FOCUS_MINUTES, taskId: next.finished.task?.id ?? null },
        }).catch(() => undefined);
      }
    }
    setTimer(next.timer);
    if (next.timer) setNow(Date.now());
  }, [log]);

  useEffect(() => {
    tick();
    const interval = setInterval(tick, 1000);
    window.addEventListener('storage', tick);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', tick);
    };
  }, [tick]);

  useEffect(() => {
    if (!timer) return;
    const title = document.title;
    document.title = `${clock(timer.endsAt - now)} · ${PHASE[timer.phase]}`;
    return () => {
      document.title = title;
    };
  }, [timer, now]);

  const value = useMemo<Pomodoro>(
    () => ({
      remaining: timer ? timer.endsAt - now : 0,
      start: (task = null) => {
        writeTimer(startFocus(Date.now(), task));
        tick();
      },
      stop: () => {
        writeTimer(null);
        tick();
      },
      timer,
    }),
    [timer, now, tick]
  );

  return <PomodoroContext.Provider value={value}>{children}</PomodoroContext.Provider>;
}

const PHASE = { BREAK: 'Pausa', FOCUS: 'Foco' } as const;

/** The running clock in the sidebar; nothing while no Pomodoro is running. */
export function PomodoroClock() {
  const { remaining, stop, timer } = usePomodoro();
  if (!timer) return null;
  return (
    <div className="flex items-center gap-2" data-area="WORK">
      <Link className="flex min-w-0 flex-1 flex-col leading-tight" to="/trabalho">
        <span className="font-mono text-lg text-ink tabular-nums">{clock(remaining)}</span>
        <span className="truncate text-xs text-muted-foreground">
          {PHASE[timer.phase]}
          {timer.task ? ` · ${timer.task.title}` : ''}
        </span>
      </Link>
      <Button aria-label="Parar o Pomodoro" onClick={stop} size="icon-xs" variant="ghost">
        <SquareIcon />
      </Button>
    </div>
  );
}

/** The Pomodoro section of Trabalho: the clock, and what was focused today and this week. */
export function PomodoroCard() {
  const { remaining, start, stop, timer } = usePomodoro();
  const { data } = useQuery(FocusDocument, { fetchPolicy: 'cache-and-network' });
  const focus = data?.focus;
  const done = focus?.today.length ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pomodoro</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
        <div className="flex items-end gap-5">
          <span
            className={cn(
              'font-mono text-5xl leading-none tabular-nums',
              timer?.phase === 'FOCUS' ? 'text-ink' : !timer && 'text-muted-foreground'
            )}
          >
            {clock(timer ? remaining : FOCUS_MINUTES * 60_000)}
          </span>
          <div className="flex flex-col items-start gap-2">
            <span className="text-muted-foreground">
              {!timer
                ? `${FOCUS_MINUTES} minutos de foco, ${BREAK_MINUTES} de pausa.`
                : timer.phase === 'BREAK'
                  ? 'Pausa. O Pomodoro foi registrado.'
                  : timer.task
                    ? `Foco em “${timer.task.title}”.`
                    : 'Foco, sem Tarefa.'}
            </span>
            {timer ? (
              <Button onClick={stop} size="sm" variant="outline">
                {timer.phase === 'FOCUS' ? 'Parar sem registrar' : 'Encerrar a pausa'}
              </Button>
            ) : (
              <Button onClick={() => start()} size="sm">
                Começar
              </Button>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {done > 0 && (
            <div aria-hidden className="flex flex-wrap gap-1.5">
              {focus?.today.map(pomodoro => (
                <span
                  className="size-3 rounded-full bg-ink"
                  key={pomodoro.id}
                  title={pomodoro.task?.title ?? 'Sem Tarefa'}
                />
              ))}
            </div>
          )}
          <span className="text-muted-foreground tabular-nums">
            {done} hoje · {focus?.todayMinutes ?? 0} min
            <span className="text-xs">
              {' '}
              · {focus?.weekCount ?? 0} na semana ({focus?.weekMinutes ?? 0} min)
            </span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
