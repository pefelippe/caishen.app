import { LoaderCircle, MailCheck } from 'lucide-react';
import { AnimatePresence, MotionConfig, motion, type Variants } from 'motion/react';
import { type FormEvent, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

import { FormError } from '../components/FormError';
import { Logo } from '../components/Logo';
import { authClient } from '../lib/auth';

/** Where the sign-in link goes: by email, back to this page (local server, no email set up) or
 * only to the server console. */
type Methods = { google: boolean; link: 'console' | 'email' | 'page' };

/** Errors Better Auth puts in `?error=` when an email link cannot be used. */
const LINK_ERRORS: Record<string, string> = {
  EXPIRED_TOKEN: 'O link expirou. Peça um novo.',
  INVALID_TOKEN: 'O link é inválido ou já foi usado. Peça um novo.',
};

const EASE = [0.22, 1, 0.36, 1] as const;

/** The card rises and settles with a small spring. */
const card: Variants = {
  hidden: { opacity: 0, scale: 0.97, y: 24 },
  shown: {
    opacity: 1,
    scale: 1,
    transition: { damping: 22, delayChildren: 0.15, stiffness: 200, type: 'spring' },
    y: 0,
  },
};

/** A parent whose children rise one after another. */
const stagger: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.07 } },
};

const rise: Variants = {
  hidden: { opacity: 0, y: 12 },
  shown: { opacity: 1, transition: { duration: 0.5, ease: EASE }, y: 0 },
};

/** The mark pops in, turning into place. */
const pop: Variants = {
  hidden: { opacity: 0, rotate: -15, scale: 0.5 },
  shown: {
    opacity: 1,
    rotate: 0,
    scale: 1,
    transition: { damping: 12, stiffness: 220, type: 'spring' },
  },
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
  // In development the address comes filled in, so signing in is one click (`VITE_DEV_SIGN_IN_EMAIL`).
  const [email, setEmail] = useState(
    import.meta.env.DEV ? (import.meta.env.VITE_DEV_SIGN_IN_EMAIL ?? '') : ''
  );
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
      // On localhost the link comes back to this page: follow it instead of making the User click.
      if (data?.url) {
        window.location.assign(data.url);
        return;
      }
      setLocalLink(null);
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

  const reset = () => {
    setSentTo(null);
    setLocalLink(null);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative flex min-h-svh flex-col overflow-hidden bg-[var(--paper)]">
        <Backdrop />
        <motion.header
          animate={{ opacity: 1, y: 0 }}
          className="relative mx-auto flex w-full max-w-6xl items-center px-4 py-5 sm:px-6"
          initial={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          <Link className="flex items-center gap-2.5 text-header" to="/">
            <Logo size={24} />
            <span className="text-lg font-semibold tracking-tight text-foreground">Caishen</span>
          </Link>
        </motion.header>

        <main className="relative grid flex-1 place-items-center px-4 pt-6 pb-16">
          <motion.div
            animate="shown"
            className="w-full max-w-[440px] rounded-2xl border border-border/60 bg-card px-6 py-10 shadow-[0_24px_70px_-24px_rgba(15,23,42,0.28)] sm:px-10"
            initial="hidden"
            variants={card}
          >
            <motion.div className="flex flex-col items-center text-center" variants={stagger}>
              <motion.div
                className="grid size-16 place-items-center rounded-2xl bg-foreground text-header-foreground shadow-lg"
                variants={pop}
                whileHover={{ rotate: -6, scale: 1.06 }}
              >
                <Logo size={30} />
              </motion.div>
              <motion.h1 className="mt-6 text-3xl font-bold tracking-tight" variants={rise}>
                Bem-vindo ao Caishen
              </motion.h1>
              <motion.p className="mt-2 text-muted-foreground" variants={rise}>
                {sentTo
                  ? 'Confira sua caixa de entrada'
                  : methods.google
                    ? 'Entre com o Google ou receba um link de acesso'
                    : 'Digite seu e-mail para receber um link de acesso'}
              </motion.p>
            </motion.div>

            <AnimatePresence initial={false} mode="wait">
              {sentTo ? (
                <motion.div
                  animate={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
                  className="mt-8 flex flex-col items-center gap-4 text-center"
                  exit={{ filter: 'blur(4px)', opacity: 0, y: -12 }}
                  initial={{ filter: 'blur(4px)', opacity: 0, y: 12 }}
                  key="sent"
                  transition={{ duration: 0.35, ease: EASE }}
                >
                  <motion.span
                    animate={{ rotate: 0, scale: 1 }}
                    className="grid size-14 place-items-center rounded-full bg-emerald-50 text-emerald-600"
                    initial={{ rotate: -20, scale: 0 }}
                    transition={{ damping: 12, delay: 0.1, stiffness: 220, type: 'spring' }}
                  >
                    <MailCheck className="size-7" />
                  </motion.span>
                  {methods.link === 'email' ? (
                    <p className="text-pretty">
                      Enviamos um link para <span className="font-semibold">{sentTo}</span>. Abra o
                      e-mail neste navegador para entrar; o link vale por 15 minutos.
                    </p>
                  ) : (
                    <p className="text-pretty">
                      Este servidor não envia e-mails (falta <code>RESEND_API_KEY</code>). O link
                      para <span className="font-semibold">{sentTo}</span> está no terminal do
                      servidor{localLink ? ', ou abra-o aqui.' : '.'}
                    </p>
                  )}
                  {localLink && (
                    <Button asChild className="h-11 w-full text-base">
                      <a href={localLink}>Entrar como {sentTo}</a>
                    </Button>
                  )}
                  <Button className="px-0" onClick={reset} variant="link">
                    Usar outro e-mail
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  animate="shown"
                  className="mt-8 flex flex-col gap-6"
                  exit={{ filter: 'blur(4px)', opacity: 0, y: -12 }}
                  initial="hidden"
                  key="form"
                  variants={stagger}
                >
                  {methods.google && (
                    <>
                      <motion.div variants={rise}>
                        <Button
                          className="h-11 w-full text-base font-medium"
                          disabled={pending}
                          onClick={() => void signInWithGoogle()}
                          variant="outline"
                        >
                          <GoogleIcon />
                          Continuar com o Google
                        </Button>
                      </motion.div>
                      <motion.div className="flex items-center gap-3" variants={rise}>
                        <Separator className="flex-1" />
                        <span className="text-xs tracking-wide text-muted-foreground uppercase">
                          ou continue com e-mail
                        </span>
                        <Separator className="flex-1" />
                      </motion.div>
                    </>
                  )}
                  <motion.form
                    className="flex flex-col gap-6"
                    onSubmit={event => void sendLink(event)}
                    variants={rise}
                  >
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="email">E-mail</Label>
                      <Input
                        autoComplete="email"
                        autoFocus
                        className="h-11 px-4 text-base shadow-none md:text-base"
                        id="email"
                        onChange={event => setEmail(event.target.value)}
                        placeholder="voce@exemplo.com"
                        required
                        type="email"
                        value={email}
                      />
                    </div>
                    <motion.div whileTap={{ scale: 0.98 }}>
                      <Button className="h-11 w-full text-base" disabled={pending} type="submit">
                        {pending ? (
                          <>
                            <LoaderCircle className="size-4 animate-spin" />
                            Enviando…
                          </>
                        ) : (
                          'Enviar link de acesso'
                        )}
                      </Button>
                    </motion.div>
                  </motion.form>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {error && (
                <motion.div
                  animate={{ height: 'auto', opacity: 1 }}
                  className="overflow-hidden"
                  exit={{ height: 0, opacity: 0 }}
                  initial={{ height: 0, opacity: 0 }}
                >
                  <div className="pt-4">
                    <FormError message={error} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.p
              animate={{ opacity: 1 }}
              className="mt-8 text-center text-sm text-muted-foreground"
              initial={{ opacity: 0 }}
              transition={{ delay: 0.6 }}
            >
              Ao entrar, você concorda com nossos Termos de Uso.
            </motion.p>
          </motion.div>
        </main>
      </div>
    </MotionConfig>
  );
}

/** Two warm lights drifting slowly behind the card. */
function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <motion.div
        animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
        className="absolute -top-40 -left-40 size-[520px] rounded-full bg-[radial-gradient(closest-side,#f3dcae,transparent)] opacity-70 blur-3xl"
        transition={{ duration: 14, ease: 'easeInOut', repeat: Infinity }}
      />
      <motion.div
        animate={{ x: [0, -30, 0], y: [0, -40, 0] }}
        className="absolute -right-40 -bottom-40 size-[560px] rounded-full bg-[radial-gradient(closest-side,#e9e1d4,transparent)] opacity-80 blur-3xl"
        transition={{ duration: 16, ease: 'easeInOut', repeat: Infinity }}
      />
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
