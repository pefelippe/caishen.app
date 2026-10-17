import { db, schema, type BotRow } from '@zapbots/database';
import { CAISHEN } from '@zapbots/finance';
import { eq } from 'drizzle-orm';

export type BotKey = BotRow['key'];

interface CatalogEntry {
  description: string;
  name: string;
  personality: string;
}

/** Every Bot zapbots offers. Name and personality are fixed; a new Bot is a new entry here. */
export const CATALOG: Record<BotKey, CatalogEntry> = {
  FINANCE: CAISHEN,
};

const ORDER: BotKey[] = ['FINANCE'];

/** The Organization's team: every Bot of the catalog, created on first use. */
export async function ensureBots(organizationId: string): Promise<BotRow[]> {
  await db
    .insert(schema.bot)
    .values(ORDER.map(key => ({ key, organizationId })))
    .onConflictDoNothing();
  const rows = await db
    .select()
    .from(schema.bot)
    .where(eq(schema.bot.organizationId, organizationId));
  return rows.sort((a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key));
}
