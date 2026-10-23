import { ArrowUpIcon } from 'lucide-react';
import { motion, type Variants } from 'motion/react';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { CHAT_SUGGESTIONS, useChatPanel } from '../components/ChatPanel';
import { Logo } from '../components/Logo';
import { useI18n } from '../lib/i18n';

const EASE = [0.22, 1, 0.36, 1] as const;

const stagger: Variants = { hidden: {}, shown: { transition: { staggerChildren: 0.07 } } };
const rise: Variants = {
  hidden: { opacity: 0, y: 16 },
  shown: { opacity: 1, transition: { duration: 0.55, ease: EASE }, y: 0 },
};

/** The greeting, centered, and the line to ask the Caishen AI; sending opens the chat panel. */
function Ask({ name }: { name: string }) {
  const { t } = useI18n();
  const { startNew } = useChatPanel();
  const [draft, setDraft] = useState('');

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.trim()) return;
    startNew(draft.trim());
    setDraft('');
  };

  return (
    <motion.section
      className="mx-auto flex w-full max-w-2xl flex-col items-center gap-7 pt-10 text-center md:pt-16"
      variants={stagger}
    >
      <motion.div
        className="grid size-14 place-items-center rounded-2xl bg-foreground text-background"
        variants={{
          hidden: { opacity: 0, rotate: -12, scale: 0.6 },
          shown: {
            opacity: 1,
            rotate: 0,
            scale: 1,
            transition: { damping: 14, stiffness: 200, type: 'spring' },
          },
        }}
      >
        <Logo size={26} />
      </motion.div>
      <motion.h1 className="text-4xl font-semibold tracking-tight md:text-5xl" variants={rise}>
        {t('welcome.hello', { name })}
      </motion.h1>
      <motion.form
        className="flex h-16 w-full items-center gap-2 rounded-full bg-card pr-2 pl-6 shadow-[0_12px_40px_-16px_rgb(13_13_13/0.35)] transition-shadow focus-within:shadow-[0_12px_40px_-12px_rgb(13_13_13/0.45)]"
        onSubmit={onSubmit}
        variants={rise}
      >
        <Input
          aria-label={t('welcome.ask')}
          className="h-full flex-1 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0 md:text-base"
          onChange={event => setDraft(event.target.value)}
          placeholder={t('welcome.askAi')}
          value={draft}
        />
        <Button
          aria-label={t('welcome.send')}
          className="size-12 rounded-full"
          disabled={!draft.trim()}
          size="icon"
          title={t('welcome.send')}
          type="submit"
        >
          <ArrowUpIcon className="size-5" />
        </Button>
      </motion.form>
      <motion.div className="flex flex-wrap justify-center gap-2" variants={rise}>
        {CHAT_SUGGESTIONS.map(suggestion => (
          <Button
            className="h-9 rounded-full bg-card px-4 font-normal"
            key={suggestion.text}
            onClick={() => setDraft(suggestion.text)}
            variant="ghost"
          >
            <suggestion.icon className="size-4" />
            {suggestion.text}
          </Button>
        ))}
      </motion.div>
    </motion.section>
  );
}

/** The Dashboard, like a host's home: "Olá" and the Caishen AI in the middle. */
export function DashboardPage({ user }: { user: { name: string } }) {
  return (
    <motion.div
      animate="shown"
      className="mx-auto flex min-h-full w-full max-w-5xl flex-col justify-center pb-16"
      initial="hidden"
      variants={stagger}
    >
      <Ask name={user.name.split(' ')[0]!} />
    </motion.div>
  );
}
