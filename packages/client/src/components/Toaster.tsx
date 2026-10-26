import { XIcon } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { Button } from '@zapbots/ui/components/button';
import { cn } from '@zapbots/ui/lib/utils';

import { friendlyError } from '../lib/errors';
import { useI18n } from '../lib/i18n';

export interface ToastInput {
  /** A button beside the message, e.g. Desfazer; pressing it closes the toast. */
  action?: { label: string; onClick: () => void };
  /** How long it stays, in milliseconds; 6s by default. */
  duration?: number;
  /** Called once when it goes, by itself, by its close button or by `action`. */
  onClose?: () => void;
  message: string;
  tone?: 'error';
}

interface Toast extends ToastInput {
  id: number;
}

/** Shows a toast and gives back how to close it early. */
type Show = (toast: ToastInput) => () => void;

const ToastContext = createContext<Show | null>(null);

/** Brief messages at the foot of the screen: what just happened, maybe with a way to undo it. */
export function useToast(): Show {
  const show = useContext(ToastContext);
  if (!show) throw new Error('useToast outside ToasterProvider');
  return show;
}

/**
 * The toasts of the app, stacked at the bottom in the middle (over the tabs on a phone). Each one
 * waits while the pointer or the focus is on it. They come and go on springs, so one closed while
 * still arriving turns back from where it is; with reduced motion they only fade.
 */
export function ToasterProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  // The same list, read and changed outside of rendering, so each `onClose` runs exactly once.
  const list = useRef<Toast[]>([]);
  const next = useRef(0);
  const still = useReducedMotion();

  const close = useCallback((id: number) => {
    const toast = list.current.find(candidate => candidate.id === id);
    if (!toast) return;
    list.current = list.current.filter(candidate => candidate.id !== id);
    setToasts(list.current);
    toast.onClose?.();
  }, []);

  const show = useCallback<Show>(
    toast => {
      const id = ++next.current;
      list.current = [...list.current, { ...toast, id }];
      setToasts(list.current);
      // At most three at once; the oldest goes first.
      for (const old of list.current.slice(0, -3)) close(old.id);
      return () => close(id);
    },
    [close]
  );

  return (
    <ToastContext.Provider value={show}>
      {children}
      <ol
        aria-label="Avisos"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-50 flex flex-col items-center gap-2 px-4 md:bottom-6 print:hidden"
      >
        <AnimatePresence initial={false}>
          {toasts.map(toast => (
            <motion.li
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="pointer-events-auto w-full max-w-md"
              exit={still ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
              initial={still ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 16 }}
              key={toast.id}
              layout={!still}
              transition={
                still ? { duration: 0.12 } : { bounce: 0.15, type: 'spring', visualDuration: 0.25 }
              }
            >
              <ToastCard close={close} toast={toast} />
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
    </ToastContext.Provider>
  );
}

function ToastCard({ close, toast }: { close: (id: number) => void; toast: Toast }) {
  const { t } = useI18n();
  const [paused, setPaused] = useState(false);
  const left = useRef(toast.duration ?? 6000);
  const onClose = () => close(toast.id);

  useEffect(() => {
    if (paused) return;
    const started = Date.now();
    const timer = setTimeout(() => close(toast.id), left.current);
    return () => {
      clearTimeout(timer);
      left.current -= Date.now() - started;
    };
  }, [close, paused, toast.id]);

  return (
    <div
      className={cn(
        'flex min-h-12 items-center gap-2 rounded-xl bg-navy py-1.5 pr-1.5 pl-4 text-sm text-white shadow-lg',
        toast.tone === 'error' && 'bg-destructive'
      )}
      onBlur={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      role={toast.tone === 'error' ? 'alert' : 'status'}
    >
      <p className="min-w-0 flex-1 py-1.5 text-pretty">{toast.message}</p>
      {toast.action && (
        <Button
          className="shrink-0 font-semibold text-white hover:bg-white/15 hover:text-white"
          onClick={() => {
            toast.action!.onClick();
            onClose();
          }}
          size="sm"
          variant="ghost"
        >
          {toast.action.label}
        </Button>
      )}
      <Button
        aria-label={t('toast.close')}
        className="shrink-0 text-white/70 hover:bg-white/15 hover:text-white"
        onClick={onClose}
        size="icon-sm"
        variant="ghost"
      >
        <XIcon />
      </Button>
    </div>
  );
}

/**
 * Deleting without asking first: what goes is hidden at once and a toast offers to undo it for 8
 * seconds; only when the toast goes is the deletion sent. If it fails, what was hidden comes back.
 * Closing the tab before that keeps the record.
 */
export function useUndoableDelete() {
  const toast = useToast();
  const { t } = useI18n();
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());

  const change = (ids: string[], hide: boolean) =>
    setHidden(current => {
      const next = new Set(current);
      for (const id of ids) {
        if (hide) next.add(id);
        else next.delete(id);
      }
      return next;
    });

  const remove = ({
    commit,
    ids,
    message,
  }: {
    /** Sends the deletion; called once the toast goes without Desfazer. */
    commit: () => Promise<unknown>;
    ids: string[];
    message: string;
  }) => {
    change(ids, true);
    let undone = false;
    toast({
      action: {
        label: t('common.undo'),
        onClick: () => {
          undone = true;
          change(ids, false);
        },
      },
      duration: 8000,
      message,
      onClose: () => {
        if (undone) return;
        commit().catch((error: unknown) => {
          change(ids, false);
          toast({ message: friendlyError(error, t('common.deleteFailed')), tone: 'error' });
        });
      },
    });
  };

  return { hidden, remove };
}
