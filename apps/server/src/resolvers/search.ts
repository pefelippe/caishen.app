import { db, schema } from '@mny/database';
import type { Resolvers, SearchHit } from '@mny/graphql/server';
import { and, desc, eq } from 'drizzle-orm';

import { noteContentToText } from '../services/noteContent';
import { viewerHolder } from '../services/viewerHolder';
import { owned, requireViewer } from './guards';

const PER_KIND = 8;
/** Most recent rows read per table. One person's data is small, so matching happens here. */
const SCANNED = 500;

const day = (iso: string) => iso.split('-').reverse().join('/');

/**
 * Lower case without accents, so "orcamento" finds "Orçamento". Done in code because Postgres'
 * ILIKE only folds accented letters under some collations.
 */
const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/** The text around the first match, for a Note found by its content. */
function excerpt(text: string, wanted: string): string {
  const at = fold(text).indexOf(wanted);
  const start = Math.max(0, at - 40);
  const end = at + wanted.length + 60;
  const piece = text.slice(start, end).replace(/\s+/g, ' ');
  return `${start > 0 ? '…' : ''}${piece}${end < text.length ? '…' : ''}`;
}

export const searchResolvers: Resolvers = {
  Query: {
    search: async (_, { term }, context) => {
      const viewer = requireViewer(context);
      const wanted = fold(term.trim());
      if (wanted.length < 2) return [];
      const matches = (...texts: (string | null)[]) =>
        texts.some(text => text != null && fold(text).includes(wanted));

      // Finanças shows only the Viewer's own Holder (docs/adr/0007); so does the search.
      const holder = await viewerHolder(viewer);

      const [tasks, notes, operations, cards, workouts] = await Promise.all([
        db
          .select()
          .from(schema.task)
          .where(owned(schema.task, viewer))
          .orderBy(desc(schema.task.updatedAt))
          .limit(SCANNED),
        db
          .select()
          .from(schema.note)
          .where(owned(schema.note, viewer))
          .orderBy(desc(schema.note.updatedAt))
          .limit(SCANNED),
        db
          .select()
          .from(schema.creditOperation)
          .where(
            and(
              owned(schema.creditOperation, viewer),
              eq(schema.creditOperation.holderId, holder.id)
            )
          ),
        db
          .select()
          .from(schema.creditCard)
          .where(and(owned(schema.creditCard, viewer), eq(schema.creditCard.holderId, holder.id))),
        db
          .select()
          .from(schema.workout)
          .where(owned(schema.workout, viewer))
          .orderBy(desc(schema.workout.date))
          .limit(SCANNED),
      ]);

      const noteHits = notes.flatMap((note): SearchHit[] => {
        const text = noteContentToText(note.content);
        if (!matches(note.title, text)) return [];
        return [
          {
            area: 'NOTES',
            detail: matches(text) ? excerpt(text, wanted) : null,
            id: note.id,
            kind: 'NOTE',
            title: note.title,
          },
        ];
      });

      const groups: SearchHit[][] = [
        tasks
          .filter(task => matches(task.title))
          .map(task => ({
            area: 'WORK',
            detail: task.dueOn ? `Prazo ${day(task.dueOn)}` : null,
            id: task.id,
            kind: 'TASK',
            title: task.title,
          })),
        noteHits,
        operations
          .filter(operation => matches(operation.name, operation.lender))
          .map(operation => ({
            area: 'FINANCE',
            detail: operation.lender,
            id: operation.id,
            kind: 'CREDIT_OPERATION',
            title: operation.name,
          })),
        cards
          .filter(card => matches(card.name, card.issuer))
          .map(card => ({
            area: 'FINANCE',
            detail: card.issuer,
            id: card.id,
            kind: 'CREDIT_CARD',
            title: card.name,
          })),
        workouts
          .filter(workout => matches(workout.kind, workout.notes))
          .map(workout => ({
            area: 'FITNESS',
            detail: `${day(workout.date)} · ${workout.durationMinutes} min${workout.notes ? ` · ${workout.notes}` : ''}`,
            id: workout.id,
            kind: 'WORKOUT',
            title: workout.kind,
          })),
      ];
      return groups.flatMap(group => group.slice(0, PER_KIND));
    },
  },
};
