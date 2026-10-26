import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';

import { priceInstallment } from '@zapbots/finance';
import {
  ArrowRightIcon,
  ArrowUpIcon,
  BotIcon,
  CalculatorIcon,
  CheckIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  FlagIcon,
  LandmarkIcon,
  MessageSquareIcon,
  ReceiptIcon,
  SheetIcon,
  type LucideIcon,
} from 'lucide-react';
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useReducedMotion,
  type Variants,
} from 'motion/react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Logo } from '@zapbots/ui/blocks/logo';
import { Button } from '@zapbots/ui/components/button';
import { Slider } from '@zapbots/ui/components/slider';
import { cn } from '@zapbots/ui/lib/utils';

import { formatCents } from '../lib/format';
import { COMPANY } from '../lib/legal';

// ---------------------------------------------------------------- motion

const EASE = [0.22, 1, 0.36, 1] as const;

/** A block that rises into place the first time it scrolls into view. */
const rise: Variants = {
  hidden: { opacity: 0, y: 24 },
  shown: { opacity: 1, transition: { duration: 0.6, ease: EASE }, y: 0 },
};

/** A parent whose children rise one after another. */
const stagger: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.08 } },
};

/** Props for a block that animates once, when it is a little inside the screen. */
const onView = {
  initial: 'hidden',
  viewport: { amount: 0.05, once: true },
  whileInView: 'shown',
} as const;

// ---------------------------------------------------------------- content

const NAV = [
  { href: '#como-funciona', label: 'Como funciona' },
  { href: '#produtos', label: 'Produtos' },
  { href: '#simulador', label: 'Simulador' },
  { href: '#seguranca', label: 'Segurança' },
];

const SIGN_UP = '/sign-in?step=sign-up';

/**
 * The Caishen's profiles elsewhere. Empty until the accounts exist; the footer shows the list only
 * when there is something in it.
 */
const SOCIAL: { href: string; label: string }[] = [];

/** The page for visitors who are not signed in, after Pluggy's. "Entrar" leads to /sign-in. */
export function LandingPage() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="landing min-h-svh overflow-x-clip bg-white text-navy">
        <a
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
          href="#conteudo"
        >
          Pular para o conteúdo
        </a>
        <Header />
        <main id="conteudo">
          <Hero />
          <HowItWorks />
          <Products />
          <Simulator />
          <Safety />
          <FinalCta />
        </main>
        <Footer />
      </div>
    </MotionConfig>
  );
}

function Brand({ light }: { light?: boolean }) {
  return (
    <Link className="flex items-center gap-2" to="/">
      <span className={cn('text-primary', light && 'text-white')}>
        <Logo size={26} />
      </span>
      <span className="text-xl font-semibold tracking-tight">caishen</span>
    </Link>
  );
}

/** A pill, as every button on this page is. */
const PILL = 'h-11 rounded-full px-6 text-[15px] font-medium';

/** The white bar: the wordmark, the sections, Entrar and the way in. */
function Header() {
  return (
    <header className="sticky top-0 z-40 bg-white/95 px-[max(1rem,env(safe-area-inset-left))] pt-[env(safe-area-inset-top)] sm:px-6">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-8">
        <Brand />
        <nav aria-label="Seções" className="hidden items-center gap-7 lg:flex">
          {NAV.map(link => (
            <a
              className="text-sm text-navy/70 transition-colors hover:text-navy"
              href={link.href}
              key={link.href}
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Button asChild className="rounded-full text-sm text-navy" variant="ghost">
            <Link to="/sign-in">Entrar</Link>
          </Button>
          <Button asChild className="group h-10 rounded-full px-4 text-sm sm:px-5">
            <Link to={SIGN_UP}>
              <span className="sm:hidden">Criar conta</span>
              <span className="hidden sm:inline">Começar grátis</span>
              <ArrowRightIcon className="hidden transition-transform group-hover:translate-x-0.5 sm:block" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------- hero

/** What the headline ends with, typed and erased in turn. */
const SOURCES_TYPED = ['banco', 'planilha', 'extrato', 'cartão', 'fatura'];

/** The last word of the headline, typed letter by letter, held, erased, and the next one typed. */
function TypedWord() {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [length, setLength] = useState(SOURCES_TYPED[0]!.length);
  const [erasing, setErasing] = useState(false);
  const word = SOURCES_TYPED[index]!;

  useEffect(() => {
    if (reduced) return;
    const full = length === word.length;
    const delay = erasing ? 55 : full ? 1800 : 95;
    const timer = setTimeout(() => {
      if (!erasing && full) setErasing(true);
      else if (erasing && length === 0) {
        setErasing(false);
        setIndex(current => (current + 1) % SOURCES_TYPED.length);
      } else setLength(current => current + (erasing ? -1 : 1));
    }, delay);
    return () => clearTimeout(timer);
  }, [erasing, length, reduced, word.length]);

  return (
    <span aria-hidden className="whitespace-nowrap">
      {reduced ? word : word.slice(0, length)}
      <span className="caret ml-1 inline-block h-[0.85em] w-[0.08em] translate-y-[0.08em] -skew-x-12 bg-primary" />
    </span>
  );
}

function Hero() {
  return (
    <section aria-labelledby="hero-title" className="px-4 pt-16 pb-10 sm:px-6 sm:pt-24">
      <div className="mx-auto max-w-6xl text-center">
        <motion.h1
          animate="shown"
          aria-label="Suas finanças em dia, de qualquer banco, planilha ou cartão"
          className="mx-auto text-[1.8rem] leading-[1.05] font-bold tracking-[-0.045em] sm:text-6xl lg:text-[5rem]"
          id="hero-title"
          initial="hidden"
          variants={rise}
        >
          <span aria-hidden className="block">
            Suas finanças em dia,
          </span>
          <span aria-hidden className="block">
            de qualquer <TypedWord />
          </span>
        </motion.h1>
        <motion.div animate="shown" initial="hidden" variants={stagger}>
          <motion.p
            className="mx-auto mt-6 max-w-xl text-lg text-pretty text-navy/80"
            variants={rise}
          >
            Junte extratos, planilhas e faturas num lugar só. O Caishen soma o mês, calcula os juros
            de cada dívida e monta o plano para você quitar tudo.
          </motion.p>
          <motion.div
            className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"
            variants={rise}
          >
            <Button asChild className={cn(PILL, 'group')}>
              <Link to={SIGN_UP}>
                Criar conta grátis
                <ArrowRightIcon className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
            <Button
              asChild
              className={cn(PILL, 'bg-slate-100 text-navy hover:bg-slate-200')}
              variant="ghost"
            >
              <a href="#simulador">Simular uma dívida</a>
            </Button>
          </motion.div>
        </motion.div>
      </div>
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto mt-14 max-w-6xl sm:mt-16"
        initial={{ opacity: 0, y: 32 }}
        transition={{ delay: 0.35, duration: 0.9, ease: EASE }}
      >
        <Flow />
      </motion.div>
    </section>
  );
}

interface Node {
  icon: LucideIcon;
  label: string;
  soon?: boolean;
}

/** Where the money's records come from. */
const INPUTS: Node[] = [
  { icon: LandmarkIcon, label: 'Extrato .ofx' },
  { icon: FileSpreadsheetIcon, label: 'Planilha .xlsx' },
  { icon: SheetIcon, label: 'Planilha .csv' },
  { icon: FileTextIcon, label: 'Fatura em PDF' },
  { icon: MessageSquareIcon, label: 'Conversa' },
  { icon: LandmarkIcon, label: 'Open Finance', soon: true },
];

/** What the Caishen makes of them: its screens. */
const OUTPUTS: Node[] = [
  { icon: SheetIcon, label: 'Fluxo de caixa' },
  { icon: FlagIcon, label: 'Sair das dívidas' },
  { icon: BotIcon, label: 'Agente' },
  { icon: CalculatorIcon, label: 'Calculadoras' },
];

// The drawing's own units: 1000 wide, 440 high; the mark sits in the middle.
const W = 1000;
const H = 440;
const CENTER = { x: W / 2, y: H / 2 };
const IN_X = 170;
const OUT_X = 830;
const spread = (count: number, index: number, top: number, bottom: number) =>
  top + ((bottom - top) * index) / (count - 1);
const inY = (index: number) => spread(INPUTS.length, index, 40, H - 40);
const outY = (index: number) => spread(OUTPUTS.length, index, 95, H - 95);

/** A curve from one point to another, leaving and arriving level. */
const curve = (from: { x: number; y: number }, to: { x: number; y: number }) => {
  const middle = (from.x + to.x) / 2;
  return `M ${from.x} ${from.y} C ${middle} ${from.y}, ${middle} ${to.y}, ${to.x} ${to.y}`;
};

/** A source or a screen, set over the drawing at its point. */
function Chip({ node, side, y }: { node: Node; side: 'in' | 'out'; y: number }) {
  return (
    <div
      className={cn(
        'absolute flex -translate-y-1/2 items-center gap-2 rounded-full bg-white py-1.5 pr-3.5 pl-1.5 text-[13px] font-medium whitespace-nowrap shadow-[0_2px_12px_-4px_rgb(15_23_42/0.18)]',
        side === 'in' ? '-translate-x-full' : '',
        node.soon && 'text-navy/50'
      )}
      style={{
        left: `${((side === 'in' ? IN_X : OUT_X) / W) * 100}%`,
        top: `${(y / H) * 100}%`,
      }}
    >
      <span
        className={cn(
          'grid size-7 place-items-center rounded-full',
          side === 'in' ? 'bg-accent text-primary' : 'bg-emerald-50 text-emerald-600',
          node.soon && 'bg-slate-100 text-navy/40'
        )}
      >
        <node.icon className="size-3.5" />
      </span>
      {node.label}
      {node.soon && <span className="text-[11px] font-normal">em breve</span>}
    </div>
  );
}

/**
 * The idea of the page, after Pluggy's: every source on the left runs along a moving dashed line
 * into the Caishen's mark, and out of it to the screens on the right. On a phone the same story
 * stacks: the sources, the mark, the screens.
 */
function Flow() {
  return (
    <div
      aria-label="Extratos, planilhas e faturas entram no Caishen e viram Fluxo de caixa, plano para sair das dívidas, respostas do Agente e Calculadoras"
      role="img"
    >
      <div className="relative hidden md:block" style={{ aspectRatio: `${W} / ${H}` }}>
        <svg aria-hidden className="absolute inset-0 size-full" viewBox={`0 0 ${W} ${H}`}>
          {INPUTS.map((node, index) => (
            <path
              className={cn('flow-line', node.soon ? 'text-slate-300' : 'text-primary')}
              d={curve({ x: IN_X + 8, y: inY(index) }, { x: CENTER.x - 70, y: CENTER.y })}
              fill="none"
              key={node.label}
              stroke="currentColor"
              strokeDasharray="5 7"
              strokeWidth={2}
              style={{ animationDelay: `${index * -0.3}s` }}
            />
          ))}
          {OUTPUTS.map((node, index) => (
            <path
              className="flow-line text-emerald-500"
              d={curve({ x: CENTER.x + 70, y: CENTER.y }, { x: OUT_X - 8, y: outY(index) })}
              fill="none"
              key={node.label}
              stroke="currentColor"
              strokeDasharray="5 7"
              strokeWidth={2}
              style={{ animationDelay: `${index * -0.4}s` }}
            />
          ))}
        </svg>
        <div
          className="absolute grid size-36 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-primary text-white"
          style={{ left: '50%', top: '50%' }}
        >
          <span className="flow-pulse absolute inset-0 rounded-full bg-primary/30" />
          <Logo size={64} />
        </div>
        {INPUTS.map((node, index) => (
          <Chip key={node.label} node={node} side="in" y={inY(index)} />
        ))}
        {OUTPUTS.map((node, index) => (
          <Chip key={node.label} node={node} side="out" y={outY(index)} />
        ))}
      </div>

      <div className="flex flex-col items-center gap-5 md:hidden">
        <ul className="flex flex-wrap justify-center gap-2">
          {INPUTS.map(node => (
            <li
              className={cn(
                'flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-[13px] font-medium text-primary',
                node.soon && 'bg-slate-100 text-navy/50'
              )}
              key={node.label}
            >
              <node.icon className="size-3.5" />
              {node.label}
            </li>
          ))}
        </ul>
        <span className="h-10 w-0.5 bg-primary/30" />
        <span className="grid size-20 place-items-center rounded-full bg-primary text-white">
          <Logo size={36} />
        </span>
        <span className="h-10 w-0.5 bg-emerald-500/40" />
        <ul className="flex flex-wrap justify-center gap-2">
          {OUTPUTS.map(node => (
            <li
              className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[13px] font-medium text-emerald-700"
              key={node.label}
            >
              <node.icon className="size-3.5" />
              {node.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- how it works

/** Example lines of a statement, as they come out of the bank. */
const STATEMENT = [
  { amount: 5200, date: '05/10', text: 'SALARIO ACME LTDA' },
  { amount: -1480, date: '06/10', text: 'ALUGUEL OUTUBRO' },
  { amount: -312.47, date: '08/10', text: 'SUPERMERCADO BOM PRECO' },
  { amount: -2000, date: '09/10', text: 'APLICACAO CDB' },
  { amount: -89.9, date: '09/10', text: 'INTERNET FIBRA' },
  { amount: -46.3, date: '11/10', text: 'FARMACIA SAO JOAO' },
];

const brl = (value: number) => formatCents(Math.round(value * 100));

/** The three things importing does, each showing its own side of the same statement. */
const STEPS: { body: string; file: string; title: string }[] = [
  {
    body: 'OFX, CSV, Excel ou a fatura em PDF. O Caishen acha as colunas de data, descrição e valor e separa o que é Gasto.',
    file: 'extrato-outubro.ofx',
    title: 'Qualquer banco, um formato só',
  },
  {
    body: 'Entradas, aplicações, transferências entre as suas contas e o pagamento da fatura ficam de fora. Sobra o que você gastou.',
    file: 'extrato-outubro.ofx → Gastos',
    title: 'Só o que é gasto vira Gasto',
  },
  {
    body: 'Cada linha tem a sua marca. Mande o mesmo extrato duas vezes e nada aparece repetido.',
    file: 'extrato-outubro.ofx, de novo',
    title: 'Importar de novo não duplica',
  },
];

/** The statement in the dark panel, read differently for each step. */
function StatementPanel({ step }: { step: number }) {
  const spent = STATEMENT.filter(line => line.amount < 0 && !line.text.startsWith('APLICACAO'));
  return (
    <div
      aria-label="Exemplo de um extrato importado"
      className="flex min-h-[23rem] flex-col rounded-3xl bg-navy p-5 text-[13px] text-slate-300 sm:p-6"
      data-ui
      role="img"
    >
      <div className="flex items-center gap-1.5">
        {['bg-rose-400', 'bg-amber-300', 'bg-emerald-400'].map(color => (
          <span className={cn('size-2.5 rounded-full', color)} key={color} />
        ))}
        <span className="ml-3 truncate text-slate-400">{STEPS[step]!.file}</span>
      </div>
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="mt-5 flex flex-1 flex-col gap-1.5 tabular-nums"
          exit={{ opacity: 0, y: -8 }}
          initial={{ opacity: 0, y: 8 }}
          key={step}
          transition={{ duration: 0.3, ease: EASE }}
        >
          {step === 0 &&
            STATEMENT.map(line => (
              <p className="flex gap-3" key={line.text}>
                <span className="text-slate-400">{line.date}</span>
                <span className="min-w-0 flex-1 truncate">{line.text}</span>
                <span className={line.amount > 0 ? 'text-emerald-400' : undefined}>
                  {brl(line.amount)}
                </span>
              </p>
            ))}
          {step === 1 && (
            <>
              {STATEMENT.map(line => {
                const kept = spent.includes(line);
                return (
                  <p
                    className={cn('flex gap-3', !kept && 'text-slate-600 line-through')}
                    key={line.text}
                  >
                    <span className="min-w-0 flex-1 truncate capitalize">
                      {line.text.toLowerCase()}
                    </span>
                    <span>{brl(Math.abs(line.amount))}</span>
                  </p>
                );
              })}
              <p className="mt-auto flex justify-between rounded-xl bg-white/10 px-3 py-2.5 font-medium text-white">
                Gastos de outubro
                <span>{brl(spent.reduce((sum, line) => sum - line.amount, 0))}</span>
              </p>
            </>
          )}
          {step === 2 && (
            <>
              <p className="text-white">6 linhas lidas</p>
              <p>4 já estavam no Caishen</p>
              <p>2 ficaram de fora: entrada e aplicação</p>
              <p className="mt-auto flex justify-between rounded-xl bg-emerald-400/15 px-3 py-2.5 font-medium text-emerald-300">
                Novos Gastos
                <span>0</span>
              </p>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function HowItWorks() {
  const [step, setStep] = useState(0);
  return (
    <section
      aria-labelledby="como-funciona-title"
      className="scroll-mt-16 px-4 py-24 sm:px-6 sm:py-32"
      id="como-funciona"
    >
      <motion.div className="mx-auto max-w-6xl" variants={stagger} {...onView}>
        <motion.h2
          className="mx-auto max-w-3xl text-center text-4xl leading-[1.08] font-semibold tracking-[-0.035em] sm:text-[3.25rem]"
          id="como-funciona-title"
          variants={rise}
        >
          Um lugar só para o seu dinheiro
        </motion.h2>
        <motion.p
          className="mx-auto mt-5 max-w-xl text-center text-lg text-navy/80"
          variants={rise}
        >
          Exporte o extrato no app do banco e mande. Sem instalar nada e sem senha de banco.
        </motion.p>

        <div className="mt-16 grid items-center gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <motion.div variants={rise}>
            <StatementPanel step={step} />
          </motion.div>
          <motion.ol className="flex flex-col gap-2" variants={stagger}>
            {STEPS.map((item, index) => (
              <motion.li key={item.title} variants={rise}>
                <button
                  aria-pressed={step === index}
                  className={cn(
                    'flex w-full gap-5 rounded-2xl p-5 text-left transition-colors sm:p-6',
                    step === index ? 'bg-slate-100' : 'hover:bg-slate-50'
                  )}
                  onClick={() => setStep(index)}
                  onFocus={() => setStep(index)}
                  onMouseEnter={() => setStep(index)}
                  type="button"
                >
                  <span
                    className={cn(
                      'text-3xl font-semibold tabular-nums transition-colors',
                      step === index ? 'text-primary' : 'text-navy/25'
                    )}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span>
                    <span className="block text-xl font-semibold tracking-tight">{item.title}</span>
                    <span className="mt-1.5 block text-base text-navy/75">{item.body}</span>
                  </span>
                </button>
              </motion.li>
            ))}
          </motion.ol>
        </div>
      </motion.div>
    </section>
  );
}

// ---------------------------------------------------------------- products

/** A phone, drawn in HTML, holding a piece of the app with example figures. */
function Phone({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div
      aria-label={label}
      className="mx-auto w-[15.5rem] rounded-[2.4rem] bg-navy p-2.5"
      data-ui
      role="img"
    >
      <div className="flex h-[27rem] flex-col overflow-hidden rounded-[1.9rem] bg-white px-4 pt-3 text-[11px] text-navy">
        <div className="mx-auto mb-3 h-5 w-20 rounded-full bg-navy" />
        <div className="mb-3 flex items-center gap-1.5 text-primary">
          <Logo size={14} />
          <span className="font-semibold text-navy">caishen</span>
        </div>
        {children}
      </div>
    </div>
  );
}

function CashFlowScreen() {
  return (
    <>
      <p className="text-sm font-semibold">Outubro de 2026</p>
      <p className="text-slate-500">Fluxo de caixa</p>
      <div className="mt-3 grid gap-1.5">
        {[
          ['Entrou', 'R$ 9.850,00', ''],
          ['Compromissos', 'R$ 3.716,00', 'text-primary'],
          ['Gastos', 'R$ 2.904,35', 'text-primary/70'],
        ].map(([label, value, tone]) => (
          <div className="flex justify-between rounded-lg bg-slate-50 px-2.5 py-2" key={label}>
            <span className="text-slate-500">{label}</span>
            <span className={cn('font-semibold tabular-nums', tone)}>{value}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-xl bg-emerald-50 p-3">
        <p className="text-emerald-700">Sobra</p>
        <p className="text-xl font-semibold text-emerald-700 tabular-nums">R$ 3.229,65</p>
        <div className="mt-2 flex h-1.5 gap-0.5 overflow-hidden rounded-full">
          <span className="w-[38%] bg-primary" />
          <span className="w-[29%] bg-primary/40" />
          <span className="w-[33%] bg-emerald-500" />
        </div>
      </div>
      <p className="mt-3 font-medium">Vence esta semana</p>
      {[
        ['28/10', 'Cartão Visa', 'R$ 460,00'],
        ['30/10', 'Internet', 'R$ 89,90'],
      ].map(([date, name, amount]) => (
        <p className="mt-1.5 flex gap-2 tabular-nums" key={name}>
          <span className="text-slate-500">{date}</span>
          <span className="flex-1">{name}</span>
          <span className="font-medium">{amount}</span>
        </p>
      ))}
    </>
  );
}

function PayoffScreen() {
  return (
    <>
      <p className="text-sm font-semibold">Sair das dívidas</p>
      <p className="text-slate-500">R$ 2.500 por mês</p>
      <div className="mt-3 rounded-xl bg-primary p-3 text-white">
        <p className="text-white/80">Sem dívidas em</p>
        <p className="text-xl font-semibold">agosto de 2028</p>
        <p className="mt-1 text-white/80">R$ 6.940 a menos em juros</p>
      </div>
      <p className="mt-3 font-medium">A mais cara primeiro</p>
      {[
        ['Cartão Visa', '9,9% a.m.', 'mar/2027', 'bg-rose-500'],
        ['Empréstimo Itaú', '3,1% a.m.', 'jan/2028', 'bg-amber-400'],
        ['Financiamento Caixa', '0,9% a.m.', 'ago/2028', 'bg-emerald-500'],
      ].map(([name, rate, done, color]) => (
        <div className="mt-2 rounded-lg bg-slate-50 px-2.5 py-2" key={name}>
          <div className="flex justify-between">
            <span className="font-medium">{name}</span>
            <span className="text-slate-500 tabular-nums">{rate}</span>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="h-1 flex-1 overflow-hidden rounded-full bg-slate-200">
              <span className={cn('block h-full w-2/3 rounded-full', color)} />
            </span>
            <span className="text-slate-500 tabular-nums">{done}</span>
          </div>
        </div>
      ))}
    </>
  );
}

function AgentScreen() {
  return (
    <>
      <p className="text-sm font-semibold">Agente</p>
      <div className="mt-3 flex flex-col gap-2">
        <p className="ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-primary px-3 py-2 text-white">
          Quanto gastei com mercado em outubro?
        </p>
        <p className="max-w-[88%] rounded-2xl rounded-bl-md bg-slate-100 px-3 py-2">
          R$ 1.284,30 em 9 compras, 12% a mais que em setembro. A maior foi de R$ 312,47 no Bom
          Preço, dia 8.
        </p>
        <p className="ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-primary px-3 py-2 text-white">
          Anota a farmácia de hoje, R$ 46,30
        </p>
        <div className="max-w-[88%] rounded-2xl rounded-bl-md bg-slate-100 px-3 py-2">
          <p>Posso lançar este Gasto?</p>
          <p className="mt-1.5 rounded-lg bg-white px-2 py-1.5 font-medium">
            Farmácia · R$ 46,30 · hoje
          </p>
          <div className="mt-1.5 flex gap-1.5">
            <span className="rounded-full bg-primary px-2.5 py-1 text-white">Confirmar</span>
            <span className="rounded-full bg-white px-2.5 py-1">Cancelar</span>
          </div>
        </div>
      </div>
      <p className="mt-auto mb-3 rounded-full bg-slate-100 px-3 py-2 text-slate-600">
        Pergunte ao Caishen…
      </p>
    </>
  );
}

function WorkflowScreen() {
  return (
    <>
      <p className="text-sm font-semibold">Workflows</p>
      <p className="text-slate-500">Toda segunda, 8h</p>
      <div className="mt-3 rounded-xl bg-slate-50 p-3">
        <p className="font-medium">Resumo da semana</p>
        <p className="mt-1 text-slate-500">
          Quanto entrou, quanto saiu e o que vence nos próximos 7 dias.
        </p>
        <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
          <CheckIcon className="size-3" /> Pronto às 8h02
        </p>
      </div>
      <div className="mt-2 rounded-xl bg-slate-50 p-3">
        <p className="font-medium">Relatório do mês</p>
        <p className="mt-1 text-slate-500">Todo dia 1º, com o mês que fechou.</p>
      </div>
      <div className="mt-3 rounded-xl bg-navy p-3 text-slate-300">
        <p className="font-medium text-white">Semana de 19 a 25/10</p>
        <p className="mt-1.5">Entraram R$ 5.200,00.</p>
        <p>Saíram R$ 1.928,67, metade em aluguel.</p>
        <p className="mt-1.5 text-white">Cartão Visa vence dia 28: R$ 460,00.</p>
      </div>
    </>
  );
}

const PRODUCTS: {
  body: string;
  checks: string[];
  name: string;
  screen: ReactNode;
  tint: string;
}[] = [
  {
    body: 'Entradas, Compromissos e Gastos do mês numa folha só. Você vê quanto sobra antes do mês acabar.',
    checks: [
      'Parcelas, faturas e impostos no dia em que vencem',
      'Renda em real ou em dólar, pela PTAX do dia',
      'Exporta em CSV ou PDF',
    ],
    name: 'Fluxo de caixa',
    screen: <CashFlowScreen />,
    tint: 'bg-blue-50',
  },
  {
    body: 'Diga quanto pode pagar por mês e veja o dia em que a última parcela acaba, a dívida mais cara primeiro.',
    checks: [
      'Juros calculados pela Tabela Price ou SAC',
      'Quanto você economiza em juros',
      'Cada taxa comparada à média do Banco Central',
    ],
    name: 'Sair das dívidas',
    screen: <PayoffScreen />,
    tint: 'bg-rose-50',
  },
  {
    body: 'Pergunte em português sobre o seu dinheiro. O Agente lê os seus números e responde com eles.',
    checks: [
      'Lê planilhas, PDFs e prints que você manda',
      'Propõe lançamentos e só grava se você confirmar',
      'Nunca move dinheiro nem altera nada lá fora',
    ],
    name: 'Agente',
    screen: <AgentScreen />,
    tint: 'bg-emerald-50',
  },
  {
    body: 'Peça uma vez e receba pronto: um resumo da semana, o relatório do mês, toda semana ou todo mês.',
    checks: [
      'Roda sozinho, no dia e na hora que você escolhe',
      'O resultado fica salvo para baixar',
      'Só leitura, como o Agente',
    ],
    name: 'Workflows',
    screen: <WorkflowScreen />,
    tint: 'bg-sky-50',
  },
];

function Products() {
  return (
    <section
      aria-labelledby="produtos-title"
      className="scroll-mt-16 bg-slate-50 px-4 py-24 sm:px-6 sm:py-32"
      id="produtos"
    >
      <motion.div className="mx-auto max-w-6xl" variants={stagger} {...onView}>
        <motion.h2
          className="mx-auto max-w-3xl text-center text-4xl leading-[1.08] font-semibold tracking-[-0.035em] sm:text-[3.25rem]"
          id="produtos-title"
          variants={rise}
        >
          Entender e quitar. No mesmo app
        </motion.h2>
        <motion.p
          className="mx-auto mt-5 max-w-xl text-center text-lg text-navy/80"
          variants={rise}
        >
          Do primeiro extrato ao dia da última parcela, com um Agente que conhece os seus números.
        </motion.p>

        <div className="mt-16 grid gap-6 lg:grid-cols-2">
          {PRODUCTS.map(product => (
            <motion.article
              className="group grid overflow-hidden rounded-3xl bg-white sm:grid-cols-[1fr_1.05fr]"
              key={product.name}
              variants={rise}
            >
              <div
                className={cn(
                  'flex h-80 items-end justify-center overflow-hidden px-6 pt-8 sm:h-auto',
                  product.tint
                )}
              >
                <div className="translate-y-24 transition-transform duration-500 ease-out group-hover:translate-y-20">
                  <Phone label={`Exemplo da tela ${product.name}`}>{product.screen}</Phone>
                </div>
              </div>
              <div className="flex flex-col p-7 sm:p-8">
                <h3 className="text-2xl font-semibold tracking-tight">{product.name}</h3>
                <p className="mt-3 text-base text-navy/75">{product.body}</p>
                <ul className="mt-5 flex flex-col gap-2.5 text-[15px]">
                  {product.checks.map(check => (
                    <li className="flex gap-2.5" key={check}>
                      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-accent text-primary">
                        <CheckIcon className="size-3" />
                      </span>
                      {check}
                    </li>
                  ))}
                </ul>
                <Link
                  className="mt-auto inline-flex items-center gap-1.5 pt-7 text-[15px] font-medium hover:text-primary"
                  to={SIGN_UP}
                >
                  Começar
                  <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </motion.article>
          ))}
        </div>
        <p className="mt-5 text-center text-sm text-navy/60">Telas com figuras de exemplo.</p>
      </motion.div>
    </section>
  );
}

// ---------------------------------------------------------------- simulator

/** The live thing: a loan's real installment, from the same math the app uses. */
function Simulator() {
  const [principal, setPrincipal] = useState(20_000);
  const [ratePercent, setRatePercent] = useState(3.5);
  const [months, setMonths] = useState(24);

  const installment = priceInstallment(principal * 100, ratePercent / 100, months);
  const total = installment * months;
  const interest = total - principal * 100;

  return (
    <section
      aria-labelledby="simulador-title"
      className="scroll-mt-16 bg-navy px-4 py-24 text-white sm:px-6 sm:py-32"
      id="simulador"
    >
      <motion.div
        className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-2"
        variants={stagger}
        {...onView}
      >
        <div>
          <motion.h2
            className="text-4xl leading-[1.08] font-semibold tracking-[-0.035em] sm:text-[3.25rem]"
            id="simulador-title"
            variants={rise}
          >
            Quanto custa a sua dívida?
          </motion.h2>
          <motion.p className="mt-5 max-w-lg text-lg text-slate-300" variants={rise}>
            Arraste e veja a parcela e os juros de um empréstimo na Tabela Price, com a mesma conta
            que o Caishen faz com as suas dívidas.
          </motion.p>
          <motion.div className="mt-10 grid gap-8" variants={rise}>
            <SimulatorField
              label="Valor emprestado"
              max={100_000}
              min={1_000}
              onChange={setPrincipal}
              shown={formatCents(principal * 100)}
              step={1_000}
              value={principal}
            />
            <SimulatorField
              label="Juros ao mês"
              max={12}
              min={0.5}
              onChange={setRatePercent}
              shown={`${ratePercent.toLocaleString('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 1 })}% a.m.`}
              step={0.1}
              value={ratePercent}
            />
            <SimulatorField
              label="Prazo"
              max={72}
              min={6}
              onChange={setMonths}
              shown={`${months} meses`}
              step={1}
              value={months}
            />
          </motion.div>
        </div>

        <motion.div
          aria-live="polite"
          className="flex flex-col rounded-3xl bg-white p-8 text-navy sm:p-10"
          variants={rise}
        >
          <p className="text-base text-navy/70">Parcela</p>
          <p className="mt-1 text-5xl font-semibold tracking-tight tabular-nums sm:text-6xl">
            {formatCents(installment)}
          </p>
          <p className="mt-2 text-base text-navy/70">por mês, em {months} parcelas iguais</p>
          <dl className="mt-8 grid grid-cols-2 gap-3 text-base">
            <div className="rounded-2xl bg-slate-100 p-4">
              <dt className="text-navy/70">Total pago</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums">{formatCents(total)}</dd>
            </div>
            <div className="rounded-2xl bg-rose-50 p-4">
              <dt className="text-rose-700">Só de juros</dt>
              <dd className="mt-1 text-xl font-semibold text-rose-700 tabular-nums">
                {formatCents(interest)}
              </dd>
            </div>
          </dl>
          <Button asChild className={cn(PILL, 'group mt-8 self-start')}>
            <Link to={SIGN_UP}>
              Calcular as minhas dívidas
              <ArrowRightIcon className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </motion.div>
      </motion.div>
    </section>
  );
}

function SimulatorField({
  label,
  max,
  min,
  onChange,
  shown,
  step,
  value,
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  shown: string;
  step: number;
  value: number;
}) {
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between text-base">
        <span className="text-slate-300">{label}</span>
        <span className="text-lg font-semibold tabular-nums">{shown}</span>
      </div>
      <Slider
        aria-label={label}
        max={max}
        min={min}
        onValueChange={([next]) => next !== undefined && onChange(next)}
        step={step}
        value={[value]}
      />
    </div>
  );
}

// ---------------------------------------------------------------- safety

/** The promises behind ADR 0009. */
const PROMISES: { body: string; icon: LucideIcon; title: string }[] = [
  {
    body: 'Lê o que você manda e volta com o trabalho pronto. Nunca altera nada lá fora.',
    icon: FileTextIcon,
    title: 'Só leitura',
  },
  {
    body: 'Não faz pagamentos, transferências nem contratações. Quem decide é você.',
    icon: ReceiptIcon,
    title: 'Nenhum centavo movido',
  },
  {
    body: 'Você exporta o extrato no app do banco. Nenhuma senha de banco passa por aqui.',
    icon: LandmarkIcon,
    title: 'Sem senha de banco',
  },
  {
    body: 'Juros e prazos saem de cálculo exato. A IA recebe os números prontos e explica.',
    icon: CalculatorIcon,
    title: 'Números exatos',
  },
];

function Safety() {
  return (
    <section
      aria-labelledby="seguranca-title"
      className="scroll-mt-16 px-4 py-24 sm:px-6 sm:py-32"
      id="seguranca"
    >
      <motion.div
        className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_1.4fr]"
        variants={stagger}
        {...onView}
      >
        <div>
          <motion.h2
            className="text-4xl leading-[1.08] font-semibold tracking-[-0.035em] sm:text-[3.25rem]"
            id="seguranca-title"
            variants={rise}
          >
            Feito para cuidar, não para mexer
          </motion.h2>
          <motion.p className="mt-5 max-w-md text-lg text-navy/80" variants={rise}>
            O Caishen organiza e explica. O dinheiro continua onde está, e cada decisão continua
            sua.
          </motion.p>
        </div>
        <motion.ul className="grid gap-x-10 gap-y-10 sm:grid-cols-2" variants={stagger}>
          {PROMISES.map(promise => (
            <motion.li key={promise.title} variants={rise}>
              <span className="grid size-11 place-items-center rounded-2xl bg-accent text-primary">
                <promise.icon className="size-5" />
              </span>
              <p className="mt-4 text-xl font-semibold tracking-tight">{promise.title}</p>
              <p className="mt-2 text-base text-navy/75">{promise.body}</p>
            </motion.li>
          ))}
        </motion.ul>
      </motion.div>
    </section>
  );
}

// ---------------------------------------------------------------- close

function FinalCta() {
  return (
    <section className="px-4 pb-24 sm:px-6 sm:pb-32">
      <motion.div
        className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-navy px-6 py-16 text-center text-white sm:py-24"
        variants={stagger}
        {...onView}
      >
        <motion.span
          aria-hidden
          className="absolute -top-24 -right-24 text-white/5"
          variants={{
            hidden: { opacity: 0, rotate: -20 },
            shown: { opacity: 1, rotate: 0, transition: { duration: 1.2, ease: EASE } },
          }}
        >
          <Logo size={420} />
        </motion.span>
        <motion.h2
          className="relative mx-auto max-w-3xl text-4xl leading-[1.05] font-semibold tracking-[-0.04em] sm:text-6xl"
          variants={rise}
        >
          Comece hoje, de graça
        </motion.h2>
        <motion.p className="relative mx-auto mt-5 max-w-lg text-lg text-slate-300" variants={rise}>
          Crie a conta com e-mail e senha ou com o Google e mande o primeiro extrato.
        </motion.p>
        <motion.div
          className="relative mt-9 flex flex-col justify-center gap-3 sm:flex-row"
          variants={rise}
        >
          <Button asChild className={cn(PILL, 'group')}>
            <Link to={SIGN_UP}>
              Criar conta grátis
              <ArrowRightIcon className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
          <Button
            asChild
            className={cn(PILL, 'bg-white/10 text-white hover:bg-white/15 hover:text-white')}
            variant="ghost"
          >
            <Link to="/sign-in">Já tenho conta</Link>
          </Button>
        </motion.div>
        <motion.p
          className="relative mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-400"
          variants={rise}
        >
          {['Só leitura', 'Sem senha de banco', 'Sem cartão de crédito'].map(item => (
            <span className="flex items-center gap-2" key={item}>
              <span className="size-1.5 rounded-full bg-emerald-400" />
              {item}
            </span>
          ))}
        </motion.p>
      </motion.div>
    </section>
  );
}

const FOOTER_COLUMNS: { links: { href: string; label: string }[]; title: string }[] = [
  {
    links: [
      { href: '#produtos', label: 'Fluxo de caixa' },
      { href: '#produtos', label: 'Sair das dívidas' },
      { href: '#produtos', label: 'Agente' },
      { href: '#simulador', label: 'Simulador' },
    ],
    title: 'Produto',
  },
  {
    links: [
      { href: '#como-funciona', label: 'Como funciona' },
      { href: '#seguranca', label: 'Segurança' },
      ...SOCIAL,
    ],
    title: 'Caishen',
  },
  {
    links: [
      { href: '/sign-in', label: 'Entrar' },
      { href: SIGN_UP, label: 'Criar conta' },
    ],
    title: 'Conta',
  },
  {
    links: [
      { href: '/terms', label: 'Termos de Uso' },
      { href: '/privacy', label: 'Política de Privacidade' },
    ],
    title: 'Legal',
  },
];

/** The navy close: the mark and what it stands for, the links in columns, the fine print. */
function Footer() {
  return (
    <footer className="bg-navy px-4 pt-16 pb-10 text-slate-300 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 md:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div className="text-white">
            <Brand light />
            <p className="mt-4 max-w-xs text-[15px] text-slate-400">
              Assistente financeiro para sair das dívidas e começar a investir.
            </p>
          </div>
          {FOOTER_COLUMNS.map(column => (
            <nav aria-label={column.title} key={column.title}>
              <p className="text-sm font-medium text-white">{column.title}</p>
              <ul className="mt-4 flex flex-col gap-2.5 text-[15px]">
                {column.links.map(link => (
                  <li key={link.label}>
                    {link.href.startsWith('/') ? (
                      <Link className="hover:text-white" to={link.href}>
                        {link.label}
                      </Link>
                    ) : (
                      <a className="hover:text-white" href={link.href}>
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <p className="mt-14 max-w-3xl text-[13px] text-slate-500">
          O Caishen não é uma instituição financeira, não oferece crédito nem recomenda
          investimentos, e nunca movimenta dinheiro. Os cálculos partem dos dados que você informa e
          servem para entender e planejar; confira sempre os valores com a sua instituição.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 text-[13px] text-slate-500">
          <p>
            © {new Date().getFullYear()} Caishen · {COMPANY.name} · CNPJ {COMPANY.cnpj}
          </p>
          <a className="inline-flex items-center gap-1 hover:text-white" href="#conteudo">
            De volta ao topo
            <ArrowUpIcon className="size-3.5" />
          </a>
        </div>
      </div>
    </footer>
  );
}
