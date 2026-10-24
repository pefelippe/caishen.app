import { motion } from 'motion/react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * A white sheet on the gray screen, the one surface of Financeiro and Integrações: its title, a
 * line on what it holds, a total on the right and the things in it. It rises in once, as it
 * scrolls into view; `id` is its anchor.
 */
export function Sheet({
  children,
  className,
  id,
  intro,
  title,
  total,
}: {
  children: ReactNode;
  className?: string;
  id: string;
  intro: ReactNode;
  title: ReactNode;
  total?: ReactNode;
}) {
  return (
    <motion.section
      aria-labelledby={`${id}-title`}
      className={cn('flex scroll-mt-6 flex-col gap-6 rounded-2xl bg-card p-6 md:p-8', className)}
      id={id}
      initial={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.55, ease: EASE }}
      viewport={{ amount: 0.15, once: true }}
      whileInView={{ opacity: 1, y: 0 }}
    >
      <header className="flex flex-wrap items-start justify-between gap-x-8 gap-y-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-2xl font-semibold tracking-tight" id={`${id}-title`}>
            {title}
          </h2>
          <p className="max-w-prose">{intro}</p>
        </div>
        {total && (
          <div className="text-right text-2xl font-semibold tracking-tight tabular-nums">
            {total}
          </div>
        )}
      </header>
      {children}
    </motion.section>
  );
}

/** One thing in a Sheet: its name, what describes it and, on the right, its amount or action. */
export function SheetRow({
  action,
  amount,
  children,
  className,
  detail,
  name,
}: {
  action?: ReactNode;
  amount?: ReactNode;
  /** More about it, on its own line under the name. */
  children?: ReactNode;
  className?: string;
  detail?: ReactNode;
  name: ReactNode;
}) {
  return (
    <li
      className={cn(
        'flex flex-col gap-2 rounded-xl bg-secondary/60 px-4 py-3.5 transition-colors hover:bg-secondary',
        className
      )}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="font-medium">{name}</span>
        {detail && <span className="text-muted-foreground">{detail}</span>}
        {amount && <span className="ml-auto text-lg font-semibold tabular-nums">{amount}</span>}
        {action && <span className={cn('min-w-0 max-w-full', !amount && 'ml-auto')}>{action}</span>}
      </div>
      {children}
    </li>
  );
}
