import type { JobStatus } from '@zapbots/graphql/client';

/** How each Job status reads on screen. */
export const JOB_STATUS: Record<JobStatus, { label: string; variant: 'outline' | 'secondary' }> = {
  DONE: { label: 'pronto', variant: 'secondary' },
  FAILED: { label: 'falhou', variant: 'outline' },
  QUEUED: { label: 'na fila', variant: 'outline' },
  RUNNING: { label: 'trabalhando', variant: 'outline' },
};
