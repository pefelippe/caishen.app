/**
 * Creates a Usage code (docs/adr/0011):
 *   pnpm usage-code BEMVINDO --jobs 20 --messages 200 --max 100 --expires 2026-12-31
 */
import { db, schema } from '@zapbots/database';
import { parseArgs } from 'node:util';

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    expires: { type: 'string' },
    jobs: { default: '0', type: 'string' },
    max: { type: 'string' },
    messages: { default: '0', type: 'string' },
  },
});

const code = positionals[0]?.trim().toUpperCase();
const jobs = Number(values.jobs);
const messages = Number(values.messages);
if (!code || !Number.isInteger(jobs) || !Number.isInteger(messages) || jobs + messages <= 0) {
  console.error(
    'Uso: pnpm usage-code CODIGO --jobs N --messages N [--max N] [--expires AAAA-MM-DD]'
  );
  process.exit(1);
}

const [row] = await db
  .insert(schema.usageCode)
  .values({
    code,
    expiresAt: values.expires ? new Date(`${values.expires}T23:59:59-03:00`) : null,
    jobs,
    maxRedemptions: values.max ? Number(values.max) : null,
    messages,
  })
  .onConflictDoNothing()
  .returning();
console.log(row ? `Código ${code} criado.` : `O código ${code} já existe.`);
process.exit(0);
