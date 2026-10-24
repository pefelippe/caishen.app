import type { JobStatus, RoutineCadence } from '@zapbots/graphql/client';

/** How each Job status reads on screen: a word, a badge, and the colour of its dot in a list. */
export const JOB_STATUS: Record<
  JobStatus,
  { dot: string; label: string; variant: 'outline' | 'secondary' }
> = {
  DONE: { dot: 'bg-success', label: 'pronto', variant: 'secondary' },
  FAILED: { dot: 'bg-destructive', label: 'falhou', variant: 'outline' },
  QUEUED: { dot: 'bg-muted-foreground/50', label: 'na fila', variant: 'outline' },
  RUNNING: { dot: 'animate-pulse bg-primary', label: 'trabalhando', variant: 'outline' },
};

/** How often a Routine hands its Job over, as a phrase. */
export const ROUTINE_CADENCE: Record<RoutineCadence, string> = {
  MONTHLY: 'todo mês',
  WEEKLY: 'toda semana',
};
