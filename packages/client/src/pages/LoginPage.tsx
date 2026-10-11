import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

import { BuddyGlyph } from '../components/BuddyGlyph';
import { FormError } from '../components/FormError';
import { authClient } from '../lib/auth';

const BUDDIES = ['GENERAL', 'FINANCE', 'NOTES', 'WORK', 'FITNESS'] as const;

/**
 * Google is the only way in; the first sign-in creates the User. When the server runs with
 * DEMO_MODE, a second button signs in as the shared, mocked demo User.
 */
export function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [demoEnabled, setDemoEnabled] = useState(false);

  useEffect(() => {
    void authClient
      .$fetch<{ enabled: boolean }>('/demo', { method: 'GET' })
      .then(({ data }) => setDemoEnabled(Boolean(data?.enabled)));
  }, []);

  const signIn = async () => {
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

  const signInAsDemo = async () => {
    setError(null);
    setPending(true);
    const { error: demoError } = await authClient.$fetch('/demo/sign-in', { method: 'POST' });
    if (demoError) {
      setError(demoError.message ?? 'Não foi possível entrar na demo');
      setPending(false);
    } else window.location.reload();
  };

  return (
    <div className="grid min-h-svh place-items-center p-6">
      <div className="flex w-full max-w-sm flex-col gap-8">
        <div className="flex flex-col gap-3">
          <div className="flex gap-1.5">
            {BUDDIES.map(area => (
              <BuddyGlyph area={area} key={area} size={34} />
            ))}
          </div>
          <span className="font-serif text-6xl leading-none tracking-tight italic">mny</span>
          <p className="text-base text-muted-foreground">
            Finanças, anotações, trabalho e treinos num lugar só, cada um com seu Buddy.
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col gap-3">
            <Button disabled={pending} onClick={() => void signIn()} size="lg" variant="outline">
              <GoogleIcon />
              {pending ? 'Redirecionando…' : 'Entrar com Google'}
            </Button>
            {demoEnabled && (
              <>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Separator className="flex-1" />
                  ou
                  <Separator className="flex-1" />
                </div>
                <Button disabled={pending} onClick={() => void signInAsDemo()} size="lg">
                  Entrar na demo
                </Button>
                <p className="text-xs text-muted-foreground">
                  Usuário de demonstração compartilhado, sem login com Google.
                </p>
              </>
            )}
            {error && <FormError message={error} />}
          </CardContent>
        </Card>
      </div>
    </div>
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
