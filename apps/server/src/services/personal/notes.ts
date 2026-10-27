import type { Viewer } from '@zapbots/auth';
import { db, schema, type NoteRow } from '@zapbots/database';
import { and, desc, ilike, or } from 'drizzle-orm';

import { badInput, notFound, owned } from '../../resolvers/guards';
import { text } from './clock';

export interface NoteInput {
  body?: null | string;
  pinned?: boolean | null;
  title?: null | string;
}

/** At most this many Notas come back for one search. */
const SHOWN = 200;

function noteValues(input: NoteInput) {
  const values: Partial<Pick<NoteRow, 'body' | 'pinned' | 'title'>> = {};
  if (input.title !== undefined) values.title = text(input.title, 'O título', 200);
  if (input.body !== undefined) values.body = text(input.body, 'A Nota', 100_000);
  if (input.pinned !== undefined && input.pinned !== null) values.pinned = input.pinned;
  return values;
}

export async function findNote(viewer: Viewer, id: string): Promise<NoteRow> {
  const [row] = await db
    .select()
    .from(schema.note)
    .where(owned(schema.note, viewer, id));
  return row ?? notFound('Nota');
}

export async function createNote(viewer: Viewer, input: NoteInput): Promise<NoteRow> {
  const values = noteValues(input);
  if (!values.title && !values.body) badInput('Escreva um título ou um texto.');
  const [row] = await db
    .insert(schema.note)
    .values({ ...values, createdById: viewer.userId, organizationId: viewer.organizationId })
    .returning();
  return row!;
}

/** Changes only the fields given, so saving the text as it is typed leaves the pin alone. */
export async function updateNote(viewer: Viewer, id: string, input: NoteInput): Promise<NoteRow> {
  await findNote(viewer, id);
  const [row] = await db
    .update(schema.note)
    .set(noteValues(input))
    .where(owned(schema.note, viewer, id))
    .returning();
  return row!;
}

export async function deleteNote(viewer: Viewer, id: string): Promise<boolean> {
  const deleted = await db
    .delete(schema.note)
    .where(owned(schema.note, viewer, id))
    .returning({ id: schema.note.id });
  return deleted.length > 0;
}

/** The Notas, pinned first, then the last changed; with `search`, those whose title or text has it. */
export function listNotes(
  viewer: Viewer,
  { pinned, search }: { pinned?: boolean | null; search?: null | string }
): Promise<NoteRow[]> {
  const term = search?.trim();
  // `%` and `_` typed by the User are searched for as they are.
  const pattern = term ? `%${term.replace(/[\\%_]/g, char => `\\${char}`)}%` : null;
  return db
    .select()
    .from(schema.note)
    .where(
      and(
        owned(schema.note, viewer),
        pinned ? schema.note.pinned : undefined,
        pattern
          ? or(ilike(schema.note.title, pattern), ilike(schema.note.body, pattern))
          : undefined
      )
    )
    .orderBy(desc(schema.note.pinned), desc(schema.note.updatedAt))
    .limit(SHOWN);
}
