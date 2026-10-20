import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import type { TestProject } from 'vitest/node';

const migrationsFolder = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../packages/database/drizzle'
);

/** Creates the test database when missing and brings it up to the latest migration. */
export default async function setup(project: TestProject) {
  // `test.env` reaches the test files, not this process, so read it from the config.
  const url = new URL(project.config.env.DATABASE_URL!);
  const database = url.pathname.slice(1);
  if (!database.endsWith('_test')) {
    throw new Error(`Refusing to run tests against "${database}": the name must end in _test`);
  }

  const admin = new pg.Client({ connectionString: new URL('/postgres', url).toString() });
  try {
    await admin.connect();
  } catch (cause) {
    throw new Error('Tests need Postgres: run `pnpm infra:up` first.', { cause });
  }
  const existing = await admin.query('select 1 from pg_database where datname = $1', [database]);
  if (!existing.rowCount) await admin.query(`create database "${database}"`);
  await admin.end();

  const pool = new pg.Pool({ connectionString: url.toString() });
  await migrate(drizzle(pool), { migrationsFolder });
  await pool.end();
}
