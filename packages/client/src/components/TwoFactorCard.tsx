import { CheckIcon, CopyIcon, ShieldCheckIcon } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import QRCode from 'react-qr-code';

import { Field } from '@zapbots/ui/blocks/field';
import { Badge } from '@zapbots/ui/components/badge';
import { Button } from '@zapbots/ui/components/button';
import { Card } from '@zapbots/ui/components/card';
import { Input } from '@zapbots/ui/components/input';

import { authClient } from '../lib/auth';
import { useI18n, type StringKey } from '../lib/i18n';
import { FormError } from './FormError';

/** Better Auth's two-factor error codes, in the User's words. */
const ERRORS: Record<string, StringKey> = {
  ACCOUNT_TEMPORARILY_LOCKED: 'twoFactor.error.locked',
  INVALID_CODE: 'twoFactor.error.code',
  INVALID_PASSWORD: 'twoFactor.error.password',
};

/** What the card is doing: at rest, asking the password for an action, or one step of turning on. */
type Mode =
  | { kind: 'idle' }
  | { action: 'disable' | 'enable' | 'regenerate'; kind: 'password' }
  | { backupCodes: string[]; kind: 'setup'; uri: string }
  | { backupCodes: string[]; kind: 'codes' };

/** The authenticator's secret, from the `otpauth://` link, for typing it in by hand. */
const secretOf = (uri: string) => new URL(uri).searchParams.get('secret') ?? '';

/**
 * Verificação em duas etapas (docs/adr/0026): after the password, a code from an authenticator app.
 * Turning it on shows a QR code, asks for the first code and hands over the recovery codes; each
 * change asks for the password again. Only for Users with a password: Google sign-in is left to
 * Google's own verification.
 */
export function TwoFactorCard() {
  const { t } = useI18n();
  const { data: session, refetch } = authClient.useSession();
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [mode, setMode] = useState<Mode>({ kind: 'idle' });
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void authClient
      .listAccounts()
      .then(({ data }) =>
        setHasPassword(Boolean(data?.some(account => account.providerId === 'credential')))
      );
  }, []);

  if (!session) return null;
  const enabled = Boolean(
    (session.user as typeof session.user & { twoFactorEnabled?: boolean | null }).twoFactorEnabled
  );

  const fail = (failure: { code?: string }, fallback: StringKey) => {
    setError(t((failure.code && ERRORS[failure.code]) || fallback));
    setPending(false);
  };

  const reset = () => {
    setMode({ kind: 'idle' });
    setPassword('');
    setCode('');
    setError(null);
    setPending(false);
    setCopied(false);
  };

  const confirmPassword = async (event: FormEvent) => {
    event.preventDefault();
    if (mode.kind !== 'password') return;
    setPending(true);
    setError(null);
    if (mode.action === 'enable') {
      const result = await authClient.twoFactor.enable({ issuer: 'Caishen', password });
      if (result.error) return fail(result.error, 'twoFactor.error.generic');
      // Without an e-mail OTP sender configured, enabling is always by authenticator app.
      if (result.data.method !== 'totp') return fail({}, 'twoFactor.error.generic');
      setMode({ backupCodes: result.data.backupCodes, kind: 'setup', uri: result.data.totpURI });
    } else if (mode.action === 'regenerate') {
      const result = await authClient.twoFactor.generateBackupCodes({ password });
      if (result.error) return fail(result.error, 'twoFactor.error.generic');
      setMode({ backupCodes: result.data.backupCodes, kind: 'codes' });
    } else {
      const result = await authClient.twoFactor.disable({ password });
      if (result.error) return fail(result.error, 'twoFactor.error.generic');
      await refetch();
      reset();
    }
    setPassword('');
    setPending(false);
  };

  const confirmCode = async (event: FormEvent) => {
    event.preventDefault();
    if (mode.kind !== 'setup') return;
    setPending(true);
    setError(null);
    const result = await authClient.twoFactor.verifyTotp({ code: code.replace(/\s/g, '') });
    if (result.error) return fail(result.error, 'twoFactor.error.code');
    setCode('');
    setPending(false);
    setMode({ backupCodes: mode.backupCodes, kind: 'codes' });
  };

  const copyCodes = async (codes: string[]) => {
    await navigator.clipboard.writeText(codes.join('\n')).catch(() => null);
    setCopied(true);
  };

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3">
        <ShieldCheckIcon className="size-5 text-primary" />
        <h2 className="text-lg font-semibold">{t('twoFactor.title')}</h2>
        {enabled && <Badge variant="secondary">{t('twoFactor.on')}</Badge>}
      </div>
      <p className="max-w-prose text-muted-foreground">{t('twoFactor.body')}</p>

      {mode.kind === 'idle' &&
        (hasPassword === false ? (
          <p className="max-w-prose text-sm text-muted-foreground">{t('twoFactor.noPassword')}</p>
        ) : enabled ? (
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={hasPassword === null}
              onClick={() => setMode({ action: 'regenerate', kind: 'password' })}
              variant="outline"
            >
              {t('twoFactor.regenerate')}
            </Button>
            <Button
              disabled={hasPassword === null}
              onClick={() => setMode({ action: 'disable', kind: 'password' })}
              variant="ghost"
            >
              {t('twoFactor.disable')}
            </Button>
          </div>
        ) : (
          <Button
            className="self-start"
            disabled={hasPassword === null}
            onClick={() => setMode({ action: 'enable', kind: 'password' })}
          >
            {t('twoFactor.enable')}
          </Button>
        ))}

      {mode.kind === 'password' && (
        <form
          className="flex max-w-sm flex-col gap-4"
          onSubmit={event => void confirmPassword(event)}
        >
          <Field hint={t('twoFactor.passwordHint')} label={t('twoFactor.password')}>
            <Input
              autoComplete="current-password"
              autoFocus
              onChange={event => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </Field>
          <div className="flex gap-2">
            <Button
              disabled={pending || !password}
              type="submit"
              variant={mode.action === 'disable' ? 'destructive' : 'default'}
            >
              {t(mode.action === 'disable' ? 'twoFactor.disable' : 'common.continue')}
            </Button>
            <Button onClick={reset} type="button" variant="ghost">
              {t('common.cancel')}
            </Button>
          </div>
        </form>
      )}

      {mode.kind === 'setup' && (
        <form
          className="grid gap-6 sm:grid-cols-[auto_minmax(0,1fr)]"
          onSubmit={event => void confirmCode(event)}
        >
          <div className="self-start rounded-xl bg-white p-3">
            <QRCode size={168} title={t('twoFactor.qr')} value={mode.uri} />
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            <p>{t('twoFactor.scan')}</p>
            <p className="text-sm text-muted-foreground">
              {t('twoFactor.manual')}{' '}
              <span className="font-medium break-all text-foreground">{secretOf(mode.uri)}</span>
            </p>
            <Field label={t('twoFactor.code')}>
              <Input
                autoComplete="one-time-code"
                autoFocus
                className="max-w-40 tracking-widest"
                inputMode="numeric"
                maxLength={7}
                onChange={event => setCode(event.target.value)}
                placeholder="000000"
                required
                value={code}
              />
            </Field>
            <div className="flex gap-2">
              <Button disabled={pending || !code.trim()} type="submit">
                {t('twoFactor.confirm')}
              </Button>
              <Button onClick={reset} type="button" variant="ghost">
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        </form>
      )}

      {mode.kind === 'codes' && (
        <div className="flex flex-col gap-4">
          <p className="max-w-prose">{t('twoFactor.codes')}</p>
          <ul className="grid max-w-md grid-cols-2 gap-2 rounded-xl bg-muted p-4 font-medium tabular-nums">
            {mode.backupCodes.map(backup => (
              <li key={backup}>{backup}</li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Button onClick={() => void copyCodes(mode.backupCodes)} variant="outline">
              {copied ? <CheckIcon /> : <CopyIcon />}
              {t(copied ? 'twoFactor.copied' : 'twoFactor.copy')}
            </Button>
            <Button
              onClick={() => {
                void refetch();
                reset();
              }}
            >
              {t('twoFactor.done')}
            </Button>
          </div>
        </div>
      )}

      {error && <FormError message={error} />}
    </Card>
  );
}
