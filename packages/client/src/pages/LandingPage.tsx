import { priceInstallment } from '@zapbots/finance';
import { ArrowRightIcon, CheckIcon, FileSpreadsheetIcon } from 'lucide-react';
import { MotionConfig, motion, type Variants } from 'motion/react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

import { Logo } from '../components/Logo';
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

/** What the Caishen of finances does today, in the visitor's words. */
const FINANCE_SKILLS = [
  'Lê planilhas .csv e .xlsx e separa seus Gastos',
  'Calcula juros, Saldo Devedor e Taxa Implícita de cada Operação',
  'Avaliação de crédito de 0 a 1000, nas faixas do SPC',
  'Plano de Quitação: quando você fica sem dívidas',
];

/** The promises behind ADR 0009. */
const PROMISES: { description: string; title: string }[] = [
  {
    description: 'Lê o que você conecta e volta com o trabalho pronto. Nunca altera nada lá fora.',
    title: 'Só leitura',
  },
  {
    description: 'Não faz pagamentos, transferências nem contratações. Quem decide é você.',
    title: 'Nenhum centavo movido',
  },
  {
    description: 'As Integrações usam o login oficial de cada serviço. Nenhuma senha guardada.',
    title: 'Sem senhas',
  },
  {
    description: 'Juros e Score saem de cálculo exato. A IA recebe os números prontos e explica.',
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

/** A plain navy bar: the wordmark, the sections, and the way in. */
function Header() {
  return (
    <header className="sticky top-0 z-40 bg-navy text-header-foreground">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Brand />
        <nav aria-label="Seções" className="hidden items-center gap-1 md:flex">
          {NAV.map(link => (
            <Button
              asChild
              className="text-header-foreground/80 hover:bg-white/10 hover:text-header-foreground"
              key={link.href}
              variant="ghost"
            >
              <a href={link.href}>{link.label}</a>
            </Button>
          ))}
        </nav>
        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            asChild
            className="text-header-foreground hover:bg-white/10 hover:text-header-foreground"
            variant="ghost"
          >
            <Link to="/sign-in">Entrar</Link>
          </Button>
          <Button asChild>
            <Link to="/sign-in">Começar grátis</Link>
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
      className="bg-navy px-4 pt-14 pb-20 text-white sm:px-6 sm:pt-20 sm:pb-28"
    >
      <motion.h1
        animate="shown"
        className="mx-auto max-w-6xl text-[2rem] leading-[1.05] font-semibold tracking-[-0.03em] sm:text-5xl lg:text-[3.5rem]"
        id="hero-title"
        initial="hidden"
        variants={rise}
      >
        Seu ecossistema inteligente de assistentes pessoais e financeiros.
      </motion.h1>
      <div className="mx-auto mt-10 grid max-w-6xl items-center gap-14 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
        <motion.div animate="shown" initial="hidden" variants={stagger}>
          <motion.p className="max-w-xl text-lg text-pretty text-slate-300" variants={rise}>
            O Caishen junta seu controle financeiro, sua organização pessoal e a automação das suas
            rotinas num lugar só. Começa pelo dinheiro: lê suas dívidas, calcula os juros e monta o
            plano para você quitar tudo.
          </motion.p>
          <motion.div className="mt-9 flex flex-col gap-3 sm:flex-row" variants={rise}>
            <Button asChild className="h-12 px-6 text-base" size="lg">
              <Link to="/sign-in">
                Começar gratuitamente
                <ArrowRightIcon />
              </Link>
            </Button>
            <Button
              asChild
              className="h-12 border-white/20 bg-transparent px-6 text-base text-white hover:bg-white/10 hover:text-white"
              size="lg"
              variant="outline"
            >
              <a href="#painel">Ver demonstração</a>
            </Button>
          </motion.div>
        </motion.div>

        <motion.div
          animate={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 40 }}
          transition={{ delay: 0.3, duration: 0.9, ease: EASE }}
        >
          <AppPreview />
        </motion.div>
      </div>
    </section>
  );
}

/** The app as it looks signed in, built in HTML with example figures. */
function AppPreview() {
  return (
    <div
      aria-label="Exemplo do painel do Caishen"
      className="overflow-hidden rounded-2xl bg-navy-soft text-left text-slate-900"
      data-ui
      role="img"
    >
      <div className="flex items-center gap-2 px-4 py-3 text-slate-300">
        <Logo size={16} />
        <span className="text-sm font-medium">Caishen</span>
        <span className="ml-auto truncate rounded-full bg-white/10 px-3 py-1 text-[13px] text-slate-400">
          Pergunte ao Caishen…
        </span>
      </div>
      <div className="flex">
        <div className="hidden w-36 shrink-0 flex-col gap-1 px-2 pb-3 text-[13px] text-slate-300 sm:flex">
          {['Página inicial', 'Lançamentos', 'Dívidas', 'Relatório'].map((item, index) => (
            <span
              className={cn(
                'rounded-md px-2.5 py-1.5',
                index === 2 && 'bg-white/10 font-medium text-white shadow-[inset_3px_0_0_#2563eb]'
              )}
              key={item}
            >
              {item}
            </span>
          ))}
        </div>
        <div className="m-2 mt-0 flex-1 rounded-xl bg-background p-4 sm:ml-0">
          <p className="text-[13px] text-muted-foreground">Exemplo · outubro</p>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <PreviewMetric label="Score" tone="text-success" value="742" />
            <PreviewMetric label="Saldo devedor" value="R$ 38.420" />
            <PreviewMetric label="Renda mensal" value="R$ 9.850" />
            <PreviewMetric label="Parcelas do mês" value="R$ 2.316" />
          </div>
          <div className="mt-2.5 rounded-lg bg-white p-3">
            <div className="flex items-center justify-between text-[13px]">
              <span className="font-medium">Cartão Visa</span>
              <span className="font-medium text-amber-700">vence em 3 dias</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-[82%] rounded-full bg-warning" />
            </div>
            <p className="mt-1.5 text-[13px] text-muted-foreground">82% do limite usado</p>
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

/** The live Caishen, large, and the two still being built beside it. */
function Assistants() {
  const finance = TEAM[0]!;
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
          trabalhando; os outros dois estão a caminho.
        </motion.p>

        <div className="mt-14 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <motion.article
            className="rounded-2xl bg-navy p-8 text-white sm:p-10"
            variants={rise}
            whileHover={{ y: -4 }}
          >
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-xl bg-primary">
                <finance.icon className="size-5" />
              </span>
              <h3 className="text-2xl font-semibold">Caishen Finance</h3>
              <Badge className="ml-auto bg-success text-white">Disponível</Badge>
            </div>
            <p className="mt-5 text-lg text-slate-300">{finance.description}</p>
            <ul className="mt-7 grid gap-3">
              {FINANCE_SKILLS.map(skill => (
                <li className="flex gap-3 text-base" key={skill}>
                  <CheckIcon className="mt-0.5 size-5 shrink-0 text-blue-400" />
                  {skill}
                </li>
              ))}
            </ul>
            <Button asChild className="mt-9 h-11 px-5" size="lg">
              <Link to="/sign-in">Usar o Caishen Finance</Link>
            </Button>
          </motion.article>

          <div className="grid gap-4">
            {UPCOMING_BOTS.map(bot => (
              <motion.article
                className="rounded-2xl bg-background p-7"
                key={bot.key}
                variants={rise}
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-secondary text-foreground">
                    <bot.icon className="size-5" />
                  </span>
                  <h3 className="text-xl font-semibold">{bot.name}</h3>
                  <Badge className="ml-auto" variant="secondary">
                    Em breve
                  </Badge>
                </div>
                <p className="mt-4 text-base">{bot.description}</p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {bot.sections.map(section => (
                    <li
                      className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[13px] text-muted-foreground"
                      key={section.label}
                    >
                      <section.icon className="size-3.5" />
                      {section.label}
                    </li>
                  ))}
                </ul>
              </motion.article>
            ))}
          </div>
        </div>
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
            Exporte o extrato do banco ou use a planilha que você já tem, em .csv ou .xlsx. O
            Caishen lê as colunas, e num extrato com entradas e saídas só as saídas viram Gastos do
            mês. Nada para instalar e nenhuma senha do banco.
          </motion.p>
          <motion.ul className="mt-7 grid gap-3 text-base" variants={rise}>
            <li className="flex items-center gap-3">
              <FileSpreadsheetIcon className="size-5 text-primary" />
              Excel (.xlsx) e CSV, hoje
            </li>
            <li className="flex items-center gap-3 text-muted-foreground">
              <FileSpreadsheetIcon className="size-5" />
              Arquivos OFX
              <Badge variant="secondary">Em breve</Badge>
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
          aria-label="Exemplo do Relatório do Caishen"
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

/** The way in, beside the god of wealth the Caishen is named after, and what he never does. */
function FinalCta() {
  return (
    <section className="bg-primary px-4 py-24 text-primary-foreground sm:px-6 sm:py-28">
      <motion.div
        className="mx-auto grid max-w-6xl gap-12 md:grid-cols-[minmax(0,18rem)_1fr] md:gap-16"
        variants={stagger}
        {...onView}
      >
        <motion.figure variants={rise}>
          <img
            alt="Estatueta de porcelana branca de Caishen, o deus chinês da riqueza, sentado"
            className="aspect-[2/3] w-full max-w-72 rounded-2xl object-cover"
            height={2880}
            loading="lazy"
            src="/landing/caishen-porcelain.jpg"
            width={1920}
          />
          <figcaption className="mt-3 max-w-72 text-[13px] text-white/90">
            Caishen, o deus chinês da riqueza. Porcelana de Dehua, dinastia Ming, c. 1600–1644,
            Royal Ontario Museum. Foto: Daderot, CC0, via Wikimedia Commons.
          </figcaption>
        </motion.figure>
        <div>
          <motion.h2
            className="text-3xl font-semibold tracking-[-0.02em] text-balance sm:text-5xl"
            variants={rise}
          >
            Comece hoje, de graça
          </motion.h2>
          <motion.p className="mt-4 max-w-xl text-lg text-white/90" variants={rise}>
            Sem senha: você entra com um link no seu e-mail ou com o Google. E o Caishen, como o
            deus que lhe dá o nome, cuida da riqueza sem nunca pôr a mão nela.
          </motion.p>
          <motion.div variants={rise}>
            <Button
              asChild
              className="mt-8 h-12 bg-white px-7 text-base text-primary hover:bg-blue-50"
              size="lg"
            >
              <Link to="/sign-in">Começar gratuitamente</Link>
            </Button>
          </motion.div>
          <motion.ul className="mt-14 grid gap-x-10 gap-y-7 sm:grid-cols-2" variants={stagger}>
            {PROMISES.map(({ description, title }) => (
              <motion.li key={title} variants={rise}>
                <p className="text-xl font-semibold">{title}</p>
                <p className="mt-1.5 text-base text-white/90">{description}</p>
              </motion.li>
            ))}
          </motion.ul>
        </div>
      </motion.div>
    </section>
  );
}

const FOOTER_LINKS: { label: string; links: { href: string; label: string }[] }[] = [
  { label: 'Produto', links: NAV },
  {
    label: 'Conta',
    links: [
      { href: '/sign-in', label: 'Entrar' },
      { href: '/sign-in', label: 'Criar conta' },
    ],
  },
];

function Footer() {
  return (
    <footer className="bg-navy px-4 pt-16 pb-10 text-header-foreground sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Brand />
            <p className="mt-4 max-w-sm text-base text-slate-300">
              Assistentes que leem, calculam e explicam. As decisões ficam com você.
            </p>
            {SOCIAL.length > 0 && (
              <ul className="mt-6 flex gap-4">
                {SOCIAL.map(profile => (
                  <li key={profile.href}>
                    <a className="text-base text-slate-300 hover:text-white" href={profile.href}>
                      {profile.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {FOOTER_LINKS.map(column => (
            <nav aria-label={column.label} key={column.label}>
              <p className="text-base font-semibold text-white">{column.label}</p>
              <ul className="mt-4 grid gap-2.5">
                {column.links.map(link => (
                  <li key={link.label}>
                    {link.href.startsWith('#') ? (
                      <a className="text-base text-slate-300 hover:text-white" href={link.href}>
                        {link.label}
                      </a>
                    ) : (
                      <Link className="text-base text-slate-300 hover:text-white" to={link.href}>
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-14 grid gap-3 text-[13px] text-slate-400 md:grid-cols-[1fr_auto] md:gap-10">
          <p className="max-w-2xl">
            O Caishen não é uma instituição financeira, não oferece crédito nem recomenda
            investimentos, e nunca movimenta dinheiro. Os cálculos partem dos dados que você informa
            e servem para entender e planejar; confira sempre os valores com a sua instituição.
          </p>
          <p>© {new Date().getFullYear()} Caishen</p>
        </div>
      </div>
    </footer>
  );
}
