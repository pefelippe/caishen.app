import {
  CreditCardIcon,
  MessageSquarePlusIcon,
  PlugIcon,
  PlusIcon,
  WalletIcon,
  type LucideIcon,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';

import { useI18n, type StringKey } from '../lib/i18n';
import { useChatPanel } from './ChatPanel';

const EASE = [0.22, 1, 0.36, 1] as const;

/** What the "+" offers, from the most asked down; `to` opens a screen, otherwise the chat. */
const ACTIONS: { icon: LucideIcon; label: StringKey; to?: string }[] = [
  { icon: MessageSquarePlusIcon, label: 'quick.chat' },
  { icon: CreditCardIcon, label: 'quick.operation', to: '/caishen/finances#obligations' },
  { icon: WalletIcon, label: 'quick.income', to: '/caishen/finances#income' },
  { icon: PlugIcon, label: 'quick.integration', to: '/integrations' },
];

/** The round "+" at the bottom right of the screen: a short list of things to start. */
export function QuickActions() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { startNew } = useChatPanel();
  const [open, setOpen] = useState(false);

  const run = (action: (typeof ACTIONS)[number]) => {
    setOpen(false);
    if (action.to) navigate(action.to);
    else startNew();
  };

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverAnchor asChild>
        <motion.div
          animate={{ opacity: 1, scale: 1 }}
          className="absolute right-6 bottom-6 z-30 print:hidden"
          initial={{ opacity: 0, scale: 0.6 }}
          transition={{ damping: 16, delay: 0.4, stiffness: 220, type: 'spring' }}
        >
          <Button
            aria-expanded={open}
            aria-label={t('quick.open')}
            className="size-14 rounded-full shadow-[0_10px_30px_-8px_rgb(30_26_23/0.55)] transition-transform hover:scale-105 active:scale-95"
            onClick={() => setOpen(current => !current)}
            size="icon"
            title={t('quick.open')}
          >
            <motion.span
              animate={{ rotate: open ? 135 : 0 }}
              className="grid place-items-center"
              transition={{ damping: 14, stiffness: 260, type: 'spring' }}
            >
              <PlusIcon className="size-6" />
            </motion.span>
          </Button>
        </motion.div>
      </PopoverAnchor>
      <AnimatePresence>
        {open && (
          <PopoverContent
            align="end"
            asChild
            className="w-64 border-0 bg-transparent p-0 shadow-none data-[state=closed]:animate-none data-[state=open]:animate-none"
            forceMount
            side="top"
            sideOffset={12}
          >
            <motion.ul
              animate="shown"
              className="flex flex-col items-end gap-2"
              exit="hidden"
              initial="hidden"
              variants={{
                hidden: { transition: { staggerChildren: 0.03, staggerDirection: -1 } },
                shown: { transition: { staggerChildren: 0.05, staggerDirection: -1 } },
              }}
            >
              {ACTIONS.map(action => (
                <motion.li
                  key={action.label}
                  variants={{
                    hidden: { opacity: 0, scale: 0.9, y: 12 },
                    shown: {
                      opacity: 1,
                      scale: 1,
                      transition: { duration: 0.3, ease: EASE },
                      y: 0,
                    },
                  }}
                >
                  <Button
                    className="h-11 gap-3 rounded-full border border-border bg-card pr-5 pl-3 text-foreground shadow-md hover:bg-secondary"
                    onClick={() => run(action)}
                    variant="ghost"
                  >
                    <span className="grid size-7 place-items-center rounded-full bg-foreground text-background">
                      <action.icon className="size-3.5" />
                    </span>
                    {t(action.label)}
                  </Button>
                </motion.li>
              ))}
            </motion.ul>
          </PopoverContent>
        )}
      </AnimatePresence>
    </Popover>
  );
}
