import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { migrate } from 'drizzle-orm/node-postgres/migrator';

import { closeDb, db } from './client';

const migrationsFolder = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../drizzle');

await migrate(db, { migrationsFolder });
await closeDb();
console.log('Migrations applied ✅');
