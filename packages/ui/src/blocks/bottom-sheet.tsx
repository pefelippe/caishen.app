import { XIcon } from 'lucide-react';
import { AnimatePresence, motion, useDragControls, useReducedMotion } from 'motion/react';
import { Dialog } from 'radix-ui';
import type { ReactNode } from 'react';

import { cn } from '@zapbots/ui/lib/utils';

/** How far down (px), or how fast (px/s), a drag has to go to close the sheet. */
const CLOSE_DISTANCE = 120;
const CLOSE_SPEED = 500;
const SPRING = { bounce: 0, type: 'spring', visualDuration: 0.3 } as const;

/**
 * A sheet from the bottom of a phone's screen. Its top (the grabber and the title) follows the
 * finger down and lets go to close past 120px or on a quick flick; less than that springs back.
 * It comes and goes on a spring, so closing it while it still rises turns it around from where it
 * is. The ✕ stays for whoever does not swipe; with reduced motion it only fades.
 */
export function BottomSheet({
  children,
  className,
  onOpenChange,
  open,
  title,
}: {
  children: ReactNode;
  className?: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: ReactNode;
}) {
  const still = useReducedMotion();
  const drag = useDragControls();

  return (
    <Dialog.Root onOpenChange={onOpenChange} open={open}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                animate={{ opacity: 1 }}
                className="fixed inset-0 z-50 bg-black/50"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                transition={{ duration: still ? 0.12 : 0.25 }}
              />
            </Dialog.Overlay>
            <Dialog.Content aria-describedby={undefined} asChild forceMount>
              <motion.div
                animate={still ? { opacity: 1 } : { y: 0 }}
                className={cn(
                  'fixed inset-x-0 bottom-0 z-50 flex max-h-[85svh] flex-col rounded-t-3xl bg-background pb-[calc(env(safe-area-inset-bottom)+1.5rem)] shadow-lg',
                  className
                )}
                drag={still ? false : 'y'}
                dragConstraints={{ bottom: 0, top: 0 }}
                dragControls={drag}
                dragElastic={{ bottom: 1, top: 0 }}
                dragListener={false}
                exit={still ? { opacity: 0 } : { y: '100%' }}
                initial={still ? { opacity: 0 } : { y: '100%' }}
                onDragEnd={(_, info) => {
                  if (info.offset.y > CLOSE_DISTANCE || info.velocity.y > CLOSE_SPEED)
                    onOpenChange(false);
                }}
                transition={still ? { duration: 0.12 } : SPRING}
              >
                {/* The handle: dragging starts here, so the list under it still scrolls. */}
                <div
                  className="flex shrink-0 cursor-grab touch-none flex-col px-5 pt-2.5 pb-1 select-none active:cursor-grabbing"
                  onPointerDown={event => drag.start(event)}
                >
                  <span
                    aria-hidden
                    className="mx-auto h-1.5 w-10 rounded-full bg-muted-foreground/30"
                  />
                  <Dialog.Title className="mt-3 text-lg font-semibold text-foreground">
                    {title}
                  </Dialog.Title>
                </div>
                <div className="min-h-0 overflow-y-auto overscroll-contain">{children}</div>
                <Dialog.Close className="absolute top-3 right-3 grid size-11 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                  <XIcon className="size-5" />
                  <span className="sr-only">Fechar</span>
                </Dialog.Close>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
