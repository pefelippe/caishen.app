import { LoaderCircle, MailCheck } from 'lucide-react';
import { AnimatePresence, MotionConfig, motion, type Variants } from 'motion/react';
import { type FormEvent, type ReactNode, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { Logo } from '@zapbots/ui/blocks/logo';
import { Button } from '@zapbots/ui/components/button';
import { Checkbox } from '@zapbots/ui/components/checkbox';
import { Input } from '@zapbots/ui/components/input';
import { Label } from '@zapbots/ui/components/label';
import { Separator } from '@zapbots/ui/components/separator';

import { FormError } from '../components/FormError';
import { authClient } from '../lib/auth';

/** How a password reset link reaches the User: by email, back to this page (local server, no
 * email set up) or only to the server console. */
type Methods = { google: boolean; link: 'console' | 'email' | 'page' };

/** Better Auth's error codes, said in Portuguese. */
const AUTH_ERRORS: Record<string, string> = {
  INVALID_EMAIL: 'Esse e-mail não parece válido.',
  INVALID_EMAIL_OR_PASSWORD: 'E-mail ou senha incorretos.',
  INVALID_PASSWORD: 'E-mail ou senha incorretos.',
  INVALID_TOKEN: 'O link para trocar a senha é inválido ou expirou. Peça um novo.',
  PASSWORD_TOO_LONG: 'A senha é longa demais.',
  PASSWORD_TOO_SHORT: 'A senha precisa ter pelo menos 8 caracteres.',
  USER_ALREADY_EXISTS: 'Já existe uma conta com esse e-mail. Entre, ou troque a senha.',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
    'Já existe uma conta com esse e-mail. Entre, ou troque a senha.',
  // Two-factor sign-in (docs/adr/0026).
  ACCOUNT_TEMPORARILY_LOCKED: 'Códigos errados demais. Espere alguns minutos e tente de novo.',
  INVALID_BACKUP_CODE: 'Esse código de recuperação não vale. Confira ou use outro.',
  INVALID_CODE: 'Código incorreto. Confira o app autenticador e digite o código atual.',
  INVALID_TWO_FACTOR_COOKIE: 'A verificação expirou. Entre com a senha de novo.',
  TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE: 'Tentativas demais. Entre com a senha de novo.',
  // Ours, from packages/auth/src/email.ts.
  EMAIL_REFUSED: 'Não conseguimos enviar o e-mail agora. Tente de novo em instantes.',
  EMAIL_TESTING_ONLY:
    'Este servidor ainda só envia e-mails para o endereço da conta do Resend. Confira o endereço ou verifique um domínio no Resend.',
};

/** A sign-in error in the User's words; Better Auth's own messages are English, for developers. */
const authError = (error: { code?: string; status?: number }, fallback: string) =>
  (error.code && AUTH_ERRORS[error.code]) ||
  (error.status === 429
    ? 'Muitas tentativas seguidas. Espere um pouco e tente de novo.'
    : error.status && error.status >= 500
      ? 'Algo deu errado do nosso lado. Tente de novo em instantes.'
      : fallback);

const MIN_PASSWORD = 8;

const EASE = [0.22, 1, 0.36, 1] as const;

/** The card rises and settles with a small spring. */
const card: Variants = {
  hidden: { opacity: 0, scale: 0.97, y: 24 },
  shown: {
    opacity: 1,
    scale: 1,
    transition: {
      damping: 22,
      delayChildren: 0.15,
      stiffness: 200,
      type: 'spring',
    },
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

/** A step of the card swaps in for the last one. */
const swap = {
  animate: { filter: 'blur(0px)', opacity: 1, y: 0 },
  exit: { filter: 'blur(4px)', opacity: 0, y: -12 },
  initial: { filter: 'blur(4px)', opacity: 0, y: 12 },
  transition: { duration: 0.35, ease: EASE },
};

type Step = 'forgot' | 'sent' | 'sign-in' | 'sign-up' | 'two-factor';

const SUBTITLES: Record<Step, string> = {
  forgot: 'Digite seu e-mail para receber um link e escolher uma nova senha',
  sent: 'Confira sua caixa de entrada',
  'sign-in': 'Entre com seu e-mail e senha',
  'sign-up': 'Crie sua conta com e-mail e senha',
  'two-factor': 'Digite o código do seu app autenticador',
};

/**
 * Two ways in: email and password (signing in, creating the account, and a link by email to choose
 * a new password), and Google when the server has its OAuth client.
 */
export function LoginPage() {
  const [params] = useSearchParams();
  // The landing page's "Criar conta" opens straight on the sign-up form (`?step=sign-up`).
  const [step, setStep] = useState<Step>(() =>
    params.get('step') === 'sign-up' ? 'sign-up' : 'sign-in'
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [methods, setMethods] = useState<Methods>({
    google: false,
    link: 'email',
  });
  // In development the address comes filled in (`VITE_DEV_SIGN_IN_EMAIL`).
  const [email, setEmail] = useState(
    import.meta.env.DEV ? (import.meta.env.VITE_DEV_SIGN_IN_EMAIL ?? '') : ''
  );
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  // A recovery code in place of the app's, for when the phone is not at hand.
  const [recovery, setRecovery] = useState(false);
  const [trustDevice, setTrustDevice] = useState(true);

  useEffect(() => {
    void authClient
      .$fetch<Methods>('/sign-in-methods', { method: 'GET' })
      .then(({ data }) => data && setMethods(data));
  }, []);

  const go = (next: Step) => {
    setError(null);
    setPassword('');
    setCode('');
    setRecovery(false);
    setStep(next);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setPending(true);
    const address = email.trim();

    if (step === 'forgot') {
      const result = await authClient.requestPasswordReset({
        email: address,
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (result.error) {
        setError(authError(result.error, 'Não foi possível enviar o link'));
        setPending(false);
        return;
      }
      if (methods.link === 'page') {
        const { data } = await authClient.$fetch<{ url: string | null }>(
          '/reset-password/local-link',
          { body: { email: address }, method: 'POST' }
        );
        // On localhost the link comes back to this page: follow it instead of reading the console.
        if (data?.url) {
          window.location.assign(data.url);
          return;
        }
      }
      setPending(false);
      setStep('sent');
      return;
    }

    if (step === 'two-factor') {
      const verified = recovery
        ? await authClient.twoFactor.verifyBackupCode({ code: code.trim(), trustDevice })
        : await authClient.twoFactor.verifyTotp({ code: code.replace(/s/g, ''), trustDevice });
      // On success the session changes and the app takes over.
      if (verified.error) {
        setError(authError(verified.error, 'Não foi possível confirmar o código'));
        setPending(false);
      }
      return;
    }

    const result =
      step === 'sign-up'
        ? await authClient.signUp.email({
            email: address,
            name: name.trim(),
            password,
          })
        : await authClient.signIn.email({ email: address, password });
    // On success the session changes and the app takes over, unless the account asks for a code.
    if (result.error) {
      setError(authError(result.error, 'Não foi possível entrar'));
      setPending(false);
    } else if (result.data && 'twoFactorRedirect' in result.data && result.data.twoFactorRedirect) {
      setPending(false);
      go('two-factor');
    }
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
      setError(authError(result.error, 'Não foi possível entrar com o Google.'));
      setPending(false);
    }
  };

  return (
    <AuthCard error={error} subtitle={SUBTITLES[step]} title="Bem-vindo ao Caishen">
      <AnimatePresence initial={false} mode="wait">
        {step === 'sent' ? (
          <motion.div
            {...swap}
            className="mt-8 flex flex-col items-center gap-4 text-center"
            key="sent"
          >
            <SentMark />
            {methods.link === 'email' ? (
              <p className="text-pretty">
                Se existe uma conta com <span className="font-semibold">{email.trim()}</span>,
                enviamos um link para escolher uma nova senha. Ele vale por 1 hora.
              </p>
            ) : (
              <p className="text-pretty">
                Este servidor não envia e-mails (falta <code>RESEND_API_KEY</code>). O link para{' '}
                <span className="font-semibold">{email.trim()}</span> está no terminal do servidor.
              </p>
            )}
            <Button className="px-0" onClick={() => go('sign-in')} variant="link">
              Voltar para entrar
            </Button>
          </motion.div>
        ) : step === 'two-factor' ? (
          <motion.form
            {...swap}
            className="mt-8 flex flex-col gap-5"
            key="two-factor"
            onSubmit={event => void submit(event)}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="code">
                {recovery ? 'Código de recuperação' : 'Código de 6 dígitos'}
              </Label>
              <Input
                autoComplete="one-time-code"
                autoFocus
                className="h-11 px-4 text-base tracking-widest shadow-none md:text-base"
                id="code"
                inputMode={recovery ? 'text' : 'numeric'}
                key={recovery ? 'recovery' : 'totp'}
                maxLength={recovery ? 32 : 7}
                onChange={event => setCode(event.target.value)}
                placeholder={recovery ? 'xxxxx-xxxxx' : '000000'}
                required
                value={code}
              />
            </div>
            <Label className="flex items-center gap-2.5 font-normal">
              <Checkbox
                checked={trustDevice}
                onCheckedChange={checked => setTrustDevice(checked === true)}
              />
              Não pedir de novo neste navegador por 30 dias
            </Label>
            <motion.div whileTap={{ scale: 0.98 }}>
              <Button className="h-11 w-full text-base" disabled={pending} type="submit">
                {pending ? <LoaderCircle className="size-4 animate-spin" /> : 'Confirmar'}
              </Button>
            </motion.div>
            <div className="flex flex-col items-center gap-1 text-sm">
              <Button
                className="h-auto p-0 text-sm"
                onClick={() => {
                  setError(null);
                  setCode('');
                  setRecovery(!recovery);
                }}
                type="button"
                variant="link"
              >
                {recovery ? 'Usar o app autenticador' : 'Usar um código de recuperação'}
              </Button>
              <Button
                className="h-auto p-0 text-sm text-muted-foreground"
                onClick={() => go('sign-in')}
                type="button"
                variant="link"
              >
                Voltar para entrar
              </Button>
            </div>
          </motion.form>
        ) : (
          <motion.div {...swap} className="mt-8 flex flex-col gap-6" key={step}>
            {methods.google && step !== 'forgot' && (
              <>
                <Button
                  className="h-11 w-full text-base font-medium"
                  disabled={pending}
                  onClick={() => void signInWithGoogle()}
                  variant="outline"
                >
                  <GoogleIcon />
                  Continuar com o Google
                </Button>
                <div className="flex items-center gap-3">
                  <Separator className="flex-1" />
                  <span className="text-sm text-muted-foreground">ou com e-mail</span>
                  <Separator className="flex-1" />
                </div>
              </>
            )}
            <form className="flex flex-col gap-5" onSubmit={event => void submit(event)}>
              {step === 'sign-up' && (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    autoComplete="name"
                    className="h-11 px-4 text-base shadow-none md:text-base"
                    id="name"
                    onChange={event => setName(event.target.value)}
                    placeholder="Como quer ser chamado"
                    value={name}
                  />
                </div>
              )}
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
              {step !== 'forgot' && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="password">Senha</Label>
                    {step === 'sign-in' && (
                      <Button
                        className="h-auto p-0 text-sm"
                        onClick={() => go('forgot')}
                        type="button"
                        variant="link"
                      >
                        Esqueci minha senha
                      </Button>
                    )}
                  </div>
                  <Input
                    autoComplete={step === 'sign-up' ? 'new-password' : 'current-password'}
                    className="h-11 px-4 text-base shadow-none md:text-base"
                    id="password"
                    minLength={step === 'sign-up' ? MIN_PASSWORD : undefined}
                    onChange={event => setPassword(event.target.value)}
                    placeholder={step === 'sign-up' ? 'Pelo menos 8 caracteres' : undefined}
                    required
                    type="password"
                    value={password}
                  />
                </div>
              )}
              <motion.div whileTap={{ scale: 0.98 }}>
                <Button className="h-11 w-full text-base" disabled={pending} type="submit">
                  {pending ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : step === 'sign-up' ? (
                    'Criar conta'
                  ) : step === 'forgot' ? (
                    'Enviar link'
                  ) : (
                    'Entrar'
                  )}
                </Button>
              </motion.div>
            </form>
            <p className="text-center text-sm text-muted-foreground">
              {step === 'sign-in'
                ? 'Ainda não tem conta? '
                : step === 'sign-up'
                  ? 'Já tem conta? '
                  : ''}
              <Button
                className="h-auto p-0 text-sm"
                onClick={() => go(step === 'sign-in' ? 'sign-up' : 'sign-in')}
                type="button"
                variant="link"
              >
                {step === 'sign-in'
                  ? 'Criar conta'
                  : step === 'sign-up'
                    ? 'Entrar'
                    : 'Voltar para entrar'}
              </Button>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthCard>
  );
}

/**
 * Where the reset link lands (`/reset-password?token=`): the new password, twice. Choosing it signs
 * out every browser, so the User then signs in with it.
 */
export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(
    !token || searchParams.get('error') ? AUTH_ERRORS.INVALID_TOKEN! : null
  );
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    if (password !== confirmation) {
      setError('As duas senhas não são iguais.');
      return;
    }
    setError(null);
    setPending(true);
    const result = await authClient.resetPassword({
      newPassword: password,
      token,
    });
    setPending(false);
    if (result.error) {
      setError(authError(result.error, 'Não foi possível trocar a senha'));
      return;
    }
    setDone(true);
  };

  return (
    <AuthCard
      error={error}
      subtitle={done ? 'Sua senha foi trocada' : 'Escolha uma nova senha'}
      title="Nova senha"
    >
      <AnimatePresence initial={false} mode="wait">
        {done ? (
          <motion.div
            {...swap}
            className="mt-8 flex flex-col items-center gap-4 text-center"
            key="done"
          >
            <SentMark />
            <p className="text-pretty">Pronto. Entre com o seu e-mail e a nova senha.</p>
            <Button className="h-11 w-full text-base" onClick={() => navigate('/sign-in')}>
              Entrar
            </Button>
          </motion.div>
        ) : (
          <motion.form
            {...swap}
            className="mt-8 flex flex-col gap-5"
            key="form"
            onSubmit={event => void submit(event)}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="new-password">Nova senha</Label>
              <Input
                autoComplete="new-password"
                autoFocus
                className="h-11 px-4 text-base shadow-none md:text-base"
                disabled={!token}
                id="new-password"
                minLength={MIN_PASSWORD}
                onChange={event => setPassword(event.target.value)}
                placeholder="Pelo menos 8 caracteres"
                required
                type="password"
                value={password}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm-password">Repita a senha</Label>
              <Input
                autoComplete="new-password"
                className="h-11 px-4 text-base shadow-none md:text-base"
                disabled={!token}
                id="confirm-password"
                minLength={MIN_PASSWORD}
                onChange={event => setConfirmation(event.target.value)}
                required
                type="password"
                value={confirmation}
              />
            </div>
            <Button className="h-11 w-full text-base" disabled={pending || !token} type="submit">
              {pending ? <LoaderCircle className="size-4 animate-spin" /> : 'Trocar senha'}
            </Button>
            <Button asChild className="px-0" variant="link">
              <Link to="/sign-in">Voltar para entrar</Link>
            </Button>
          </motion.form>
        )}
      </AnimatePresence>
    </AuthCard>
  );
}

/** The page around every step: the mark, a title, a line under it, the step and its error. */
function AuthCard({
  children,
  error,
  subtitle,
  title,
}: {
  children: ReactNode;
  error: string | null;
  subtitle: string;
  title: string;
}) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="relative flex min-h-svh flex-col overflow-hidden bg-[var(--paper)]">
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
                {title}
              </motion.h1>
              <motion.p className="mt-2 text-muted-foreground" variants={rise}>
                {subtitle}
              </motion.p>
            </motion.div>

            {children}

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
              Ao entrar, você concorda com nossos{' '}
              <Link className="underline underline-offset-4 hover:text-foreground" to="/terms">
                Termos de Uso
              </Link>{' '}
              e com a{' '}
              <Link className="underline underline-offset-4 hover:text-foreground" to="/privacy">
                Política de Privacidade
              </Link>
              .
            </motion.p>
          </motion.div>
        </main>
      </div>
    </MotionConfig>
  );
}

/** A check in a green circle, popping in. */
function SentMark() {
  return (
    <motion.span
      animate={{ rotate: 0, scale: 1 }}
      className="grid size-14 place-items-center rounded-full bg-emerald-50 text-emerald-600"
      initial={{ rotate: -20, scale: 0 }}
      transition={{ damping: 12, delay: 0.1, stiffness: 220, type: 'spring' }}
    >
      <MailCheck className="size-7" />
    </motion.span>
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
