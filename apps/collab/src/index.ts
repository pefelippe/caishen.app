import { Database } from '@hocuspocus/extension-database';
import { Server } from '@hocuspocus/server';
import { resolveViewer } from '@mny/auth';
import { db, schema } from '@mny/database';
import { and, eq } from 'drizzle-orm';

const port = Number(process.env.COLLAB_PORT ?? 4001);

/** Hocuspocus document names are `note:<uuid>`. */
function noteId(documentName: string): string {
  const [kind, id] = documentName.split(':');
  if (kind !== 'note' || !id) throw new Error(`Unknown document ${documentName}`);
  return id;
}

const server = new Server({
  extensions: [
    new Database({
      fetch: async ({ documentName }) => {
        const [row] = await db
          .select({ content: schema.note.content })
          .from(schema.note)
          .where(eq(schema.note.id, noteId(documentName)));
        return row?.content ?? null;
      },
      store: async ({ documentName, state }) => {
        await db
          .update(schema.note)
          .set({ content: state })
          .where(eq(schema.note.id, noteId(documentName)));
      },
    }),
  ],
  name: 'mny-collab',
  // Only Members of the Note's Organization may open it; the session cookie comes with the upgrade.
  onAuthenticate: async ({ documentName, requestHeaders }) => {
    const viewer = await resolveViewer(requestHeaders);
    if (!viewer) throw new Error('Not authenticated');
    const [note] = await db
      .select({ id: schema.note.id })
      .from(schema.note)
      .where(
        and(
          eq(schema.note.id, noteId(documentName)),
          eq(schema.note.organizationId, viewer.organizationId)
        )
      );
    if (!note) throw new Error('Forbidden');
    return { viewer };
  },
  port,
});

await server.listen();
console.log(`🤝 collab on ws://localhost:${port}`);
