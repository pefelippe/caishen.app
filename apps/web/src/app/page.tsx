'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { Coin } from '@caishen/ui';

/* ---------------- Brand palette ----------------
   cream  #FFFBF7  (background, kept)
   ink    #1C1917  (text)
   navy   #0B3D91  (primary — imperial blue)
   jade   #0E7C66  (prosperity accent)
   gold   #C79A3A  (coin, used sparingly)
   No purple — ever.
------------------------------------------------- */

const DISPLAY = '[font-family:var(--font-display)]';
const MONO = '[font-family:var(--font-mono)]';

function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-stone-900/5 bg-[#FFFBF7]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" className="flex items-center gap-2.5">
          <Coin className="text-[#C79A3A]" size={26} />
          <span className={`${DISPLAY} text-lg font-bold tracking-tight text-[#1C1917]`}>Caishen</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-stone-600 md:flex">
          <a href="#how" className="transition-colors hover:text-[#1C1917]">How it works</a>
          <a href="#features" className="transition-colors hover:text-[#1C1917]">Features</a>
          <a href="#pricing" className="transition-colors hover:text-[#1C1917]">Pricing</a>
        </nav>
        <Link href="/login" className="rounded-full bg-[#1C1917] px-5 py-2 text-sm font-semibold text-white transition-transform hover:scale-[1.03]">
          Get started
        </Link>
      </div>
    </header>
  );
}

/* The AI advisor answering, in plain language. */
function ChatBubble({
  from,
  children,
  delay,
}: {
  from: 'user' | 'caishen';
  children: React.ReactNode;
  delay: number;
}) {
  const reduce = useReducedMotion();
  const isUser = from === 'user';
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[15px] leading-snug shadow-sm ${
          isUser
            ? 'rounded-br-md bg-[#0E7C66] text-white'
            : 'rounded-bl-md border border-stone-900/5 bg-white text-[#1C1917]'
        }`}
      >
        {children}
      </div>
    </motion.div>
  );
}

function Hero() {
  const reduce = useReducedMotion();
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-24 pt-32 lg:grid-cols-[1.05fr_0.95fr] lg:pt-40">
      <div>
        <div className={`${MONO} mb-6 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#C79A3A]`}>
          <span>财神</span>
          <span className="text-stone-400">·</span>
          <span className="text-stone-500">your AI money advisor</span>
        </div>
        <motion.h1
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className={`${DISPLAY} text-6xl font-bold leading-[0.95] tracking-tight text-[#1C1917] sm:text-7xl lg:text-8xl`}
        >
          Your money,<br />
          finally <span className="text-[#0B3D91]">clear</span>.
        </motion.h1>
        <p className="mt-6 max-w-md text-lg leading-relaxed text-stone-600">
          Caishen reads your statements, builds your spreadsheet, and shows you
          how to clear debt and invest what&apos;s left.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-3">
          <Link href="/login" className="inline-flex w-48 items-center justify-center rounded-full bg-[#1C1917] px-7 py-3.5 text-sm font-semibold text-white transition-transform hover:scale-[1.03]">
            Start free
          </Link>
          <a href="#how" className="inline-flex w-48 items-center justify-center rounded-full border border-stone-300 px-7 py-3.5 text-sm font-semibold text-[#1C1917] transition-colors hover:border-stone-900/40">
            See how it works
          </a>
        </div>
        <p className={`${MONO} mt-6 text-xs text-stone-500`}>
          No card · Magic link by email · Cancel anytime
        </p>
      </div>

      {/* right — the advisor at work */}
      <div className="relative">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 24, rotate: -1 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: 'easeOut' }}
          className="relative rounded-[28px] border border-stone-900/10 bg-[#F3EFE7] p-4 shadow-xl"
        >
          <div className="mb-3 flex items-center gap-3 px-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0B3D91] text-[#C79A3A]">
              <Coin size={20} />
            </div>
            <div>
              <div className="text-sm font-semibold text-[#1C1917]">Caishen</div>
              <div className="text-xs text-[#0E7C66]">advisor</div>
            </div>
          </div>
          <div className="space-y-2.5 rounded-2xl bg-[#FFFBF7] p-4">
            <ChatBubble from="caishen" delay={0}>
              I read your Nubank statement — 3 loans and a card. Want the summary?
            </ChatBubble>
            <ChatBubble from="user" delay={0.15}>yes. what do I fix first?</ChatBubble>
            <ChatBubble from="caishen" delay={0.3}>
              The card: <b className={MONO}>$4,200</b> at 22% is bleeding{' '}
              <b className={MONO}>~$77/mo</b> in interest. Kill it before the loans.
            </ChatBubble>
            <ChatBubble from="caishen" delay={0.45}>
              Your car loan ends in 8 months — that frees{' '}
              <b className={MONO}>$340/mo</b>. Put it in an index fund and you&apos;re
              net positive by June. 📈
            </ChatBubble>
          </div>
        </motion.div>
        <motion.div
          aria-hidden
          animate={reduce ? undefined : { y: [0, -10, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -right-5 -top-6 text-[#C79A3A]/80"
        >
          <Coin size={54} />
        </motion.div>
      </div>
    </section>
  );
}

function How() {
  const steps = [
    {
      t: 'Bring your documents',
      d: 'Upload invoices, bank statements, car and personal loans — or forward them on WhatsApp. Caishen reads every line.',
    },
    {
      t: 'It builds your spreadsheet',
      d: 'Each transaction is extracted, categorized, and kept in a custom sheet that updates itself. It stays yours to export.',
    },
    {
      t: 'The AI tells you what to do',
      d: 'A real plan to clear debt, alerts before bills hit, and where to put the money you free up — not just charts.',
    },
  ];
  return (
    <section id="how" className="border-y border-stone-900/5 bg-[#F3EFE7]/50">
      <div className="mx-auto max-w-6xl px-5 py-24">
        <p className={`${MONO} mb-3 text-xs uppercase tracking-[0.2em] text-[#C79A3A]`}>how it works</p>
        <h2 className={`${DISPLAY} max-w-xl text-3xl font-bold tracking-tight text-[#1C1917] sm:text-4xl`}>
          From a pile of statements to a plan.
        </h2>
        <div className="mt-14 grid gap-10 md:grid-cols-3">
        {steps.map((s, i) => (
          <motion.div
            key={s.t}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
          >
            <div className="mb-5 flex items-center gap-3">
              <span className={`${MONO} text-sm text-[#C79A3A]`}>0{i + 1}</span>
              <span className="h-px flex-1 bg-stone-900/10" />
              <Coin className="text-[#0E7C66]" size={22} />
            </div>
            <h3 className={`${DISPLAY} text-xl font-semibold text-[#1C1917]`}>{s.t}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-stone-600">{s.d}</p>
          </motion.div>
        ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const feats = [
    { t: 'Reads your documents', d: 'Invoices, bank statements, car loans, personal loans. Drop a file and Caishen pulls out every line.' },
    { t: 'Your spreadsheet, automatic', d: 'A custom sheet built and kept current for you. Export it anytime — the data is always yours.' },
    { t: 'An AI that gives a plan', d: 'Concrete steps to clear debt and invest what you free up. Ask it anything about your money.' },
    { t: 'On every channel', d: 'WhatsApp, web, email. Log an expense or ask a question from wherever you already are.' },
  ];
  return (
    <section id="features" className="border-t border-stone-900/5">
      <div className="mx-auto max-w-6xl px-5 py-24">
        <p className={`${MONO} mb-3 text-xs uppercase tracking-[0.2em] text-[#C79A3A]`}>what you get</p>
        <div className="mb-14 flex items-end justify-between gap-6">
          <h2 className={`${DISPLAY} max-w-lg text-3xl font-bold tracking-tight text-[#1C1917] sm:text-4xl`}>
            One place for every account — and someone to read it for you.
          </h2>
          <Coin className="hidden shrink-0 text-[#C79A3A] md:block" size={44} />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {feats.map((f, i) => (
            <motion.div
              key={f.t}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              whileHover={{ y: -4 }}
              className="group rounded-2xl border border-stone-900/10 bg-white p-8 shadow-sm transition-shadow hover:shadow-lg"
            >
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#0B3D91]/5 text-[#0B3D91] transition-colors group-hover:bg-[#0B3D91] group-hover:text-[#C79A3A]">
                <Coin size={22} />
              </div>
              <h3 className={`${DISPLAY} text-lg font-semibold text-[#1C1917]`}>{f.t}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-stone-600">{f.d}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const tiers = [
    { name: 'Free', price: '$0', note: 'forever', feats: ['Import statements & invoices', 'Auto spreadsheet', 'Basic insights'], cta: 'Get started', highlight: false },
    { name: 'Pro', price: '$5', note: '/mo', feats: ['Everything in Free', 'AI debt & investing plan', 'Unlimited documents', 'Priority support'], cta: 'Go Pro', highlight: true },
    { name: 'Business', price: '$25', note: '/mo', feats: ['Everything in Pro', 'Multiple accounts', 'Advanced analytics', 'Dedicated support'], cta: 'Talk to sales', highlight: false },
  ];
  return (
    <section id="pricing" className="border-t border-stone-900/5">
      <div className="mx-auto max-w-6xl px-5 py-24">
        <p className={`${MONO} mb-3 text-xs uppercase tracking-[0.2em] text-[#C79A3A]`}>pricing</p>
        <h2 className={`${DISPLAY} text-3xl font-bold tracking-tight text-[#1C1917] sm:text-4xl`}>
          Start free. Grow when it makes sense.
        </h2>
        <div className="mt-14 grid items-start gap-6 lg:grid-cols-3">
          {tiers.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ y: -6 }}
              className={`relative flex flex-col rounded-3xl p-8 ${
                t.highlight
                  ? 'bg-[#0B3D91] text-white shadow-2xl lg:-mt-3 lg:pb-11'
                  : 'border border-stone-900/10 bg-[#FFFBF7] text-[#1C1917] shadow-sm'
              }`}
            >
              {t.highlight && (
                <span className={`${MONO} absolute -top-3 left-8 rounded-full bg-[#C79A3A] px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#1C1917]`}>
                  Most popular
                </span>
              )}
              <div className="flex items-center justify-between">
                <span className={`${DISPLAY} text-lg font-semibold`}>{t.name}</span>
                {t.highlight && <Coin className="text-[#C79A3A]" size={24} />}
              </div>
              <div className="mt-6 flex items-baseline gap-1">
                <span className={`${DISPLAY} text-4xl font-bold`}>{t.price}</span>
                <span className={`text-sm ${t.highlight ? 'text-white/60' : 'text-stone-500'}`}>{t.note}</span>
              </div>
              <ul className="mt-6 space-y-3 text-sm">
                {t.feats.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Coin className={t.highlight ? 'mt-0.5 shrink-0 text-[#C79A3A]' : 'mt-0.5 shrink-0 text-[#0E7C66]'} size={15} />
                    <span className={t.highlight ? 'text-white/85' : 'text-stone-600'}>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled
                title="Coming soon"
                className={`mt-8 cursor-not-allowed rounded-full py-3 text-center text-sm font-semibold opacity-55 ${
                  t.highlight ? 'bg-[#C79A3A] text-[#1C1917]' : 'bg-[#0B3D91] text-white'
                }`}
              >
                {t.cta}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-24">
      <div className="relative overflow-hidden rounded-[32px] bg-[#0E7C66] px-8 py-16 text-center text-white sm:py-20">
        <Coin className="absolute -left-8 -top-8 text-white/10" size={140} />
        <Coin className="absolute -bottom-10 -right-6 text-white/10" size={160} />
        <h2 className={`${DISPLAY} relative text-3xl font-bold tracking-tight sm:text-4xl`}>
          Stop guessing where your money goes.
        </h2>
        <p className="relative mx-auto mt-4 max-w-md text-white/80">
          Upload one statement and watch Caishen build the full picture — then tell you exactly what to do next.
        </p>
        <Link href="/login" className="relative mt-8 inline-block rounded-full bg-[#FFFBF7] px-8 py-3.5 text-sm font-semibold text-[#0B3D91] transition-transform hover:scale-[1.03]">
          Start free
        </Link>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-stone-900/10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-5 py-10 sm:flex-row">
        <div className="flex items-center gap-2.5">
          <Coin className="text-[#C79A3A]" size={22} />
          <span className={`${DISPLAY} font-bold text-[#1C1917]`}>Caishen</span>
        </div>
        <p className={`${MONO} text-xs text-stone-400`}>© 2026 Caishen</p>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FFFBF7]">
      <Nav />
      <main>
        <Hero />
        <How />
        <Features />
        <Pricing />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
