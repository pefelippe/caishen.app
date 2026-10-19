import { type FormEvent, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { FormError } from '../components/FormError';
import { authClient } from '../lib/auth';

/** Where the sign-in link goes: by email, back to this page (local server, no email set up) or
 * only to the server console. */
type Methods = { google: boolean; link: 'console' | 'email' | 'page' };

/** Errors Better Auth puts in `?error=` when an email link cannot be used. */
const LINK_ERRORS: Record<string, string> = {
  EXPIRED_TOKEN: 'O link expirou. Peça um novo.',
  INVALID_TOKEN: 'O link é inválido ou já foi usado. Peça um novo.',
};

/**
 * Two ways in, no password: a sign-in link sent by email, and Google when the server has its
 * OAuth client. The first sign-in creates the User.
 */
export function LoginPage() {
  const [searchParams] = useSearchParams();
  const linkError = searchParams.get('error');
  const [error, setError] = useState<string | null>(
    linkError ? (LINK_ERRORS[linkError] ?? 'Não foi possível entrar com o link.') : null
  );
  const [pending, setPending] = useState(false);
  const [methods, setMethods] = useState<Methods>({ google: false, link: 'email' });
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [localLink, setLocalLink] = useState<string | null>(null);

  useEffect(() => {
    void authClient
      .$fetch<Methods>('/sign-in-methods', { method: 'GET' })
      .then(({ data }) => data && setMethods(data));
  }, []);

  const sendLink = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setPending(true);
    const result = await authClient.signIn.magicLink({
      callbackURL: window.location.origin,
      email: email.trim(),
      errorCallbackURL: `${window.location.origin}/sign-in`,
    });
    if (result.error) {
      setError(result.error.message ?? 'Não foi possível enviar o link');
      setPending(false);
      return;
    }
    if (methods.link === 'page') {
      const { data } = await authClient.$fetch<{ url: string | null }>('/sign-in/local-link', {
        body: { email: email.trim() },
        method: 'POST',
      });
      setLocalLink(data?.url ?? null);
    }
    setPending(false);
    setSentTo(email.trim());
  };

  const signInWithGoogle = async () => {
    setError(null);
    setPending(true);
    const result = await authClient.signIn.social({
      callbackURL: window.location.origin,
      provider: 'google',
    });
    // On success the browser is already redirecting to Google.
    if (result.error) {
      setError(result.error.message ?? 'Não foi possível entrar');
      setPending(false);
    }
  };

  return (
    <main className="grid min-h-svh place-items-center px-4 py-12">
      <div className="page-enter flex w-full max-w-md flex-col gap-12">
        <h1 className="text-center font-serif text-[clamp(4.5rem,14vw,8.5rem)] leading-[0.9] font-normal tracking-[-0.04em] italic">
          Caishen
        </h1>
        <div className="flex flex-col gap-3">
          {sentTo ? (
            <div className="flex flex-col gap-3 text-center">
              {methods.link === 'email' ? (
                <p className="text-base">
                  Enviamos um link para <span className="font-medium">{sentTo}</span>. Abra o e-mail
                  neste navegador para entrar; o link vale por 15 minutos.
                </p>
              ) : (
                <p className="text-base">
                  Este servidor não envia e-mails (falta <code>RESEND_API_KEY</code>). O link para{' '}
                  <span className="font-medium">{sentTo}</span> está no terminal do servidor
                  {localLink ? ', ou abra-o aqui.' : '.'}
                </p>
              )}
              {localLink && (
                <Button asChild className="h-12 text-base" size="lg">
                  <a href={localLink}>Entrar como {sentTo}</a>
                </Button>
              )}
              <Button
                className="self-center px-0"
                onClick={() => {
                  setSentTo(null);
                  setLocalLink(null);
                }}
                variant="link"
              >
                Usar outro e-mail
              </Button>
            </div>
          ) : (
            <form className="flex flex-col gap-3" onSubmit={event => void sendLink(event)}>
              <div>
                <Label className="sr-only" htmlFor="email">
                  E-mail
                </Label>
                <Input
                  autoComplete="email"
                  autoFocus
                  className="h-12 px-4 text-base shadow-none md:text-base"
                  id="email"
                  onChange={event => setEmail(event.target.value)}
                  placeholder="seu@email.com"
                  required
                  type="email"
                  value={email}
                />
              </div>
              <Button className="h-12 text-base" disabled={pending} size="lg" type="submit">
                {pending ? 'Enviando…' : 'Receber link de acesso'}
              </Button>
            </form>
          )}
          {methods.google && (
            <>
              <p className="text-center text-sm text-muted-foreground">ou</p>
              <Button
                className="h-12 text-base"
                disabled={pending}
                onClick={() => void signInWithGoogle()}
                size="lg"
                variant="secondary"
              >
                <GoogleIcon />
                Entrar com Google
              </Button>
            </>
          )}
          {error && <FormError message={error} />}
        </div>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.96 10.96 0 0 0 12 1 11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
        fill="#EA4335"
      />
    </svg>
  );
}
