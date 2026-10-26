import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';

import { PROVIDERS, type ProviderKeys, type ProviderName } from '@zapbots/ai';
import type { Viewer } from '@zapbots/auth';
import { db, schema } from '@zapbots/database';
import { and, eq } from 'drizzle-orm';

/**
 * Each Organization's keys to the Model providers, pasted on Integrações (docs/adr/0022). Sealed
 * with AES-256-GCM under a key derived from `BETTER_AUTH_SECRET`; changing that secret loses them.
 */
type ProviderColumn = (typeof schema.aiProvider.enumValues)[number];

const MIN_KEY = 8;
const MAX_KEY = 512;

const toProvider = (column: ProviderColumn) => column.toLowerCase() as ProviderName;
const toColumn = (provider: ProviderName) => provider.toUpperCase() as ProviderColumn;

/** A failure the User should read as-is (pt-BR). */
export class AiKeyError extends Error {}

function sealingKey(): Buffer {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error('BETTER_AUTH_SECRET is not set');
  return Buffer.from(hkdfSync('sha256', secret, 'zapbots', 'ai-key', 32));
}

export function seal(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', sealingKey(), iv);
  const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), body].map(part => part.toString('base64url')).join('.');
}

function open(sealed: string): string {
  const [iv, tag, body] = sealed.split('.').map(part => Buffer.from(part, 'base64url'));
  const decipher = createDecipheriv('aes-256-gcm', sealingKey(), iv!);
  decipher.setAuthTag(tag!);
  return Buffer.concat([decipher.update(body!), decipher.final()]).toString('utf8');
}

/** The Organization's keys, opened, one per provider that has one. */
export async function organizationKeys(organizationId: string): Promise<ProviderKeys> {
  const rows = await db
    .select({ ciphertext: schema.aiKey.ciphertext, provider: schema.aiKey.provider })
    .from(schema.aiKey)
    .where(eq(schema.aiKey.organizationId, organizationId));
  const keys: ProviderKeys = {};
  for (const row of rows) {
    try {
      keys[toProvider(row.provider)] = open(row.ciphertext);
    } catch {
      // Sealed under another BETTER_AUTH_SECRET: as good as missing until pasted again.
    }
  }
  return keys;
}

/** What the Integrações page shows of each saved key: never the key itself. */
export async function aiKeys(viewer: Viewer) {
  const rows = await db
    .select()
    .from(schema.aiKey)
    .where(eq(schema.aiKey.organizationId, viewer.organizationId));
  return rows.map(row => ({
    label: PROVIDERS[toProvider(row.provider)].label,
    last4: row.last4,
    provider: row.provider,
    updatedAt: row.updatedAt,
  }));
}

/** Saves or replaces the Organization's key to `provider`; the caller checks the Viewer is an admin. */
export async function saveAiKey(viewer: Viewer, provider: ProviderName, raw: string) {
  const key = raw.trim();
  if (key.length < MIN_KEY || key.length > MAX_KEY || /\s/.test(key)) {
    throw new AiKeyError(`Cole a chave do ${PROVIDERS[provider].label} inteira, sem espaços.`);
  }
  const values = { ciphertext: seal(key), last4: key.slice(-4) };
  await db
    .insert(schema.aiKey)
    .values({ ...values, organizationId: viewer.organizationId, provider: toColumn(provider) })
    .onConflictDoUpdate({
      set: { ...values, updatedAt: new Date() },
      target: [schema.aiKey.organizationId, schema.aiKey.provider],
    });
}

export async function removeAiKey(viewer: Viewer, provider: ProviderName): Promise<boolean> {
  const deleted = await db
    .delete(schema.aiKey)
    .where(
      and(
        eq(schema.aiKey.organizationId, viewer.organizationId),
        eq(schema.aiKey.provider, toColumn(provider))
      )
    )
    .returning({ id: schema.aiKey.id });
  return deleted.length > 0;
}
