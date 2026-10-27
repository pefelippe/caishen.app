import type { Viewer } from '@zapbots/auth';
import { db, schema } from '@zapbots/database';
import { dateIn, isIsoDate, parseRepeat, parseTime, type Repeat } from '@zapbots/personal';
import { eq } from 'drizzle-orm';

import { badInput } from '../../resolvers/guards';

/** The Viewer's time zone, chosen in Perfil; Tarefas and Eventos are read on its clock. */
export async function viewerTimeZone(viewer: Viewer): Promise<string> {
  const [row] = await db
    .select({ timezone: schema.user.timezone })
    .from(schema.user)
    .where(eq(schema.user.id, viewer.userId));
  return row?.timezone ?? 'America/Sao_Paulo';
}

/** Today on the Viewer's clock. */
export async function viewerToday(viewer: Viewer): Promise<string> {
  return dateIn(await viewerTimeZone(viewer));
}

/** Checks for the fields Pessoal shares; each throws a message the User reads. */
export function text(value: null | string | undefined, what: string, max: number): string {
  const trimmed = (value ?? '').trim();
  if (trimmed.length > max) badInput(`${what} pode ter até ${max} caracteres.`);
  return trimmed;
}

export function title(value: null | string | undefined, what = 'O título'): string {
  const trimmed = text(value, what, 200);
  if (!trimmed) badInput(`${what} não pode ficar vazio.`);
  return trimmed;
}

export function day(value: null | string | undefined, what = 'A data'): null | string {
  if (!value) return null;
  if (!isIsoDate(value)) badInput(`${what} não é uma data válida.`);
  return value;
}

export function time(value: null | string | undefined, what = 'A hora'): null | string {
  if (!value) return null;
  const parsed = parseTime(value);
  if (!parsed) badInput(`${what} não é uma hora válida (ex.: 09:30).`);
  return parsed;
}

export function repeat(value: unknown): null | Repeat {
  if (value === null || value === undefined) return null;
  const parsed = parseRepeat(value);
  if (!parsed) badInput('A repetição não é válida.');
  return parsed;
}
