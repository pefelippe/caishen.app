import { motion } from 'motion/react';
import { Fragment, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

import { formatCents } from '../lib/format';
import { useI18n } from '../lib/i18n';

export interface SummaryFigures {
  balanceCents: number;
  commitmentsCents: number;
  expensesCents: number;
  incomeCents: number;
}

/**
 * A month (or any period) at a glance, written as the sum it is: what came in, less the
 * Compromissos, less the Gastos, is what is left (or missing), the result in the largest type. Under
 * it one bar of what came in, split the same way. `heading` goes above it.
 */
export function MonthSummary({
  figures,
  heading,
}: {
  figures: SummaryFigures;
  heading?: ReactNode;
}) {
  const { t } = useI18n();
  const { balanceCents, commitmentsCents, expensesCents, incomeCents } = figures;
  const out = commitmentsCents + expensesCents;
  const short = balanceCents < 0;
  // The bar is as long as the larger side, so spending more than came in still fits.
  const whole = Math.max(incomeCents, out, 1);
  const share = (cents: number) => `${Math.max(0, (cents / whole) * 100)}%`;
  const percent = (cents: number) =>
    incomeCents > 0 ? `${Math.round((cents / incomeCents) * 100)}%` : null;
  const left = {
    color: short ? 'bg-destructive/70' : 'bg-success/70',
    detail: t(short ? 'summary.missing.detail' : 'summary.left.detail'),
    label: t(short ? 'summary.missing' : 'summary.left'),
    value: Math.abs(balanceCents),
  };
  const parts = [
    {
      color: 'bg-primary',
      detail: t('summary.commitments.detail'),
      label: t('summary.commitments'),
      value: commitmentsCents,
    },
    {
      color: 'bg-primary/40',
      detail: t('summary.expenses.detail'),
      label: t('summary.expenses'),
      value: expensesCents,
    },
  ];
  // Entrou − Compromissos − Gastos = Sobra.
  const terms = [
    {
      detail: t('summary.in.detail'),
      label: t('summary.in'),
      value: incomeCents,
    },
    ...parts,
  ];

  return (
    <section className="@container flex flex-col gap-6 rounded-2xl bg-card p-6 md:p-8">
      {heading}
      <dl className="flex flex-col gap-4 @3xl:flex-row @3xl:items-end @3xl:gap-5">
        {terms.map((term, index) => (
          <Fragment key={term.label}>
            {index > 0 && <Operator>−</Operator>}
            <div className="flex flex-col gap-1" title={term.detail}>
              <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                {'color' in term && <span className={cn('size-2.5 rounded-full', term.color)} />}
                {term.label}
                {'color' in term && <span className="tabular-nums">{percent(term.value)}</span>}
              </dt>
              <dd className="text-2xl font-semibold tracking-tight tabular-nums">
                {formatCents(term.value)}
              </dd>
            </div>
          </Fragment>
        ))}
        <Operator>=</Operator>
        <div className="flex flex-col gap-1 @3xl:ml-auto @3xl:items-end" title={left.detail}>
          <dt className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className={cn('size-2.5 rounded-full', left.color)} />
            {left.label}
            {!short && <span className="tabular-nums">{percent(left.value)}</span>}
          </dt>
          <dd
            className={cn(
              'text-4xl font-semibold tracking-tight tabular-nums @5xl:text-5xl',
              short ? 'text-destructive' : 'text-success'
            )}
          >
            {formatCents(left.value)}
          </dd>
        </div>
      </dl>

      <div aria-hidden className="flex h-3 gap-1 overflow-hidden rounded-full bg-muted">
        {/* What is missing is not part of what came in: the bar shows only what went out. */}
        {(short ? parts : [...parts, left])
          .filter(part => part.value > 0)
          .map(part => (
            <motion.div
              animate={{ width: share(part.value) }}
              className={cn('h-full shrink-0 rounded-full', part.color)}
              initial={{ width: 0 }}
              key={part.label}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            />
          ))}
      </div>
    </section>
  );
}

/** The − and = between the figures, hidden where they stack. */
function Operator({ children }: { children: ReactNode }) {
  return (
    <span aria-hidden className="hidden pb-1 text-2xl text-muted-foreground @3xl:block">
      {children}
    </span>
  );
}
