import {
  CalendarClock,
  ChartNoAxesCombined,
  type LucideIcon,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useScroll,
  useTransform,
  type Variants,
} from 'motion/react';
import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';

import { Logo } from '../components/Logo';

// ---------------------------------------------------------------- motion

const EASE = [0.22, 1, 0.36, 1] as const;

/** A block that rises into place the first time it scrolls into view. */
const rise: Variants = {
  hidden: { opacity: 0, y: 28 },
  shown: { opacity: 1, transition: { duration: 0.7, ease: EASE }, y: 0 },
};

/** A parent whose children rise one after another. */
const stagger: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.09 } },
};

/** Props for a block that animates once, when it is a little inside the screen. */
const onView = {
  initial: 'hidden',
  viewport: { amount: 0.25, once: true },
  whileInView: 'shown',
} as const;

// ---------------------------------------------------------------- content

/** What the Caishen is for, turning in the hero title. */
const TOPICS = ['suas finanças', 'sair do vermelho', 'entender seu Score', 'cada Parcela'];

const FEATURES: { description: string; icon: LucideIcon; title: string }[] = [
  {
    description:
      'Fontes de Renda, Operações de Crédito e Cartões num lugar só. Tabela de Amortização, Taxa Implícita e Saldo Devedor calculados para você.',
    icon: ChartNoAxesCombined,
    title: 'Finanças organizadas',
  },
  {
    description:
      'Uma Avaliação de crédito de 0 a 1000, nas faixas do SPC, com cada Operação comparada à taxa média de mercado do Bacen.',
    icon: Sparkles,
    title: 'Score que você entende',
  },
  {
    description:
      'O Caishen fica ao lado das suas telas e responde sobre o que está nelas, com os números já calculados.',
    icon: MessageCircle,
    title: 'Converse sobre seus números',
  },
  {
    description:
      'Peça um plano ou uma análise e receba a Entrega pronta. Com Rotinas, o mesmo Workflow roda toda semana ou todo mês.',
    icon: CalendarClock,
    title: 'Workflows e Rotinas',
  },
  {
    description:
      'O que está em atraso, o que vence em 7 dias, Cartão perto do limite e taxas bem acima do mercado.',
    icon: TriangleAlert,
    title: 'Avisos na hora certa',
  },
  {
    description: 'O Caishen só lê. Nunca altera nada nas suas ferramentas e nunca move um centavo.',
    icon: ShieldCheck,
    title: 'Seguro por desenho',
  },
];

const STEPS = [
  {
    description: 'Cadastre suas Operações de Crédito, Cartões e Fontes de Renda em poucos minutos.',
    title: 'Conte o que você tem',
  },
  {
    description:
      'O Caishen calcula juros, Saldo Devedor e seu Score, e mostra onde você paga caro demais.',
    title: 'Veja o quadro completo',
  },
  {
    description:
      'Receba um Plano de Quitação: quando você fica sem dívidas e quanto economiza em juros.',
    title: 'Siga o plano',
  },
];

const SHOTS = [
  {
    alt: 'Uma Operação de Crédito com taxa, Saldo Devedor e Tabela de Amortização',
    caption: 'Cada Operação, Parcela por Parcela',
    src: '/landing/app-operacao.jpg',
  },
  {
    alt: 'Uma Entrega do Caishen com um plano para quitar as dívidas',
    caption: 'Entregas prontas para ler',
    src: '/landing/app-entrega.jpg',
  },
  {
    alt: 'A tela de Finanças com Fontes de Renda, Operações e Cartões',
    caption: 'Tudo o que entra e sai',
    src: '/landing/app-financas.jpg',
  },
];

// ---------------------------------------------------------------- page

/** The page for visitors who are not signed in. "Entrar" leads to the LoginPage at /sign-in. */
export function LandingPage() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-svh overflow-x-clip bg-[var(--paper)] text-foreground">
        <a
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-foreground focus:px-3 focus:py-2 focus:text-background"
          href="#conteudo"
        >
          Pular para o conteúdo
        </a>
        <Header />
        <main id="conteudo">
          <Hero />
          <Features />
          <Steps />
          <Shots />
          <Trust />
          <FinalCta />
        </main>
        <Footer />
      </div>
    </MotionConfig>
  );
}

function Brand() {
  return (
    <Link className="flex items-center gap-2.5 text-foreground" to="/">
      <Logo className="text-header" size={26} />
      <span className="text-lg font-semibold tracking-tight">Caishen</span>
    </Link>
  );
}

/** Stays on top; gains a hairline and a blur once the page scrolls. */
function Header() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.header
      animate={{ opacity: 1, y: 0 }}
      className={`sticky top-0 z-40 border-b transition-colors duration-300 ${
        scrolled
          ? 'border-border/70 bg-[var(--paper)]/80 backdrop-blur-md'
          : 'border-transparent bg-transparent'
      }`}
      initial={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Brand />
        <nav className="flex items-center gap-1 sm:gap-2">
          <Button asChild className="hidden sm:inline-flex" variant="ghost">
            <a href="#recursos">Recursos</a>
          </Button>
          <Button asChild className="hidden sm:inline-flex" variant="ghost">
            <a href="#como-funciona">Como funciona</a>
          </Button>
          <Button asChild variant="ghost">
            <Link to="/sign-in">Entrar</Link>
          </Button>
          <Button asChild>
            <Link to="/sign-in">Começar</Link>
          </Button>
        </nav>
      </div>
    </motion.header>
  );
}

function Hero() {
  const [topic, setTopic] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTopic(current => (current + 1) % TOPICS.length), 2600);
    return () => clearInterval(timer);
  }, []);

  // The screenshot tilts back as it enters and lies flat as the page scrolls.
  const shot = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ offset: ['start end', 'start 30%'], target: shot });
  const rotateX = useTransform(scrollYProgress, [0, 1], [8, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.94, 1]);

  return (
    <section aria-labelledby="hero-title" className="relative px-4 pt-16 sm:px-6 sm:pt-24">
      <Glow />
      <motion.div
        animate="shown"
        className="relative mx-auto flex max-w-3xl flex-col items-center text-center"
        initial="hidden"
        variants={stagger}
      >
        <motion.span
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-sm text-muted-foreground shadow-xs"
          variants={rise}
        >
          <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
          Seu assistente financeiro pessoal
        </motion.span>
        <motion.h1
          className="text-4xl leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl"
          id="hero-title"
          variants={rise}
        >
          Inteligência para
          <span className="relative block h-[1.15em] overflow-hidden">
            <AnimatePresence initial={false} mode="popLayout">
              <motion.span
                animate={{ filter: 'blur(0px)', opacity: 1, y: '0%' }}
                className="absolute inset-x-0 text-muted-foreground"
                exit={{ filter: 'blur(6px)', opacity: 0, y: '-60%' }}
                initial={{ filter: 'blur(6px)', opacity: 0, y: '60%' }}
                key={topic}
                transition={{ duration: 0.5, ease: EASE }}
              >
                {TOPICS[topic]}
              </motion.span>
            </AnimatePresence>
          </span>
        </motion.h1>
        <motion.p
          className="mt-6 max-w-xl text-lg text-pretty text-muted-foreground"
          variants={rise}
        >
          O Caishen lê suas Operações de Crédito, calcula quanto você paga de juros e monta o plano
          para você quitar tudo, sem nunca mover um centavo.
        </motion.p>
        <motion.div className="mt-9 flex flex-col items-center gap-3 sm:flex-row" variants={rise}>
          <Button asChild className="h-12 px-6 text-base" size="lg">
            <Link to="/sign-in">Começar de graça</Link>
          </Button>
          <Button asChild className="h-12 px-6 text-base" size="lg" variant="outline">
            <a href="#como-funciona">Como funciona</a>
          </Button>
        </motion.div>
      </motion.div>

      <div className="mx-auto mt-16 max-w-5xl [perspective:1600px] sm:mt-20" ref={shot}>
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 60 }}
          style={{ rotateX, scale, transformOrigin: 'center top' }}
          transition={{ delay: 0.35, duration: 1, ease: EASE }}
        >
          <BrowserFrame>
            <img
              alt="O Dashboard do Caishen com Score, Saldo Devedor, Avisos e últimos Workflows"
              className="block w-full"
              height={1560}
              src="/landing/app-dashboard.jpg"
              width={2080}
            />
          </BrowserFrame>
        </motion.div>
      </div>
    </section>
  );
}

/** A soft warm light behind the hero, drifting slowly. */
function Glow() {
  return (
    <motion.div
      animate={{ opacity: [0.55, 0.8, 0.55], scale: [1, 1.08, 1] }}
      aria-hidden
      className="pointer-events-none absolute inset-x-0 -top-32 mx-auto h-[520px] max-w-4xl rounded-full bg-[radial-gradient(closest-side,#f3d9a4,transparent)] blur-3xl"
      transition={{ duration: 10, ease: 'easeInOut', repeat: Infinity }}
    />
  );
}

function BrowserFrame({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_30px_80px_-20px_rgba(30,26,23,0.35)]">
      <div className="flex items-center gap-1.5 border-b border-border bg-muted/60 px-4 py-3">
        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
        <span className="size-2.5 rounded-full bg-[#febc2e]" />
        <span className="size-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-3 truncate rounded-md bg-card px-3 py-0.5 text-xs text-muted-foreground">
          caishen.app
        </span>
      </div>
      {children}
    </div>
  );
}

function SectionTitle({ eyebrow, id, title }: { eyebrow: string; id: string; title: string }) {
  return (
    <motion.div className="mx-auto max-w-2xl text-center" variants={rise} {...onView}>
      <p className="text-sm font-medium tracking-widest text-muted-foreground uppercase">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl" id={id}>
        {title}
      </h2>
    </motion.div>
  );
}

function Features() {
  return (
    <section
      aria-labelledby="recursos-title"
      className="scroll-mt-20 px-4 py-24 sm:px-6 sm:py-32"
      id="recursos"
    >
      <SectionTitle
        eyebrow="Recursos"
        id="recursos-title"
        title="Tudo o que você precisa para cuidar do seu dinheiro"
      />
      <motion.ul
        className="mx-auto mt-14 grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3"
        variants={stagger}
        {...onView}
      >
        {FEATURES.map(({ description, icon: Icon, title }) => (
          <motion.li
            className="group rounded-xl border border-border bg-card p-6 transition-shadow duration-300 hover:shadow-[0_12px_40px_-12px_rgba(30,26,23,0.25)]"
            key={title}
            variants={rise}
            whileHover={{ y: -4 }}
          >
            <span className="grid size-10 place-items-center rounded-lg bg-foreground text-background transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
              <Icon className="size-5" />
            </span>
            <h3 className="mt-5 text-lg font-semibold">{title}</h3>
            <p className="mt-2 text-muted-foreground">{description}</p>
          </motion.li>
        ))}
      </motion.ul>
    </section>
  );
}

function Steps() {
  return (
    <section
      aria-labelledby="como-funciona-title"
      className="scroll-mt-20 bg-foreground px-4 py-24 text-background sm:px-6 sm:py-32"
      id="como-funciona"
    >
      <motion.div className="mx-auto max-w-2xl text-center" variants={rise} {...onView}>
        <p className="text-sm font-medium tracking-widest text-background/60 uppercase">
          Como funciona
        </p>
        <h2
          className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
          id="como-funciona-title"
        >
          Do caos ao plano em três passos
        </h2>
      </motion.div>
      <motion.ol
        className="mx-auto mt-16 grid max-w-5xl gap-10 md:grid-cols-3"
        variants={stagger}
        {...onView}
      >
        {STEPS.map((step, index) => (
          <motion.li className="relative" key={step.title} variants={rise}>
            <span className="text-5xl font-semibold text-background/20 tabular-nums">
              {String(index + 1).padStart(2, '0')}
            </span>
            <motion.span
              className="mt-4 block h-px origin-left bg-background/30"
              transition={{ delay: 0.3 + index * 0.15, duration: 0.8, ease: EASE }}
              variants={{ hidden: { scaleX: 0 }, shown: { scaleX: 1 } }}
            />
            <h3 className="mt-5 text-xl font-semibold">{step.title}</h3>
            <p className="mt-2 text-background/70">{step.description}</p>
          </motion.li>
        ))}
      </motion.ol>
    </section>
  );
}

function Shots() {
  return (
    <section aria-labelledby="telas-title" className="px-4 py-24 sm:px-6 sm:py-32">
      <SectionTitle eyebrow="O app" id="telas-title" title="Feito para você ver tudo com clareza" />
      <motion.div
        className="mx-auto mt-14 grid max-w-6xl gap-6 md:grid-cols-3"
        variants={stagger}
        {...onView}
      >
        {SHOTS.map(shot => (
          <motion.figure key={shot.src} variants={rise} whileHover={{ y: -6 }}>
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <motion.img
                alt={shot.alt}
                className="block aspect-[4/3] w-full object-cover object-top"
                loading="lazy"
                src={shot.src}
                transition={{ duration: 0.6, ease: EASE }}
                whileHover={{ scale: 1.04 }}
              />
            </div>
            <figcaption className="mt-3 text-center text-sm text-muted-foreground">
              {shot.caption}
            </figcaption>
          </motion.figure>
        ))}
      </motion.div>
    </section>
  );
}

function Trust() {
  return (
    <section className="px-4 sm:px-6">
      <motion.div
        className="mx-auto flex max-w-5xl flex-col items-start gap-6 rounded-2xl border border-border bg-card p-8 sm:flex-row sm:items-center sm:p-12"
        variants={rise}
        {...onView}
      >
        <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
          <ShieldCheck className="size-7" />
        </span>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">O Caishen só lê</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Ele entra nas ferramentas que você conecta, lê o que precisa e volta com o trabalho
            pronto. Nunca altera nada lá fora, nunca guarda senhas e nunca movimenta dinheiro.
          </p>
        </div>
      </motion.div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="px-4 py-24 sm:px-6 sm:py-32">
      <motion.div
        className="mx-auto flex max-w-2xl flex-col items-center text-center"
        variants={stagger}
        {...onView}
      >
        <motion.div
          className="grid size-16 place-items-center rounded-2xl bg-foreground text-background"
          variants={{
            hidden: { opacity: 0, rotate: -12, scale: 0.6 },
            shown: {
              opacity: 1,
              rotate: 0,
              scale: 1,
              transition: { damping: 14, stiffness: 180, type: 'spring' },
            },
          }}
        >
          <Logo size={30} />
        </motion.div>
        <motion.h2
          className="mt-8 text-3xl font-semibold tracking-tight text-balance sm:text-5xl"
          variants={rise}
        >
          Comece hoje a sair do vermelho
        </motion.h2>
        <motion.p className="mt-4 text-lg text-muted-foreground" variants={rise}>
          Grátis para começar. Sem senha: você entra com um link no seu e-mail ou com o Google.
        </motion.p>
        <motion.div variants={rise}>
          <Button asChild className="mt-9 h-12 px-8 text-base" size="lg">
            <Link to="/sign-in">Começar de graça</Link>
          </Button>
        </motion.div>
      </motion.div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
        <Brand />
        <p>© {new Date().getFullYear()} Caishen. Seu dinheiro, com clareza.</p>
      </div>
    </footer>
  );
}
