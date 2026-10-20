import { AnimatePresence, MotionConfig, motion, type Variants } from 'motion/react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';

import { LandingPreview } from '../components/LandingPreview';

import '../landing.css';

const FONTS =
  'https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@400;500;700&display=swap';

// ---------------------------------------------------------------- motion

const EASE = [0.22, 1, 0.36, 1] as const;

/** A block that rises into place the first time it scrolls into view. */
const rise: Variants = {
  hidden: { opacity: 0, y: 24 },
  shown: { opacity: 1, transition: { duration: 0.7, ease: EASE }, y: 0 },
};

/** A parent whose children rise one after another. */
const stagger: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.08 } },
};

// ---------------------------------------------------------------- content

/** What the Caishen is for, turning in the second line of the hero. */
const TOPICS = ['suas finanças', 'sair das dívidas', 'entender seu Score', 'cada parcela'];

// ---------------------------------------------------------------- page

/**
 * The page for visitors who are not signed in: what the Caishen is for and the app itself,
 * which they can try. "Entrar" leads to the LoginPage at /entrar.
 */
export function LandingPage() {
  useFonts();
  return (
    <MotionConfig reducedMotion="user">
      <div className="landing">
        <a className="skip" href="#conteudo">
          Pular para o conteúdo
        </a>
        <Bar />
        <main id="conteudo">
          <Hero />
        </main>
        <footer className="foot">
          <a className="wordmark" href="#topo">
            Caishen
          </a>
        </footer>
      </div>
    </MotionConfig>
  );
}

function Bar() {
  return (
    <header className="bar">
      <a className="wordmark" href="#topo">
        Caishen
      </a>
      <Button asChild className="button">
        <Link to="/sign-in">Entrar</Link>
      </Button>
    </header>
  );
}

/** What it is for, the way in, and the app itself, to click through. */
function Hero() {
  const [topic, setTopic] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTopic(current => (current + 1) % TOPICS.length), 2600);
    return () => clearInterval(timer);
  }, []);

  return (
    <section aria-labelledby="hero-title" className="hero" id="topo">
      <motion.div animate="shown" className="hero__copy" initial="hidden" variants={stagger}>
        <motion.h1 className="hero__title" id="hero-title" variants={rise}>
          IA pessoal para{' '}
          <span className="hero__topics">
            <AnimatePresence initial={false}>
              <motion.span
                animate={{ opacity: 1, y: '0%' }}
                className="hero__topic"
                exit={{ opacity: 0, y: '-50%' }}
                initial={{ opacity: 0, y: '50%' }}
                key={topic}
                transition={{ duration: 0.45, ease: EASE }}
              >
                {TOPICS[topic]}
              </motion.span>
            </AnimatePresence>
          </span>
        </motion.h1>
        <motion.p className="hero__lead" variants={rise}>
          Ele lê suas dívidas e monta o plano para você quitar tudo, sem nunca mover um centavo.
        </motion.p>
        <motion.div className="hero__ctas" variants={rise}>
          <Button asChild className="button button--large">
            <Link to="/sign-in">Começar de graça</Link>
          </Button>
          <a className="text-link" href="#app">
            Ver o app
          </a>
        </motion.div>
      </motion.div>
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        aria-label="Experimente o app: clique no menu à esquerda e nas abas"
        className="hero__app"
        id="app"
        initial={{ opacity: 0, y: 40 }}
        role="region"
        transition={{ delay: 0.3, duration: 0.9, ease: EASE }}
      >
        <LandingPreview />
      </motion.div>
    </section>
  );
}

/** Libre Franklin, only on this page. */
function useFonts() {
  useEffect(() => {
    if (document.querySelector(`link[href="${FONTS}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FONTS;
    document.head.append(link);
  }, []);
}
