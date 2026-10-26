import { createHmac } from 'node:crypto';

import { auth } from '@zapbots/auth';
import { closeDb } from '@zapbots/database';
import { afterAll, describe, expect, it } from 'vitest';

afterAll(async () => {
  await closeDb();
});

const ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';

/** A browser talking to Better Auth's own handler, keeping its cookies. */
function browser() {
  const cookies = new Map<string, string>();
  return async (path: string, body?: unknown) => {
    const response = await auth.handler(
      new Request(`${ORIGIN}/api/auth${path}`, {
        body: body === undefined ? undefined : JSON.stringify(body),
        headers: {
          'content-type': 'application/json',
          cookie: [...cookies].map(([name, value]) => `${name}=${value}`).join('; '),
          origin: ORIGIN,
        },
        method: body === undefined ? 'GET' : 'POST',
      })
    );
    for (const line of response.headers.getSetCookie()) {
      const [pair] = line.split(';');
      const [name, ...value] = pair!.split('=');
      if (/max-age=0/i.test(line)) cookies.delete(name!);
      else cookies.set(name!, value.join('='));
    }
    const text = await response.text();
    return { body: text ? JSON.parse(text) : null, status: response.status };
  };
}

/** The current 6-digit code for a base32 secret, as an authenticator app works it out (RFC 6238). */
function totp(base32: string) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const char of base32.replace(/=+$/, '').toUpperCase()) {
    bits += alphabet.indexOf(char).toString(2).padStart(5, '0');
  }
  const key = Buffer.from(bits.match(/.{8}/g)!.map(byte => parseInt(byte, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30_000)));
  const hmac = createHmac('sha1', key).update(counter).digest();
  const offset = hmac[hmac.length - 1]! & 0xf;
  return String((hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, '0');
}

describe('two-step verification', () => {
  it('asks for the app code after the password once it is on', async () => {
    const email = `${crypto.randomUUID()}@test.local`;
    const password = 'senha-forte-123';
    const owner = browser();
    expect((await owner('/sign-up/email', { email, name: 'Ana', password })).status).toBe(200);

    const enabled = await owner('/two-factor/enable', { password });
    const secret = new URL(enabled.body.totpURI).searchParams.get('secret')!;
    expect(enabled.body.backupCodes).toHaveLength(10);
    expect(new URL(enabled.body.totpURI).searchParams.get('issuer')).toBe('Caishen');
    // Nothing changes until the first code proves the app has it.
    expect((await owner('/get-session')).body.user.twoFactorEnabled).toBe(false);
    expect((await owner('/two-factor/verify-totp', { code: totp(secret) })).status).toBe(200);
    expect((await owner('/get-session')).body.user.twoFactorEnabled).toBe(true);

    // A new browser: the password alone gives no session.
    const visitor = browser();
    const signIn = await visitor('/sign-in/email', { email, password });
    expect(signIn.body).toMatchObject({ twoFactorRedirect: true, twoFactorMethods: ['totp'] });
    expect((await visitor('/get-session')).body).toBeNull();

    const wrong = await visitor('/two-factor/verify-totp', { code: '000000' });
    expect(wrong.body.code).toBe('INVALID_CODE');
    expect((await visitor('/two-factor/verify-totp', { code: totp(secret) })).status).toBe(200);
    expect((await visitor('/get-session')).body.user.email).toBe(email);
  });

  it('lets a recovery code in once', async () => {
    const email = `${crypto.randomUUID()}@test.local`;
    const password = 'senha-forte-123';
    const owner = browser();
    await owner('/sign-up/email', { email, name: 'Bia', password });
    const enabled = await owner('/two-factor/enable', { password });
    const secret = new URL(enabled.body.totpURI).searchParams.get('secret')!;
    await owner('/two-factor/verify-totp', { code: totp(secret) });
    const [backup] = enabled.body.backupCodes as string[];

    const first = browser();
    await first('/sign-in/email', { email, password });
    expect((await first('/two-factor/verify-backup-code', { code: backup })).status).toBe(200);

    const second = browser();
    await second('/sign-in/email', { email, password });
    const reused = await second('/two-factor/verify-backup-code', { code: backup });
    expect(reused.body.code).toBe('INVALID_BACKUP_CODE');
  });
});
