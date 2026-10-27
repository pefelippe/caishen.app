import {
  addMonths,
  avalanchePlan,
  priceInstallment,
  type IsoDate,
  type PlanDebt,
} from '@zapbots/finance';
import { MotionConfig, motion, type Variants } from 'motion/react';
import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Logo } from '@zapbots/ui/blocks/logo';
import { Button } from '@zapbots/ui/components/button';
import { Input } from '@zapbots/ui/components/input';
import { Slider } from '@zapbots/ui/components/slider';
import { Switch } from '@zapbots/ui/components/switch';
import { cn } from '@zapbots/ui/lib/utils';

import { formatCents } from '../lib/format';
import { COMPANY } from '../lib/legal';

/*
 * On this page, the carnê de parcelas (the Brazilian booklet of installment stubs) becomes the live
 * control: set the loan and the page reads back the installment, the interest and the month the
 * last stub falls. Around it, the name: Caishen, the god of wealth, in museum porcelain, and the
 * red of a seal as the one accent.
 */

// ---------------------------------------------------------------- motion

const EASE = [0.22, 1, 0.36, 1] as const;

/** A part of a section that rises into place the first time it scrolls into view. */
const rise: Variants = {
  hidden: { opacity: 0, y: 24 },
  shown: { opacity: 1, transition: { duration: 0.6, ease: EASE }, y: 0 },
};

/** A section whose parts rise one after another. */
const stagger: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.08 } },
};

const onView = {
  initial: 'hidden',
  viewport: { amount: 0.15, once: true },
  whileInView: 'shown',
} as const;

// ---------------------------------------------------------------- content

const SIGN_UP = '/sign-in?step=sign-up';

const today = (): IsoDate => new Date().toISOString().slice(0, 10);

const MONTH = new Intl.DateTimeFormat('pt-BR', {
  month: 'short',
  timeZone: 'UTC',
  year: 'numeric',
});
/** "ago. de 2027" → "ago. 2027". */
const monthLabel = (date: IsoDate) =>
  MONTH.format(new Date(`${date}T12:00:00Z`)).replace(' de ', ' ');

const percent = (value: number) =>
  `${value.toLocaleString('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%`;

/** The page for visitors who are not signed in. "Entrar" leads to /sign-in. */
export function LandingPage() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="landing min-h-svh overflow-x-clip bg-(--l-bg) text-(--l-ink)">
        <a
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-(--l-ink) focus:px-4 focus:py-2 focus:text-white"
          href="#conteudo"
        >
          Pular para o conteúdo
        </a>
        <main id="conteudo">
          <Hero />
          <HowItWorks />
          <Showcase />
          <Reads />
          <Letter />
          <Start />
        </main>
        <Footer />
      </div>
    </MotionConfig>
  );
}

// ---------------------------------------------------------------- hero

/** One line of the headline, rising from behind its own baseline. */
function MaskedLine({ children, delay }: { children: ReactNode; delay: number }) {
  return (
    <span className="block overflow-hidden pb-[0.08em]">
      <motion.span
        animate={{ y: 0 }}
        className="block"
        initial={{ y: '105%' }}
        transition={{ delay, duration: 0.9, ease: EASE }}
      >
        {children}
      </motion.span>
    </span>
  );
}

function Hero() {
  return (
    <section className="relative grid bg-(--l-dark) text-(--l-paper) lg:min-h-svh lg:grid-cols-2">
      <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 pt-6 sm:px-10 lg:pt-10">
        <Link className="flex items-center gap-2.5" to="/">
          <Logo className="text-(--l-seal-light)" size={26} />
          <span className="text-(length:--step-body) font-medium">Caishen</span>
        </Link>
        <Link className="text-[15px] underline-offset-4 hover:underline" to="/sign-in">
          Entrar
        </Link>
      </header>
      <div className="relative flex flex-col justify-end px-5 pt-36 pb-12 sm:px-10 lg:pt-0 lg:pb-10">
        <h1 className="font-display text-(length:--step-head) leading-[1.05] font-light tracking-[-0.022em]">
          <MaskedLine delay={0.1}>Quanto falta</MaskedLine>
          <MaskedLine delay={0.21}>para quitar tudo?</MaskedLine>
        </h1>
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 16 }}
          transition={{ delay: 0.7, duration: 0.6, ease: EASE }}
        >
          <p className="mt-5 max-w-[44ch] text-(length:--step-body) text-(--l-paper-soft)">
            O Caishen lê seus extratos e faturas, junta as dívidas e diz a parcela, os juros e o mês
            em que você fica livre. Sem senha de banco.
          </p>
          <Button
            asChild
            className="mt-8 h-12 rounded-md bg-(--l-seal) px-6 text-(length:--step-body) text-white transition-transform hover:bg-(--l-seal-dark) active:scale-[0.98]"
          >
            <Link to={SIGN_UP}>Criar conta grátis</Link>
          </Button>
        </motion.div>
      </div>

      <div className="relative flex items-center justify-center bg-(--l-dark-step) px-4 py-12 sm:py-16">
        <Carne />
      </div>
    </section>
  );
}

/**
 * The live thing: a loan set by three controls and read back as the booklet of stubs it becomes,
 * with the same Price math the app uses for the User's own debts.
 */
function Carne() {
  const [principal, setPrincipal] = useState(20_000);
  const [ratePercent, setRatePercent] = useState(4.2);
  const [months, setMonths] = useState(24);

  const installment = priceInstallment(principal * 100, ratePercent / 100, months);
  const total = installment * months;
  const start = addMonths(today().slice(0, 8) + '10', 1);
  const last = addMonths(start, months - 1);

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      aria-label="Simulador de parcelas"
      className="w-full max-w-[450px] rounded-lg bg-(--l-paper) p-6 text-(--l-ink) sm:p-7"
      data-ui
      initial={{ opacity: 0, y: 24 }}
      role="group"
      transition={{ delay: 0.3, duration: 0.8, ease: EASE }}
    >
      <div className="flex items-baseline justify-between text-[13px] text-(--l-muted)">
        <span>Carnê · Empréstimo pessoal</span>
        <span className="tabular-nums">Tabela Price</span>
      </div>

      <div className="mt-5 grid gap-5">
        <CarneField
          label="Valor emprestado"
          max={100_000}
          min={1_000}
          onChange={setPrincipal}
          shown={formatCents(principal * 100)}
          step={500}
          value={principal}
        />
        <CarneField
          label="Juros ao mês"
          max={12}
          min={0.5}
          onChange={setRatePercent}
          shown={`${percent(ratePercent)} a.m.`}
          step={0.1}
          value={ratePercent}
        />
        <CarneField
          label="Prazo"
          max={72}
          min={6}
          onChange={setMonths}
          shown={`${months} meses`}
          step={1}
          value={months}
        />
      </div>

      <div aria-live="polite" className="mt-6 rounded-md bg-(--l-surface) p-4">
        <p className="text-[13px] text-(--l-muted)">Parcela</p>
        <p className="font-display text-[44px] leading-none font-light tracking-[-0.022em] tabular-nums">
          {formatCents(installment)}
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-[14px]">
          <dt className="text-(--l-muted)">Total pago</dt>
          <dd className="text-right tabular-nums">{formatCents(total)}</dd>
          <dt className="text-(--l-muted)">Só de juros</dt>
          <dd className="text-right text-(--l-seal) tabular-nums">
            {formatCents(total - principal * 100)}
          </dd>
          <dt className="text-(--l-muted)">Última parcela</dt>
          <dd className="text-right tabular-nums">{monthLabel(last)}</dd>
        </dl>
      </div>

      <ol aria-label="Primeiras parcelas" className="mt-4 grid grid-cols-3 gap-2 text-[13px]">
        {[0, 1, 2].map(index => (
          <li
            className="rounded-md border border-dashed border-(--l-rule) px-2.5 py-2 tabular-nums"
            key={index}
          >
            <span className="block text-(--l-muted)">
              {index + 1}/{months}
            </span>
            <span className="block">{monthLabel(addMonths(start, index))}</span>
          </li>
        ))}
      </ol>
    </motion.div>
  );
}

function CarneField({
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
      <div className="mb-2.5 flex items-baseline justify-between text-[14px]">
        <span className="text-(--l-muted)">{label}</span>
        <span className="font-medium tabular-nums">{shown}</span>
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

// ---------------------------------------------------------------- how it works

/** The sample loan the four fields follow: R$ 20.000 at 4,2% a.m. in 24 Price installments. */
const SAMPLE_DEBT: PlanDebt = {
  id: 'loan',
  input: {
    firstDueDate: '2026-04-10',
    monthlyRate: '0.042',
    principalCents: 2_000_000,
    system: 'PRICE',
    termMonths: 24,
  },
};
const SAMPLE_INSTALLMENT = priceInstallment(2_000_000, 0.042, 24);
const SAMPLE_PLAN = avalanchePlan([SAMPLE_DEBT], '2026-10-27', 30_000);

const FIELDS: { card: ReactNode; clause: [string, string]; tone: string }[] = [
  {
    card: (
      <>
        <p className="text-[13px] text-(--l-muted)">Extrato Nubank · 10/10</p>
        <p className="mt-2 text-[14px] break-words">PIX ENVIADO 04.395.471 CRED PESSOAL</p>
        <p className="mt-3 text-[15px] font-medium tabular-nums">
          − {formatCents(SAMPLE_INSTALLMENT)}
        </p>
        <p className="mt-3 text-[13px] text-(--l-muted)">Sem categoria</p>
      </>
    ),
    clause: ['Primeiro,', 'o extrato chega.'],
    tone: 'bg-(--l-surface) text-(--l-ink)',
  },
  {
    card: (
      <>
        <p className="text-[13px] text-(--l-muted)">Gasto · 10 out.</p>
        <p className="mt-2 text-[15px] font-medium">Parcela do empréstimo</p>
        <p className="mt-3 text-[15px] tabular-nums">{formatCents(SAMPLE_INSTALLMENT)}</p>
        <p className="mt-3 inline-block rounded bg-(--l-surface) px-2 py-0.5 text-[13px]">
          Dívidas
        </p>
      </>
    ),
    clause: ['Depois,', 'vira um gasto.'],
    tone: 'bg-(--l-sand) text-(--l-ink)',
  },
  {
    card: (
      <>
        <p className="text-[13px] text-(--l-muted)">Empréstimo · 4,2% a.m.</p>
        <p className="mt-2 text-[15px] font-medium">Parcela 7 de 24</p>
        <div aria-hidden className="mt-3 h-1.5 overflow-hidden rounded-full bg-(--l-surface)">
          <div className="h-full w-[29%] rounded-full bg-(--l-ink)" />
        </div>
        <p className="mt-3 text-[13px] text-(--l-muted)">17 parcelas pela frente</p>
      </>
    ),
    clause: ['Então,', 'entra no plano.'],
    tone: 'bg-(--l-dark-step) text-(--l-paper)',
  },
  {
    card: (
      <>
        <p className="text-[13px] text-(--l-muted)">Com + R$ 300,00 por mês</p>
        <p className="mt-2 text-[15px] font-medium">
          Quitado em {SAMPLE_PLAN.debtFreeOn ? monthLabel(SAMPLE_PLAN.debtFreeOn) : '—'}
        </p>
        <p className="mt-3 text-[13px] text-(--l-muted)">
          em vez de{' '}
          {SAMPLE_PLAN.debtFreeWithoutPlanOn ? monthLabel(SAMPLE_PLAN.debtFreeWithoutPlanOn) : '—'}
        </p>
        <p className="mt-1 text-[14px] text-(--l-seal) tabular-nums">
          {formatCents(SAMPLE_PLAN.interestSavedCents)} a menos de juros
        </p>
      </>
    ),
    clause: ['No fim,', 'a data de quitação.'],
    tone: 'bg-(--l-dark) text-(--l-paper)',
  },
];

function HowItWorks() {
  return (
    <section aria-labelledby="como-funciona" className="grid md:grid-cols-4" id="como">
      {FIELDS.map((field, index) => (
        <motion.div
          className={cn(
            'group relative flex min-h-[64svh] flex-col px-5 pt-8 pb-10 md:min-h-[84svh] md:px-7 md:pb-7',
            field.tone
          )}
          key={field.clause[1]}
          variants={stagger}
          {...onView}
        >
          {index === 0 && (
            <motion.h2
              className="order-first mb-4 text-(length:--step-lead) font-semibold md:mb-0"
              id="como-funciona"
              variants={rise}
            >
              Como funciona
            </motion.h2>
          )}
          <motion.p
            className="order-first mb-8 text-(length:--step-lead) leading-tight md:order-last md:mt-auto md:mb-0"
            variants={rise}
          >
            {field.clause[0]}
            <br />
            {field.clause[1]}
          </motion.p>
          <motion.div
            className="w-[260px] max-w-full rounded-md bg-white p-4 text-(--l-ink) transition-transform duration-150 group-hover:-translate-y-1.5 md:absolute md:top-[38%] md:left-1/2 md:-translate-x-1/2 md:group-hover:-translate-x-1/2"
            data-ui
            variants={rise}
          >
            {field.card}
          </motion.div>
        </motion.div>
      ))}
    </section>
  );
}

// ---------------------------------------------------------------- showcase

interface DemoDebt {
  id: string;
  name: string;
  principalCents: number;
  rate: number;
  termMonths: number;
}

const DEMO_DEBTS: DemoDebt[] = [
  { id: 'card', name: 'Cartão parcelado', principalCents: 600_000, rate: 0.12, termMonths: 24 },
  {
    id: 'loan',
    name: 'Empréstimo pessoal',
    principalCents: 2_000_000,
    rate: 0.042,
    termMonths: 24,
  },
  {
    id: 'car',
    name: 'Financiamento do carro',
    principalCents: 4_500_000,
    rate: 0.016,
    termMonths: 48,
  },
];

/** Months between two ISO dates, by their year and month alone. */
const monthsBetween = (from: IsoDate, to: IsoDate) =>
  (Number(to.slice(0, 4)) - Number(from.slice(0, 4))) * 12 +
  Number(to.slice(5, 7)) -
  Number(from.slice(5, 7));

/** Sair das dívidas, working: three debts, an extra a month, the order and the dates. */
function Showcase() {
  const [extra, setExtra] = useState(400);
  const [cardRate, setCardRate] = useState(12);
  const [on, setOn] = useState<Record<string, boolean>>({ car: true, card: true, loan: true });
  const asOf = today();

  const debts = useMemo(
    () =>
      DEMO_DEBTS.filter(debt => on[debt.id]).map(debt => ({
        ...debt,
        rate: debt.id === 'card' ? cardRate / 100 : debt.rate,
      })),
    [cardRate, on]
  );
  const plan = useMemo(
    () =>
      debts.length === 0
        ? null
        : avalanchePlan(
            debts.map(debt => ({
              id: debt.id,
              input: {
                firstDueDate: addMonths(asOf.slice(0, 8) + '10', 1),
                monthlyRate: debt.rate,
                principalCents: debt.principalCents,
                system: 'PRICE' as const,
                termMonths: debt.termMonths,
              },
            })),
            asOf,
            extra * 100
          ),
    [asOf, debts, extra]
  );
  const ahead =
    plan?.debtFreeOn && plan.debtFreeWithoutPlanOn
      ? monthsBetween(plan.debtFreeOn, plan.debtFreeWithoutPlanOn)
      : 0;

  return (
    <section aria-labelledby="sair-title" className="px-5 py-[15vh] md:px-10" id="sair-das-dividas">
      <motion.div className="mx-auto max-w-[760px]" variants={stagger} {...onView}>
        <motion.h2
          className="text-(length:--step-lead) font-semibold"
          id="sair-title"
          variants={rise}
        >
          Sair das dívidas
        </motion.h2>
        <motion.p className="mt-2 max-w-[52ch] text-(length:--step-body)" variants={rise}>
          Cada real a mais vai para a dívida de juros mais altos. Mexa no extra e veja as datas
          mudarem.
        </motion.p>

        <motion.div
          className="mt-8 grid overflow-hidden rounded-lg bg-(--l-surface) md:grid-cols-[62fr_38fr]"
          data-ui
          variants={rise}
        >
          <div aria-live="polite" className="flex flex-col p-6">
            <p className="text-[13px] text-(--l-muted)">Livre das dívidas em</p>
            <p className="font-display text-[48px] leading-none font-light tracking-[-0.022em] tabular-nums">
              {plan?.debtFreeOn ? monthLabel(plan.debtFreeOn) : 'nada a pagar'}
            </p>
            {plan && (
              <p className="mt-3 text-[14px]">
                {ahead > 0 ? `${ahead} ${ahead === 1 ? 'mês' : 'meses'} antes · ` : ''}
                <span className="text-(--l-seal) tabular-nums">
                  {formatCents(plan.interestSavedCents)}
                </span>{' '}
                a menos de juros
              </p>
            )}
            <ol className="mt-8 flex flex-col gap-2">
              {(plan?.payoffs ?? []).map((payoff, index) => {
                const debt = debts.find(item => item.id === payoff.id)!;
                return (
                  <motion.li
                    className="flex items-center justify-between gap-4 rounded-md bg-white px-4 py-3 text-[14px]"
                    key={payoff.id}
                    layout
                    transition={{ duration: 0.35, ease: EASE }}
                  >
                    <span>
                      <span className="block font-medium">
                        {index + 1}. {debt.name}
                      </span>
                      <span className="block text-[13px] text-(--l-muted) tabular-nums">
                        {formatCents(debt.principalCents)} · {percent(debt.rate * 100)} a.m.
                      </span>
                    </span>
                    <span className="text-right tabular-nums">{monthLabel(payoff.paidOffOn)}</span>
                  </motion.li>
                );
              })}
            </ol>
            <Link
              className="mt-auto pt-8 text-[14px] text-(--l-seal) underline-offset-4 hover:underline"
              to={SIGN_UP}
            >
              Montar o plano com as suas dívidas
            </Link>
          </div>

          <div className="flex flex-col bg-(--l-sand) px-5 py-4">
            <ControlRow label="Extra por mês" value={formatCents(extra * 100)}>
              <Slider
                aria-label="Extra por mês"
                className="w-full"
                max={2_000}
                min={100}
                onValueChange={([next]) => next !== undefined && setExtra(next)}
                step={50}
                value={[extra]}
              />
            </ControlRow>
            <ControlRow label="Juros do cartão" value={`${percent(cardRate)} a.m.`}>
              <Slider
                aria-label="Juros do cartão"
                className="w-full"
                max={15}
                min={2}
                onValueChange={([next]) => next !== undefined && setCardRate(next)}
                step={0.5}
                value={[cardRate]}
              />
            </ControlRow>
            {DEMO_DEBTS.map(debt => (
              <label
                className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-[14px]"
                key={debt.id}
              >
                {debt.name}
                <Switch
                  checked={on[debt.id]}
                  onCheckedChange={checked =>
                    setOn(current => ({ ...current, [debt.id]: checked }))
                  }
                />
              </label>
            ))}
            <div className="flex min-h-11 items-center justify-between text-[14px]">
              <span>Método</span>
              <span className="text-(--l-muted)">Avalanche</span>
            </div>
            <div className="flex min-h-11 items-center justify-between text-[14px]">
              <span>A partir de</span>
              <span className="text-(--l-muted) tabular-nums">
                {monthLabel(addMonths(asOf.slice(0, 8) + '10', 1))}
              </span>
            </div>
          </div>
        </motion.div>
        <motion.p className="mt-4 text-(length:--step-small) text-(--l-muted)" variants={rise}>
          Exemplo com valores fictícios. Na sua conta, as dívidas vêm dos seus contratos.
        </motion.p>
      </motion.div>
    </section>
  );
}

function ControlRow({
  children,
  label,
  value,
}: {
  children: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col justify-center gap-2 py-2.5 text-[14px]">
      <div className="flex items-baseline justify-between">
        <span>{label}</span>
        <span className="font-medium tabular-nums">{value}</span>
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------- what it reads

const READS: { rows: { dot: string; name: string; value: string }[]; title: string }[] = [
  {
    rows: [
      { dot: 'bg-(--l-ink)', name: 'Extrato do banco', value: '.ofx' },
      { dot: 'bg-(--l-ink)', name: 'Planilha exportada do banco', value: '.csv · .xlsx' },
      { dot: 'bg-(--l-ink)', name: 'Extrato ou fatura em PDF', value: 'PDF com texto' },
      { dot: 'bg-(--l-ink)', name: 'Arquivos e prints no chat', value: 'até 5 por vez' },
      { dot: 'bg-(--l-ink)', name: 'Mensagens no WhatsApp', value: 'texto' },
      { dot: 'bg-(--l-rule)', name: 'Open Finance', value: 'em breve' },
    ],
    title: 'Lê',
  },
  {
    rows: [
      { dot: 'bg-(--l-seal)', name: 'Fluxo de caixa', value: 'dia, mês ou período' },
      { dot: 'bg-(--l-seal)', name: 'Gastos recorrentes e assinaturas', value: 'todo mês' },
      { dot: 'bg-(--l-seal)', name: 'Plano para sair das dívidas', value: 'avalanche' },
      { dot: 'bg-(--l-seal)', name: 'Tabela Price e SAC, lado a lado', value: 'calculadora' },
      { dot: 'bg-(--l-seal)', name: 'Alugar ou financiar', value: 'calculadora' },
      { dot: 'bg-(--l-seal)', name: 'Resumos que chegam sozinhos', value: 'semana ou mês' },
    ],
    title: 'Monta',
  },
  {
    rows: [
      { dot: 'bg-(--l-muted)', name: 'Mover o seu dinheiro', value: 'nunca' },
      { dot: 'bg-(--l-muted)', name: 'Pedir a senha do seu banco', value: 'nunca' },
      { dot: 'bg-(--l-muted)', name: 'Oferecer crédito ou indicar investimento', value: 'nunca' },
      { dot: 'bg-(--l-muted)', name: 'Vender ou usar seus dados para anúncio', value: 'nunca' },
    ],
    title: 'Não faz',
  },
];

function Reads() {
  return (
    <section aria-labelledby="le-title" className="px-5 py-[12vh] md:pl-[22vw]">
      <motion.div className="max-w-[520px]" variants={stagger} {...onView}>
        <motion.h2
          className="mb-8 text-(length:--step-lead) font-medium"
          id="le-title"
          variants={rise}
        >
          O que ele lê e o que monta
        </motion.h2>
        {READS.map(group => (
          <motion.div className="mb-10 last:mb-0" key={group.title} variants={rise}>
            <p className="mb-1 text-[15px] text-(--l-muted)">{group.title}</p>
            <ul>
              {group.rows.map(row => (
                <li
                  className="flex min-h-11 items-baseline justify-between gap-4 py-2 md:min-h-9"
                  key={row.name}
                >
                  <span className="flex items-baseline gap-2 text-[16px]">
                    <span
                      aria-hidden
                      className={cn(
                        'inline-block size-4 shrink-0 translate-y-0.5 rounded-full',
                        row.dot
                      )}
                    />
                    {row.name}
                  </span>
                  <span className="shrink-0 text-[13px] text-(--l-muted) tabular-nums">
                    {row.value}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}

// ---------------------------------------------------------------- the name

const OBJECTS: { alt: string; credit: string; height: number; src: string; width: number }[] = [
  {
    alt: 'Figura de porcelana do deus da riqueza em armadura, sentado',
    credit: 'Deus da riqueza, aspecto militar, séc. XVII–XVIII',
    height: 1400,
    src: '/landing/caishen-military.jpg',
    width: 1051,
  },
  {
    alt: 'Taça de cerâmica dourada na forma de um lingote de prata chinês',
    credit: 'Taça em forma de lingote, séc. XIX',
    height: 933,
    src: '/landing/ingot-cup.jpg',
    width: 1400,
  },
  {
    alt: 'Moeda chinesa de bronze, redonda com furo quadrado, partida em pedaços',
    credit: 'Moeda da dinastia Song, c. 1068–77',
    height: 1400,
    src: '/landing/song-coin.jpg',
    width: 1042,
  },
];

/** Why the name: the god of wealth, in porcelain, beside a short letter. */
function Letter() {
  return (
    <section aria-label="Por que Caishen" className="bg-(--l-surface) px-5 py-[14vh] md:px-10">
      <div className="mx-auto grid max-w-6xl items-start gap-12 md:grid-cols-[5fr_7fr]">
        <motion.figure className="overflow-hidden rounded-lg" variants={rise} {...onView}>
          <img
            alt="Figura de porcelana do deus da riqueza em trajes de funcionário, sentado numa cadeira com braços de dragão"
            className="landing-drift aspect-[3/4] w-full object-cover"
            height={1400}
            loading="lazy"
            src="/landing/caishen-civil.jpg"
            width={1051}
          />
          <figcaption className="bg-(--l-surface) pt-3 text-[13px] text-(--l-muted)">
            Deus da riqueza, aspecto civil, China, séc. XVII–XVIII. The Met, domínio público.
          </figcaption>
        </motion.figure>

        <motion.div className="max-w-[520px] md:pt-10" variants={stagger} {...onView}>
          <motion.div
            className="flex flex-col gap-5 text-(length:--step-body) leading-[1.55]"
            variants={rise}
          >
            <p>
              Caishen (財神) é o deus chinês da riqueza. Nas casas e nas lojas ele fica perto da
              porta, com um lingote na mão, para lembrar que dinheiro se cuida todo dia, não só no
              fim do mês.
            </p>
            <p>
              Fiz o Caishen porque as contas de casa moram espalhadas: um extrato em cada banco, uma
              fatura em PDF, uma planilha que ninguém atualiza. Ele junta tudo num lugar só e faz a
              conta que dá trabalho: quanto sobra, quanto custa cada dívida e{' '}
              <mark className="bg-(--l-marker) px-1 text-(--l-ink)">
                em que mês você termina de pagar
              </mark>
              .
            </p>
            <p>
              Ele só lê. Não pede a senha do banco, não mexe no seu dinheiro e não oferece crédito.
              Quando sugere um lançamento, quem confirma é você.
            </p>
          </motion.div>
          <motion.p className="mt-8 text-[22px] italic" variants={rise}>
            Pedro Felippe
          </motion.p>
          <motion.p className="text-[14px] text-(--l-muted)" variants={rise}>
            quem faz o Caishen
          </motion.p>

          <motion.ul className="mt-12 grid grid-cols-3 gap-3" variants={rise}>
            {OBJECTS.map(object => (
              <li key={object.src}>
                <img
                  alt={object.alt}
                  className="aspect-square w-full rounded-md object-cover transition-transform duration-300 hover:scale-[1.03]"
                  height={object.height}
                  loading="lazy"
                  src={object.src}
                  width={object.width}
                />
                <p className="mt-2 text-[13px] leading-snug text-(--l-muted)">{object.credit}</p>
              </li>
            ))}
          </motion.ul>
        </motion.div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- the first step

const GOALS = ['Quitar dívidas', 'Organizar o mês'] as const;

/** The close: the sign-up already open, on the seal's red. */
function Start() {
  const navigate = useNavigate();
  const [name, setName] = useState('Ana');
  const [goal, setGoal] = useState<(typeof GOALS)[number]>('Quitar dívidas');

  return (
    <section
      aria-labelledby="comece-title"
      className="grid min-h-[84svh] gap-10 bg-(--l-seal) px-4 py-14 text-white sm:px-10 lg:min-h-[90svh] lg:grid-cols-12 lg:py-10"
    >
      <motion.div
        className="flex flex-col lg:col-span-5 lg:justify-end"
        variants={stagger}
        {...onView}
      >
        <motion.h2
          className="font-display text-(length:--step-head) leading-[0.98] font-light tracking-[-0.022em]"
          id="comece-title"
          variants={rise}
        >
          Comece pelo
          <br />
          extrato.
        </motion.h2>
        <motion.p className="mt-5 max-w-[40ch] text-(length:--step-body)" variants={rise}>
          Crie a conta, mande o arquivo do seu banco e veja o mês inteiro organizado em poucos
          minutos.
        </motion.p>
      </motion.div>

      <motion.form
        className="self-end rounded-lg bg-white p-6 text-(--l-ink) shadow-[0_24px_60px_-20px_rgb(0_0_0/0.45)] sm:max-w-[440px] lg:col-span-5 lg:col-start-7 lg:self-center"
        data-ui
        onSubmit={event => {
          event.preventDefault();
          navigate(SIGN_UP);
        }}
        variants={rise}
        {...onView}
      >
        <p className="text-[18px] font-medium">Criar sua conta</p>
        <label className="mt-5 block text-[14px]" htmlFor="start-name">
          Como podemos te chamar?
        </label>
        <Input
          className="mt-2 h-11 text-[15px]"
          id="start-name"
          onChange={event => setName(event.target.value)}
          value={name}
        />
        <p className="mt-5 text-[14px]">O que vem primeiro?</p>
        <div
          className="mt-2 grid grid-cols-2 gap-1 rounded-md bg-(--l-surface) p-1"
          role="radiogroup"
        >
          {GOALS.map(option => (
            <Button
              aria-checked={goal === option}
              className={cn(
                'h-10 rounded text-[14px] font-normal shadow-none',
                goal === option
                  ? 'bg-white font-medium text-(--l-ink) hover:bg-white'
                  : 'text-(--l-muted) hover:bg-transparent hover:text-(--l-ink)'
              )}
              key={option}
              onClick={() => setGoal(option)}
              role="radio"
              type="button"
              variant="ghost"
            >
              {option}
            </Button>
          ))}
        </div>
        <Button
          className="mt-6 h-[52px] w-full rounded-md bg-(--l-ink) text-[15px] text-white hover:bg-(--l-dark-step) active:scale-[0.99]"
          type="submit"
        >
          {name.trim() ? `Criar conta, ${name.trim().split(' ')[0]}` : 'Criar conta'}
        </Button>
      </motion.form>
    </section>
  );
}

// ---------------------------------------------------------------- footer

const FOOTER_LINKS = [
  { href: '/sign-in', label: 'Entrar' },
  { href: SIGN_UP, label: 'Criar conta' },
  { href: '/terms', label: 'Termos' },
];

function Footer() {
  return (
    <footer className="px-5 pt-[20svh] pb-6 text-(length:--step-small) md:px-10 md:pt-[30svh] md:pb-[30px]">
      <p className="mb-10 max-w-[60ch] text-(--l-muted)">
        O Caishen não é uma instituição financeira, não oferece crédito nem recomenda investimentos,
        e nunca movimenta dinheiro. Os cálculos partem dos dados que você informa; confira sempre os
        valores com a sua instituição. Imagens: The Metropolitan Museum of Art, domínio público
        (CC0). {COMPANY.name}, CNPJ {COMPANY.cnpj}.
      </p>
      <div className="flex flex-col gap-2 md:grid md:grid-cols-[1fr_auto_1fr] md:items-baseline">
        <p className="text-(--l-muted)">Caishen, finanças sem senha de banco</p>
        <nav aria-label="Rodapé" className="flex flex-wrap gap-x-6 gap-y-1">
          {FOOTER_LINKS.map(link => (
            <Link className="underline-offset-4 hover:underline" key={link.href} to={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="text-(--l-muted) md:text-right">
          © {new Date().getFullYear()} ·{' '}
          <Link className="text-(--l-ink) underline-offset-4 hover:underline" to="/privacy">
            Privacidade
          </Link>
        </p>
      </div>
    </footer>
  );
}
