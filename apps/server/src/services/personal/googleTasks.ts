import type { Viewer } from '@zapbots/auth';
import { db, schema } from '@zapbots/database';
import { and, eq, isNull } from 'drizzle-orm';

import { badInput } from '../../resolvers/guards';
import { googleAccessToken, googleConfigured, googleGranted } from '../google';

/** Read only: zapbots never writes to the User's Google Tarefas (docs/adr/0009). */
export const TASKS_SCOPE = 'https://www.googleapis.com/auth/tasks.readonly';

const API = 'https://tasks.googleapis.com/tasks/v1';
const KIND = 'google-tasks';
/** Enough for anyone's lists; a read stops there. */
const MAX_LISTS = 20;
const MAX_PAGES = 10;

interface GoogleList {
  id: string;
  title?: string;
}

interface GoogleTask {
  completed?: string;
  deleted?: boolean;
  /** RFC 3339, but only its date means anything. */
  due?: string;
  id: string;
  notes?: string;
  status?: 'completed' | 'needsAction';
  title?: string;
}

class GoogleTasksError extends Error {}

async function getAll<T>(token: string, url: string): Promise<T[]> {
  const items: T[] = [];
  let pageToken: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const next = new URL(url);
    next.searchParams.set('maxResults', '100');
    if (pageToken) next.searchParams.set('pageToken', pageToken);
    const response = await fetch(next, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15_000),
    });
    if (response.status === 401 || response.status === 403) {
      throw new GoogleTasksError('O Google não liberou as Tarefas. Conecte de novo.');
    }
    if (!response.ok)
      throw new GoogleTasksError('O Google Tarefas não respondeu. Tente mais tarde.');
    const body = (await response.json()) as { items?: T[]; nextPageToken?: string };
    items.push(...(body.items ?? []));
    pageToken = body.nextPageToken;
    if (!pageToken) break;
  }
  return items;
}

/** When the Viewer's Google Tarefas were last read, and why not if the last read failed. */
export async function googleTasksSync(viewer: Viewer) {
  const [row] = await db
    .select({
      error: schema.integrationSync.error,
      lastSyncedAt: schema.integrationSync.lastSyncedAt,
    })
    .from(schema.integrationSync)
    .where(
      and(eq(schema.integrationSync.userId, viewer.userId), eq(schema.integrationSync.kind, KIND))
    );
  return row ?? null;
}

async function recordSync(viewer: Viewer, error: null | string) {
  const values = error ? { error } : { error: null, lastSyncedAt: new Date() };
  await db
    .insert(schema.integrationSync)
    .values({ kind: KIND, organizationId: viewer.organizationId, userId: viewer.userId, ...values })
    .onConflictDoUpdate({
      set: values,
      target: [schema.integrationSync.userId, schema.integrationSync.kind],
    });
}

export const googleTasksConnected = (viewer: Viewer) => googleGranted(viewer.userId, TASKS_SCOPE);

/**
 * Copies the Viewer's Google Tarefas into Tarefas, one Lista per Google list, one way: new open
 * ones come in, the ones already here follow their title, notes and day there and are done when
 * done there (never opened again), and those deleted there go. Done ones from before are left
 * out. Nothing is written to Google.
 */
export async function syncGoogleTasks(viewer: Viewer) {
  if (!googleConfigured()) badInput('O servidor está sem as credenciais do Google.');
  if (!(await googleTasksConnected(viewer))) badInput('Conecte o Google Tarefas primeiro.');
  const token = await googleAccessToken(viewer.userId);
  if (!token) badInput('O Google não liberou as Tarefas. Conecte de novo.');

  let lists: GoogleList[];
  const tasksByList = new Map<string, GoogleTask[]>();
  try {
    lists = (await getAll<GoogleList>(token, `${API}/users/@me/lists`)).slice(0, MAX_LISTS);
    for (const list of lists) {
      const url = new URL(`${API}/lists/${encodeURIComponent(list.id)}/tasks`);
      url.searchParams.set('showCompleted', 'true');
      url.searchParams.set('showHidden', 'true');
      url.searchParams.set('showDeleted', 'true');
      tasksByList.set(list.id, await getAll<GoogleTask>(token, url.toString()));
    }
  } catch (error) {
    if (error instanceof GoogleTasksError) {
      await recordSync(viewer, error.message);
      badInput(error.message);
    }
    throw error;
  }

  const counts = { added: 0, done: 0, removed: 0, updated: 0 };
  const { organizationId, userId } = viewer;
  await db.transaction(async tx => {
    for (const list of lists) {
      const name = (list.title ?? '').trim().slice(0, 80) || 'Google Tarefas';
      const [saved] = await tx
        .insert(schema.taskList)
        .values({ createdById: userId, externalId: `google:${list.id}`, name, organizationId })
        .onConflictDoUpdate({
          set: { name },
          target: [schema.taskList.organizationId, schema.taskList.externalId],
        })
        .returning({ id: schema.taskList.id });

      for (const item of tasksByList.get(list.id) ?? []) {
        const externalId = `google:${item.id}`;
        const [existing] = await tx
          .select({ doneAt: schema.task.doneAt, id: schema.task.id })
          .from(schema.task)
          .where(
            and(
              eq(schema.task.organizationId, organizationId),
              eq(schema.task.externalId, externalId)
            )
          );
        const title = (item.title ?? '').trim().slice(0, 200);
        if (item.deleted || !title) {
          if (existing) {
            await tx.delete(schema.task).where(eq(schema.task.id, existing.id));
            counts.removed++;
          }
          continue;
        }
        const completed = item.status === 'completed';
        const values = {
          dueOn: item.due && /^\d{4}-\d{2}-\d{2}/.test(item.due) ? item.due.slice(0, 10) : null,
          listId: saved!.id,
          notes: (item.notes ?? '').slice(0, 5_000),
          title,
        };
        if (!existing) {
          if (completed) continue;
          await tx.insert(schema.task).values({
            ...values,
            createdById: userId,
            externalId,
            organizationId,
          });
          counts.added++;
          continue;
        }
        await tx.update(schema.task).set(values).where(eq(schema.task.id, existing.id));
        counts.updated++;
        if (completed && !existing.doneAt) {
          await tx
            .update(schema.task)
            .set({ doneAt: item.completed ? new Date(item.completed) : new Date() })
            .where(and(eq(schema.task.id, existing.id), isNull(schema.task.doneAt)));
          counts.done++;
        }
      }
    }
  });
  await recordSync(viewer, null);
  return { ...counts, lastSyncedAt: new Date() };
}
