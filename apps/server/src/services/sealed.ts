import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';

/**
 * Secrets pasted on Integrações (AI keys, the addresses of outside calendars, Spotify's refresh tokens), sealed with
 * AES-256-GCM under a key derived from `BETTER_AUTH_SECRET`, one per `purpose`; changing that
 * secret loses them. The purpose is part of the derivation: never rename one in use.
 */
export type SealPurpose = 'ai-key' | 'calendar-url' | 'spotify-token';

function sealingKey(purpose: SealPurpose): Buffer {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error('BETTER_AUTH_SECRET is not set');
  return Buffer.from(hkdfSync('sha256', secret, 'zapbots', purpose, 32));
}

/** `iv.tag.ciphertext`, each in base64url. */
export function seal(plain: string, purpose: SealPurpose): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', sealingKey(purpose), iv);
  const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), body].map(part => part.toString('base64url')).join('.');
}

/** Throws when sealed under another secret or purpose. */
export function open(sealed: string, purpose: SealPurpose): string {
  const [iv, tag, body] = sealed.split('.').map(part => Buffer.from(part, 'base64url'));
  const decipher = createDecipheriv('aes-256-gcm', sealingKey(purpose), iv!);
  decipher.setAuthTag(tag!);
  return Buffer.concat([decipher.update(body!), decipher.final()]).toString('utf8');
}
