import { BellIcon, ChevronLeftIcon, GaugeIcon, ListOrderedIcon } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

import { Button } from '@zapbots/ui/components/button';

import type { ChatAttachment } from '../lib/attachments';
import { useI18n } from '../lib/i18n';
import { useDesktop } from '../lib/media';
import { BotPanel, PANEL_BUTTON } from './BotPanel';
import type { Suggestion } from './ChatThread';

const STORAGE_KEY = 'zapbots.chatPanel';
const WIDTH = 400;
const EASE = [0.22, 1, 0.36, 1] as const;
/** Questions offered while a Conversation is still blank. */
export const CHAT_SUGGESTIONS: Suggestion[] = [
  { icon: BellIcon, text: 'O que merece minha atenção agora?' },
  { icon: ListOrderedIcon, text: 'Qual das minhas dívidas devo quitar primeiro?' },
  { icon: GaugeIcon, text: 'Como está meu Score e o que mais pesa nele?' },
];

function storedOpen(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'open';
  } catch {
    return false;
  }
}

interface ChatPanelState {
  close: () => void;
  open: boolean;
  /** Opens the panel with its input focused (the command menu's "Perguntar ao Agente"). */
  openToType: () => void;
  /** Opens the panel on a blank Conversation, sending `message` (and `files`) in it when given. */
  startNew: (message?: string, files?: ChatAttachment[]) => void;
  toggle: () => void;
}

const ChatPanelContext = createContext<ChatPanelState | null>(null);

/** Whether the chat panel is open, remembered in this browser, and the way to open it. */
export function ChatPanelProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(storedOpen);
  // Each blank Conversation asked for remounts the panel on one.
  const [blank, setBlank] = useState(0);
  const [firstMessage, setFirstMessage] = useState<string>();
  const [firstFiles, setFirstFiles] = useState<ChatAttachment[]>();

  // Opens the panel ready to type: the input is focused once the panel has mounted.
  const openToType = () => {
    setOpen(true);
    setTimeout(() => document.querySelector<HTMLTextAreaElement>('[data-chat-input]')?.focus(), 60);
  };

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, open ? 'open' : 'closed');
    } catch {
      // Without storage the panel just starts closed next time.
    }
  }, [open]);

  return (
    <ChatPanelContext.Provider
      value={{
        close: () => setOpen(false),
        open,
        openToType,
        startNew: (message, files) => {
          setFirstMessage(message);
          setFirstFiles(files);
          setBlank(current => current + 1);
          setOpen(true);
        },
        toggle: () => setOpen(current => !current),
      }}
    >
      <BlankContext.Provider value={{ blank, firstFiles, firstMessage }}>
        {children}
      </BlankContext.Provider>
    </ChatPanelContext.Provider>
  );
}

const BlankContext = createContext<{
  blank: number;
  firstFiles?: ChatAttachment[];
  firstMessage?: string;
}>({ blank: 0 });

export function useChatPanel(): ChatPanelState {
  const panel = useContext(ChatPanelContext);
  if (!panel) throw new Error('useChatPanel outside ChatPanelProvider');
  return panel;
}

/**
 * The chat with the Caishen, a card floating over the bottom right corner of whatever screen is
 * open, as Mercado Pago's: his latest Conversation, the earlier ones and a blank one. On a desktop
 * it grows from that corner as it fades in; on a phone it covers the screen, rising a little.
 */
export function ChatPanel() {
  const { close, open } = useChatPanel();
  const { blank, firstFiles, firstMessage } = useContext(BlankContext);
  const { t } = useI18n();
  const { pathname } = useLocation();
  const desktop = useDesktop();
  const still = useReducedMotion();
  // The chat page already is the chat; the panel stays closed there.
  const shownHere = open && pathname !== '/chat';

  const shown = { opacity: 1, scale: 1, y: 0 };
  const hidden = still
    ? { opacity: 0 }
    : desktop
      ? { opacity: 0, scale: 0.96, y: 16 }
      : { opacity: 0, y: 24 };

  return (
    <AnimatePresence initial={false}>
      {shownHere && (
        <motion.aside
          animate={shown}
          aria-label={t('chat.panel')}
          className="fixed inset-0 z-40 flex origin-bottom-right flex-col overflow-hidden bg-card md:inset-auto md:right-6 md:bottom-6 md:h-[min(46rem,calc(100svh-6rem))] md:rounded-3xl md:border md:shadow-[0_24px_60px_-20px_rgb(15_23_42/0.3)]"
          exit={hidden}
          initial={hidden}
          key="chat"
          style={desktop ? { width: WIDTH } : undefined}
          transition={{ duration: still ? 0.15 : 0.25, ease: EASE }}
        >
          {/* Covering a phone's screen, it keeps clear of the notch and the home indicator. */}
          <div className="flex h-full min-h-0 w-full flex-col p-4 pt-[max(1rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] md:p-5">
            <BotPanel
              leading={
                <Button
                  aria-label={t('chat.close')}
                  className={PANEL_BUTTON}
                  onClick={close}
                  size="icon"
                  title={t('chat.close')}
                  variant="ghost"
                >
                  <ChevronLeftIcon />
                </Button>
              }
              bot="FINANCE"
              className="h-full"
              firstFiles={firstFiles}
              firstMessage={firstMessage}
              key={blank}
              startBlank={blank > 0}
              suggestions={CHAT_SUGGESTIONS}
            />
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
