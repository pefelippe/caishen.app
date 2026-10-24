import { priceInstallment } from '@zapbots/finance';
import {
  ArrowRightIcon,
  ArrowUpIcon,
  ArrowUpRightIcon,
  CalculatorIcon,
  EyeIcon,
  FileSpreadsheetIcon,
  HandCoinsIcon,
  KeyRoundIcon,
  type LucideIcon,
} from 'lucide-react';
import { MotionConfig, motion, type Variants } from 'motion/react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Logo } from '@zapbots/ui/blocks/logo';
import { Badge } from '@zapbots/ui/components/badge';
import { Button } from '@zapbots/ui/components/button';
import { Slider } from '@zapbots/ui/components/slider';
import { cn } from '@zapbots/ui/lib/utils';

import { TEAM, UPCOMING_BOTS } from '../lib/bots';
import { formatCents } from '../lib/format';

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
  viewport: { amount: 0.2, once: true },
  whileInView: 'shown',
} as const;

// ---------------------------------------------------------------- content

const NAV = [
  { href: '#assistentes', label: 'Assistentes' },
  { href: '#importacao', label: 'Importação' },
  { href: '#simulador', label: 'Simulador' },
  { href: '#painel', label: 'Painel' },
];

/** The promises behind ADR 0009. */
const PROMISES: { description: string; icon: LucideIcon; title: string }[] = [
  {
    description: 'Lê o que você conecta e volta com o trabalho pronto. Nunca altera nada lá fora.',
    icon: EyeIcon,
    title: 'Só leitura',
  },
  {
    description: 'Não faz pagamentos, transferências nem contratações. Quem decide é você.',
    icon: HandCoinsIcon,
    title: 'Nenhum centavo movido',
  },
  {
    description: 'As Integrações usam o login oficial de cada serviço. Nenhuma senha guardada.',
    icon: KeyRoundIcon,
    title: 'Sem senhas',
  },
  {
    description: 'Juros e Score saem de cálculo exato. A IA recebe os números prontos e explica.',
    icon: CalculatorIcon,
    title: 'Números exatos',
  },
];

/**
 * The Caishen's profiles elsewhere. Empty until the accounts exist; the footer shows the list only
 * when there is something in it.
 */
const SOCIAL: { href: string; label: string }[] = [];

// ---------------------------------------------------------------- page

/** The page for visitors who are not signed in. "Entrar" leads to the LoginPage at /sign-in. */
export function LandingPage() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-svh overflow-x-clip bg-background text-foreground">
        <a
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
          href="#conteudo"
        >
          Pular para o conteúdo
        </a>
        <Header />
        <main id="conteudo">
          <Hero />
          <Assistants />
          <Import />
          <Simulator />
          <Showcase />
          <FinalCta />
        </main>
        <Footer />
      </div>
    </MotionConfig>
  );
}

function Brand({ className }: { className?: string }) {
  return (
    <Link className={cn('flex items-center gap-2.5', className)} to="/">
      <Logo size={26} />
      <span className="text-lg font-semibold tracking-tight">Caishen</span>
    </Link>
  );
}

/**
 * A plain navy bar in three parts: the wordmark, the sections in the middle, and the way in on
 * the right, over a thin rule.
 */
function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-navy px-4 text-header-foreground sm:px-6">
      <div className="mx-auto grid h-16 max-w-6xl grid-cols-[1fr_auto] items-center gap-4 lg:grid-cols-[1fr_auto_1fr]">
        <Brand />
        <nav aria-label="Seções" className="hidden items-center gap-8 lg:flex">
          {NAV.map(link => (
            <a
              className="text-[15px] text-header-foreground/80 transition-colors hover:text-header-foreground"
              href={link.href}
              key={link.href}
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center justify-end gap-1 sm:gap-2">
          <Button
            asChild
            className="text-header-foreground hover:bg-white/10 hover:text-header-foreground"
            variant="ghost"
          >
            <Link to="/sign-in">Entrar</Link>
          </Button>
          <Button asChild className="group">
            <Link to="/sign-in">
              Começar grátis
              <ArrowUpRightIcon className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="overflow-hidden bg-navy px-4 pt-14 text-white sm:px-6 sm:pt-24"
    >
      <div className="mx-auto max-w-6xl">
        <div>
          <motion.h1
            animate="shown"
            className="max-w-5xl text-[2.5rem] leading-[1.05] font-semibold tracking-[-0.035em] text-balance sm:text-7xl lg:text-[5.5rem]"
            id="hero-title"
            initial="hidden"
            variants={rise}
          >
            Suas dívidas, com data para{' '}
            <span className="rounded-[0.12em] bg-primary px-[0.12em] box-decoration-clone">
              acabar
            </span>
            .
          </motion.h1>
          <motion.div animate="shown" className="mt-8" initial="hidden" variants={stagger}>
            <motion.p className="max-w-xl text-lg text-pretty text-slate-200" variants={rise}>
              O Caishen lê suas planilhas, calcula os juros de cada dívida e monta o plano para você
              quitar tudo. É o primeiro de uma equipe de assistentes pessoais.
            </motion.p>
            <motion.div
              className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap"
              variants={rise}
            >
              <Button asChild className="h-12 px-6 text-base" size="lg">
                <Link to="/sign-in">
                  Começar gratuitamente
                  <ArrowRightIcon />
                </Link>
              </Button>
              <Button
                asChild
                className="h-12 bg-white/10 px-6 text-base text-white hover:bg-white/15 hover:text-white"
                size="lg"
                variant="ghost"
              >
                <a href="#painel">Ver demonstração</a>
              </Button>
            </motion.div>
          </motion.div>
        </div>

        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="mt-14 sm:mt-20"
          initial={{ opacity: 0, y: 48 }}
          transition={{ delay: 0.3, duration: 0.9, ease: EASE }}
        >
          <AppPreview />
        </motion.div>
      </div>
    </section>
  );
}

/** What falls due in the example month; the amounts add up to "Parcelas do mês". */
const PREVIEW_DUE = [
  {
    amount: 'R$ 1.212,00',
    date: '10/out',
    detail: 'Parcela 18 de 60',
    name: 'Financiamento Caixa',
  },
  { amount: 'R$ 644,00', date: '15/out', detail: 'Parcela 7 de 24', name: 'Empréstimo Itaú' },
  { amount: 'R$ 460,00', date: '25/out', detail: 'Fatura', name: 'Cartão Visa' },
];

/**
 * The app as it looks signed in, built in HTML with example figures. It rises from the bottom of the
 * hero: only its top corners are rounded and its lower edge is the hero's.
 */
function AppPreview() {
  return (
    <div
      aria-label="Exemplo do painel do Caishen"
      className="overflow-hidden rounded-t-2xl bg-navy-soft text-left text-slate-900"
      data-ui
      role="img"
    >
      <div className="flex items-center gap-2 px-4 py-3 text-slate-300 sm:px-5">
        <Logo size={16} />
        <span className="text-sm font-medium">Caishen</span>
        <span className="ml-auto truncate rounded-full bg-white/10 px-3 py-1 text-[13px] text-slate-400 sm:w-72">
          Pergunte ao Caishen…
        </span>
      </div>
      <div className="flex">
        <div className="hidden w-44 shrink-0 flex-col gap-1 px-3 pb-3 text-[13px] text-slate-300 md:flex">
          {['Página inicial', 'Visão geral', 'Fluxo de caixa', 'Score de crédito'].map(
            (item, index) => (
              <span
                className={cn(
                  'rounded-md px-2.5 py-1.5',
                  index === 2 && 'bg-white/10 font-medium text-white'
                )}
                key={item}
              >
                {item}
              </span>
            )
          )}
        </div>
        <div className="mx-2 flex-1 rounded-t-xl bg-background p-4 sm:p-6 md:ml-0">
          <p className="text-lg font-semibold">Outubro de 2026</p>
          <p className="text-[13px] text-muted-foreground">Exemplo</p>
          <div className="mt-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            <PreviewMetric label="Score" tone="text-success" value="742" />
            <PreviewMetric label="Saldo devedor" value="R$ 38.420" />
            <PreviewMetric label="Renda mensal" value="R$ 9.850" />
            <PreviewMetric label="Parcelas do mês" value="R$ 2.316" />
          </div>
          <div className="mt-2.5 grid gap-2.5 lg:grid-cols-[1.5fr_1fr]">
            <div className="rounded-lg bg-white p-4">
              <p className="text-sm font-medium">Compromissos de outubro</p>
              <div className="mt-2 flex flex-col">
                {PREVIEW_DUE.map(item => (
                  <div className="flex items-center gap-3 py-2 text-[13px]" key={item.name}>
                    <span className="w-12 shrink-0 text-muted-foreground tabular-nums">
                      {item.date}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{item.name}</span>
                      <span className="block text-muted-foreground">{item.detail}</span>
                    </span>
                    <span className="font-medium tabular-nums">{item.amount}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col rounded-lg bg-primary p-4 text-primary-foreground">
              <p className="text-sm text-white/80">Plano de Quitação</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">Sem dívidas em ago/2028</p>
              <p className="mt-auto pt-4 text-[13px] text-white/80">
                Pagando R$ 2.500 por mês, a maior taxa primeiro: R$ 6.940 a menos em juros.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewMetric({ label, tone, value }: { label: string; tone?: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-3">
      <p className="text-[13px] text-muted-foreground">{label}</p>
      <p className={cn('mt-0.5 text-lg font-semibold tabular-nums', tone)}>{value}</p>
    </div>
  );
}

function SectionHeading({
  children,
  id,
  tone,
}: {
  children: ReactNode;
  id: string;
  tone?: string;
}) {
  return (
    <motion.h2
      className={cn(
        'text-3xl font-semibold tracking-[-0.02em] text-balance sm:text-[2.75rem] sm:leading-[1.1]',
        tone
      )}
      id={id}
      variants={rise}
    >
      {children}
    </motion.h2>
  );
}

/** What a card shows of each Assistant: a piece of its screen, with example figures. */
function FinanceGlimpse() {
  return (
    <div className="flex flex-col gap-2.5 text-sm" data-ui>
      {[
        ['Cartão Visa', 'R$ 460,00'],
        ['Empréstimo Itaú', 'R$ 644,00'],
      ].map(([name, amount]) => (
        <div className="flex justify-between" key={name}>
          <span className="text-muted-foreground">{name}</span>
          <span className="font-medium tabular-nums">{amount}</span>
        </div>
      ))}
      <div className="mt-1 flex justify-between border-t pt-2.5">
        <span>Sem dívidas em</span>
        <span className="font-semibold text-primary tabular-nums">ago/2028</span>
      </div>
    </div>
  );
}

/** The Assistants side by side, one column each: the working one first, then those to come. */
function Assistants() {
  const finance = TEAM[0]!;
  const cards = [
    {
      description: finance.description,
      glimpse: <FinanceGlimpse />,
      icon: finance.icon,
      label: 'Disponível',
      name: finance.name,
      soon: false,
    },
    ...UPCOMING_BOTS.map(bot => ({
      description: bot.description,
      glimpse: (
        <ul className="flex flex-wrap gap-2" data-ui>
          {bot.sections.map(section => (
            <li
              className="flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-[13px] text-muted-foreground"
              key={section.label}
            >
              <section.icon className="size-3.5" />
              {section.label}
            </li>
          ))}
        </ul>
      ),
      icon: bot.icon,
      label: 'Em breve',
      name: bot.name,
      soon: true,
    })),
  ];

  return (
    <section
      aria-labelledby="assistentes-title"
      className="scroll-mt-16 bg-white px-4 py-24 sm:px-6 sm:py-32"
      id="assistentes"
    >
      <motion.div className="mx-auto max-w-6xl" variants={stagger} {...onView}>
        <SectionHeading id="assistentes-title">
          Um assistente para cada parte da vida
        </SectionHeading>
        <motion.p className="mt-4 max-w-2xl text-lg text-foreground" variants={rise}>
          Cada assistente cuida de um campo e conversa com você sobre ele. O de finanças já está
          trabalhando para tirar você das dívidas; os outros dois estão a caminho.
        </motion.p>

        <div className="mt-14 grid border-t md:grid-cols-3">
          {cards.map((card, index) => (
            <motion.article
              className={cn(
                'flex flex-col gap-4 border-b py-8 md:border-b-0 md:px-7 md:first:pl-0 md:last:pr-0 [&:not(:last-child)]:md:border-r',
                card.soon && 'text-foreground/80'
              )}
              key={card.name}
              variants={rise}
            >
              <div className="flex items-center justify-between">
                <card.icon
                  className={cn('size-6', card.soon ? 'text-muted-foreground' : 'text-primary')}
                />
                <span className="text-[13px] text-muted-foreground tabular-nums">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>
              <p
                className={cn(
                  'text-[13px] font-medium',
                  card.soon ? 'text-muted-foreground' : 'text-primary'
                )}
              >
                {card.label}
              </p>
              <h3 className="text-2xl font-semibold tracking-tight">{card.name}</h3>
              <p className="text-base text-muted-foreground">{card.description}</p>
              <div className="mt-auto rounded-xl bg-secondary/70 p-5">{card.glimpse}</div>
              {!card.soon && (
                <Button asChild className="group mt-2 self-start px-0" variant="link">
                  <Link to="/sign-in">
                    Usar o {card.name}
                    <ArrowRightIcon className="transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
              )}
            </motion.article>
          ))}
        </div>

        <motion.ul
          className="mt-4 grid gap-8 border-t pt-10 sm:grid-cols-2 lg:grid-cols-4"
          variants={stagger}
        >
          {PROMISES.map(promise => (
            <motion.li className="flex gap-3" key={promise.title} variants={rise}>
              <promise.icon className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <p className="font-semibold">{promise.title}</p>
                <p className="mt-1 text-[15px] text-muted-foreground">{promise.description}</p>
              </div>
            </motion.li>
          ))}
        </motion.ul>
      </motion.div>
    </section>
  );
}

/** Example lines of a bank statement, as they come out of the bank. */
const STATEMENT = [
  { amount: 'R$ 5.200,00', date: '05/10', text: 'SALARIO ACME LTDA' },
  { amount: '-R$ 1.480,00', date: '06/10', text: 'ALUGUEL OUTUBRO' },
  { amount: '-R$ 312,47', date: '08/10', text: 'SUPERMERCADO BOM PRECO' },
  { amount: '-R$ 89,90', date: '09/10', text: 'INTERNET FIBRA' },
  { amount: '-R$ 46,30', date: '11/10', text: 'FARMACIA SAO JOAO' },
];

/** A spreadsheet going in on the left, Gastos coming out on the right. */
function Import() {
  return (
    <section
      aria-labelledby="importacao-title"
      className="scroll-mt-16 bg-background px-4 py-24 sm:px-6 sm:py-32"
      id="importacao"
    >
      <motion.div
        className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1fr_1.15fr]"
        variants={stagger}
        {...onView}
      >
        <div>
          <SectionHeading id="importacao-title">Sua planilha entra como está</SectionHeading>
          <motion.p className="mt-5 text-lg" variants={rise}>
            Exporte o extrato do banco ou use a planilha que você já tem, em .csv, .xlsx, .ofx ou
            .pdf. O Caishen lê as colunas, e num extrato com entradas e saídas só as saídas viram
            Gastos do mês. Importar o mesmo OFX de novo não duplica nada. Nada para instalar e
            nenhuma senha do banco.
          </motion.p>
          <motion.ul className="mt-7 grid gap-3 text-base" variants={rise}>
            <li className="flex items-center gap-3">
              <FileSpreadsheetIcon className="size-5 text-primary" />
              Excel (.xlsx), CSV e OFX, hoje
            </li>
            <li className="flex items-center gap-3 text-muted-foreground">
              <FileSpreadsheetIcon className="size-5" />
              Open Finance, direto do seu banco
              <Badge variant="secondary">Em breve</Badge>
            </li>
          </motion.ul>
        </div>

        <motion.div
          aria-label="Exemplo: um extrato importado vira a lista de Gastos"
          className="grid gap-3 sm:grid-cols-2"
          data-ui
          role="img"
          variants={rise}
        >
          <div className="rounded-xl bg-navy p-4 text-[13px] text-slate-300">
            <p className="mb-3 font-medium text-white">extrato-outubro.csv</p>
            {STATEMENT.map(line => (
              <p className="flex gap-2 py-1 tabular-nums" key={line.text}>
                <span className="text-slate-400">{line.date}</span>
                <span className="min-w-0 flex-1 truncate">{line.text}</span>
                <span>{line.amount}</span>
              </p>
            ))}
          </div>
          <div className="rounded-xl bg-white p-4 text-[13px]">
            <p className="mb-3 flex items-center justify-between font-medium">
              Gastos de outubro
              <span className="text-muted-foreground tabular-nums">4 lançamentos</span>
            </p>
            {STATEMENT.filter(line => line.amount.startsWith('-')).map(line => (
              <p className="flex gap-2 py-1 tabular-nums" key={line.text}>
                <span className="min-w-0 flex-1 truncate capitalize">
                  {line.text.toLowerCase()}
                </span>
                <span className="font-medium">{line.amount.slice(1)}</span>
              </p>
            ))}
            <p className="mt-3 flex justify-between rounded-lg bg-accent px-3 py-2 font-semibold text-accent-foreground tabular-nums">
              Total <span>R$ 1.928,67</span>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}

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
      className="scroll-mt-16 bg-navy-soft px-4 py-24 text-white sm:px-6 sm:py-32"
      id="simulador"
    >
      <motion.div
        className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-[1fr_1fr]"
        variants={stagger}
        {...onView}
      >
        <div>
          <SectionHeading id="simulador-title">Quanto custa a sua dívida?</SectionHeading>
          <motion.p className="mt-5 max-w-lg text-lg text-slate-300" variants={rise}>
            Arraste e veja a parcela e os juros de um empréstimo na Tabela Price, com a mesma conta
            exata que o Caishen faz com as suas Operações.
          </motion.p>
          <motion.div className="mt-10 grid gap-8" variants={rise}>
            <SimulatorField
              label="Valor emprestado"
              max={100_000}
              min={1_000}
              onChange={setPrincipal}
              step={1_000}
              value={principal}
              shown={formatCents(principal * 100)}
            />
            <SimulatorField
              label="Juros ao mês"
              max={12}
              min={0.5}
              onChange={setRatePercent}
              step={0.1}
              value={ratePercent}
              shown={`${ratePercent.toLocaleString('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 1 })}% a.m.`}
            />
            <SimulatorField
              label="Prazo"
              max={72}
              min={6}
              onChange={setMonths}
              step={1}
              value={months}
              shown={`${months} meses`}
            />
          </motion.div>
        </div>

        <motion.div
          aria-live="polite"
          className="flex flex-col justify-center rounded-2xl bg-white p-8 text-foreground sm:p-10"
          variants={rise}
        >
          <p className="text-5xl font-semibold tracking-tight tabular-nums sm:text-6xl">
            {formatCents(installment)}
          </p>
          <p className="mt-2 text-base text-muted-foreground">
            por mês, em {months} parcelas iguais
          </p>
          <dl className="mt-8 grid grid-cols-2 gap-4 text-base">
            <div className="rounded-xl bg-background p-4">
              <dt className="text-muted-foreground">Total pago</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums">{formatCents(total)}</dd>
            </div>
            <div className="rounded-xl bg-accent p-4">
              <dt className="text-accent-foreground/80">Só de juros</dt>
              <dd className="mt-1 text-xl font-semibold text-accent-foreground tabular-nums">
                {formatCents(interest)}
              </dd>
            </div>
          </dl>
          <Button asChild className="mt-8 h-11 self-start px-5" size="lg">
            <Link to="/sign-in">Calcular as minhas dívidas</Link>
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

/** The six months of the example in the showcase, debt going down as the plan runs. */
const DEBT_MONTHS = [
  { label: 'mai', value: 46 },
  { label: 'jun', value: 44 },
  { label: 'jul', value: 42.5 },
  { label: 'ago', value: 41 },
  { label: 'set', value: 39.6 },
  { label: 'out', value: 38.4 },
];

/** The report, at full size, with example figures; what "Ver demonstração" leads to. */
function Showcase() {
  return (
    <section
      aria-labelledby="painel-title"
      className="scroll-mt-16 bg-white px-4 py-24 sm:px-6 sm:py-32"
      id="painel"
    >
      <motion.div className="mx-auto max-w-6xl" variants={stagger} {...onView}>
        <div className="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-end">
          <SectionHeading id="painel-title">Tudo o que você deve, num painel</SectionHeading>
          <motion.p className="text-lg" variants={rise}>
            Score, Saldo Devedor e Renda Mensal lado a lado, cada Operação comparada à taxa média do
            Bacen e o dia em que você fica sem dívidas.
          </motion.p>
        </div>

        <motion.div
          aria-label="Exemplo da Visão geral do Caishen"
          className="mt-14 rounded-2xl bg-background p-4 sm:p-6"
          data-ui
          role="img"
          variants={rise}
        >
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-white p-5">
              <p className="text-sm text-muted-foreground">Score</p>
              <p className="mt-1 text-4xl font-semibold text-success tabular-nums">742</p>
              <div className="mt-4 flex h-2 overflow-hidden rounded-full">
                <span className="w-[30%] bg-destructive/70" />
                <span className="w-[40%] bg-warning/70" />
                <span className="w-[30%] bg-success" />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">Baixo risco · faixa SPC 701–1000</p>
            </div>
            <div className="rounded-xl bg-white p-5">
              <p className="text-sm text-muted-foreground">Saldo devedor</p>
              <p className="mt-1 text-4xl font-semibold tabular-nums">R$ 38.420</p>
              <p className="mt-4 text-sm text-success">−R$ 7.580 em seis meses</p>
              <p className="mt-1 text-sm text-muted-foreground">3 Operações e 1 Cartão</p>
            </div>
            <div className="rounded-xl bg-white p-5">
              <p className="text-sm text-muted-foreground">Renda mensal</p>
              <p className="mt-1 text-4xl font-semibold tabular-nums">R$ 9.850</p>
              <p className="mt-4 text-sm text-muted-foreground">Salário e um aluguel recebido</p>
              <p className="mt-1 text-sm text-muted-foreground">23% vai para Parcelas</p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[1.4fr_1fr]">
            <div className="rounded-xl bg-white p-5">
              <p className="text-sm font-medium">Saldo devedor, em milhares de reais</p>
              <div className="mt-5 flex h-40 items-end gap-3">
                {DEBT_MONTHS.map((month, index) => (
                  <div className="flex flex-1 flex-col items-center gap-2" key={month.label}>
                    <motion.div
                      className={cn(
                        'w-full rounded-t-md',
                        index === DEBT_MONTHS.length - 1 ? 'bg-primary' : 'bg-primary/25'
                      )}
                      initial={{ height: 0 }}
                      transition={{ delay: index * 0.07, duration: 0.6, ease: EASE }}
                      viewport={{ once: true }}
                      whileInView={{ height: (month.value / 46) * 128 }}
                    />
                    <span className="text-[13px] text-muted-foreground">{month.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl bg-navy p-5 text-white">
              <p className="text-sm text-slate-300">Plano de Quitação</p>
              <p className="mt-1 text-3xl font-semibold">Sem dívidas em ago/2028</p>
              <p className="mt-3 text-base text-slate-300">
                Com R$ 2.500 por mês, sempre na Operação de maior taxa, você economiza R$ 6.940 em
                juros.
              </p>
            </div>
          </div>
        </motion.div>
        <p className="mt-4 text-sm text-muted-foreground">Figuras de exemplo.</p>
      </motion.div>
    </section>
  );
}

/** The way in: one blue block with the plan in two lines and the Caishen's mark beside it. */
function FinalCta() {
  return (
    <section className="bg-background px-4 py-20 sm:px-6 sm:py-28">
      <motion.div
        className="relative mx-auto grid max-w-6xl items-center gap-10 overflow-hidden rounded-2xl bg-primary px-6 py-12 text-primary-foreground sm:px-14 sm:py-16 md:grid-cols-[1fr_auto]"
        variants={stagger}
        {...onView}
      >
        <div>
          <motion.p className="text-[13px] font-medium text-white/80" variants={rise}>
            Comece por aqui
          </motion.p>
          <motion.h2
            className="mt-4 text-4xl leading-[1.05] font-semibold tracking-[-0.03em] text-balance sm:text-6xl"
            variants={rise}
          >
            Saia das dívidas.
          </motion.h2>
          <motion.p className="mt-5 max-w-xl text-lg text-white/90" variants={rise}>
            Com um plano de verdade, que diz quando a última parcela acaba. Grátis e sem senha: você
            entra com um link no seu e-mail ou com o Google.
          </motion.p>
          <motion.div variants={rise}>
            <Button
              asChild
              className="group mt-8 h-12 bg-navy px-6 text-base text-white hover:bg-navy/90"
              size="lg"
            >
              <Link to="/sign-in">
                Começar gratuitamente
                <ArrowUpRightIcon className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </Button>
          </motion.div>
        </div>
        <motion.div
          aria-hidden
          className="hidden text-navy md:block"
          variants={{
            hidden: { opacity: 0, rotate: -12, scale: 0.8 },
            shown: {
              opacity: 1,
              rotate: 0,
              scale: 1,
              transition: { damping: 14, stiffness: 160, type: 'spring' },
            },
          }}
        >
          <Logo size={200} />
        </motion.div>
      </motion.div>
    </section>
  );
}

const FOOTER_LINKS = [...NAV, { href: '/sign-in', label: 'Entrar' }];

/** A light close: the mark and what it stands for, the links, the fine print, and the way back up. */
function Footer() {
  return (
    <footer className="bg-background px-4 pb-10 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-start gap-8 md:grid-cols-[1fr_1fr_auto]">
          <Brand />
          <p className="max-w-xs text-base text-muted-foreground">
            Assistente financeiro para sair das dívidas e começar a investir.
          </p>
          <nav aria-label="Rodapé" className="flex flex-wrap gap-x-6 gap-y-2">
            {[...FOOTER_LINKS, ...SOCIAL].map(link =>
              link.href.startsWith('/') ? (
                <Link
                  className="text-[15px] text-foreground/80 hover:text-foreground"
                  key={link.label}
                  to={link.href}
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  className="text-[15px] text-foreground/80 hover:text-foreground"
                  href={link.href}
                  key={link.label}
                >
                  {link.label}
                </a>
              )
            )}
          </nav>
        </div>
        <p className="mt-10 max-w-3xl text-[13px] text-muted-foreground">
          O Caishen não é uma instituição financeira, não oferece crédito nem recomenda
          investimentos, e nunca movimenta dinheiro. Os cálculos partem dos dados que você informa e
          servem para entender e planejar; confira sempre os valores com a sua instituição.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t pt-6 text-[13px] text-muted-foreground">
          <p>© {new Date().getFullYear()} Caishen</p>
          <Button asChild className="h-auto px-0 text-[13px] text-muted-foreground" variant="link">
            <a href="#conteudo">
              De volta ao topo
              <ArrowUpIcon />
            </a>
          </Button>
        </div>
      </div>
    </footer>
  );
}
