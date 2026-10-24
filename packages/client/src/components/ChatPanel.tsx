import { BellIcon, GaugeIcon, ListOrderedIcon, XIcon } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

import { Button } from '@zapbots/ui/components/button';

import type { ChatAttachment } from '../lib/attachments';
import { useI18n } from '../lib/i18n';
import { useDesktop } from '../lib/media';
import { BotPanel } from './BotPanel';
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

  // ⌘K (Ctrl+K elsewhere) opens the chat from anywhere, ready to type.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'k' || !(event.metaKey || event.ctrlKey)) return;
      event.preventDefault();
      setOpen(true);
      // The panel may still be mounting; focus its input once it is there.
      setTimeout(
        () => document.querySelector<HTMLTextAreaElement>('[data-chat-input]')?.focus(),
        60
      );
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
 * The chat with the Caishen, docked on the right beside whatever screen is open: his latest
 * Conversation, the earlier ones and a blank one. On a desktop it opens by growing from the
 * right edge as it fades in; on a phone it covers the screen, rising a little as it fades in.
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

  const shown = desktop ? { opacity: 1, width: WIDTH } : { opacity: 1, y: 0 };
  const hidden = still
    ? { opacity: 0 }
    : desktop
      ? { opacity: 0, width: 0 }
      : { opacity: 0, y: 24 };

  return (
    <AnimatePresence initial={false}>
      {shownHere && (
        <motion.aside
          animate={shown}
          aria-label={t('chat.panel')}
          className="fixed inset-0 z-40 flex flex-col overflow-hidden bg-card md:static md:z-auto md:shrink-0 md:border-l"
          exit={hidden}
          initial={hidden}
          key="chat"
          transition={{ duration: still ? 0.15 : 0.32, ease: EASE }}
        >
          {/* Fixed width inside, so the text does not reflow while the panel grows. */}
          <div className="flex h-full min-h-0 w-full flex-col p-4 md:w-[400px]">
            <BotPanel
              actions={
                <Button
                  aria-label={t('chat.close')}
                  onClick={close}
                  size="icon-sm"
                  title={t('chat.close')}
                  variant="ghost"
                >
                  <XIcon />
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
