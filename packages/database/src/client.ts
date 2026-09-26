import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';

import * as schema from './schema';

export type Database = NodePgDatabase<typeof schema>;

let instance: { db: Database; pool: pg.Pool } | undefined;

function connect() {
  if (!instance) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL is not set');
    const pool = new pg.Pool({ connectionString });
    instance = { db: drizzle(pool, { schema }), pool };
  }
  return instance;
}

/** Lazily connected so importing the schema never needs a database. */
export const db: Database = new Proxy({} as Database, {
  get: (_, property) => Reflect.get(connect().db, property),
});

export async function closeDb() {
  await instance?.pool.end();
  instance = undefined;
}
