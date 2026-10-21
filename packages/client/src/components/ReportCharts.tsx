import { useQuery } from '@apollo/client/react';
import { ReportDocument } from '@zapbots/graphql/client';
import { motion } from 'motion/react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { formatCents } from '../lib/format';
import { Sheet } from './Sheet';

const EASE = [0.22, 1, 0.36, 1] as const;

/** The three series, in a fixed order (validated: light surface, CVD-safe; aqua needs labels). */
const SERIES = [
  { color: '#2a78d6', key: 'incomeCents', label: 'Receitas' },
  { color: '#eb6834', key: 'commitmentsCents', label: 'Compromissos' },
  { color: '#1baf7a', key: 'expensesCents', label: 'Gastos' },
] as const;

const short = (month: string) => {
  const name = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' })
    .format(new Date(`${month}-01T00:00:00Z`))
    .replace('.', '');
  return name[0]!.toUpperCase() + name.slice(1);
};

/** Compact money for axis-free labels: "R$ 22 mil". */
const compact = new Intl.NumberFormat('pt-BR', {
  currency: 'BRL',
  maximumFractionDigits: 1,
  notation: 'compact',
  style: 'currency',
});

/**
 * The Relatório's charts: six months of Receitas against Compromissos and Gastos, where the
 * Gastos go, and what is owed on each Credit Operation. Every chart has its numbers in a table too.
 */
export function ReportCharts({ holderId }: { holderId: string }) {
  const { data } = useQuery(ReportDocument, {
    fetchPolicy: 'cache-and-network',
    variables: { holderId },
  });
  const holder = data?.holder;
  if (!holder) return null;
  const months = holder.months;

  const categories = Object.entries(
    months
      .flatMap(month => month.expenses)
      .reduce<Record<string, number>>((totals, item) => {
        const key = item.category ?? 'Sem categoria';
        totals[key] = (totals[key] ?? 0) + item.amountCents;
        return totals;
      }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const debts = holder.creditOperations
    .filter(item => item.outstandingBalanceCents > 0)
    .map(item => [item.name, item.outstandingBalanceCents] as [string, number])
    .sort((a, b) => b[1] - a[1]);

  return (
    <>
      <Sheet
        id="months"
        intro="O que entrou contra o que saiu, mês a mês, nos últimos seis meses."
        title="Receitas e saídas"
      >
        <MonthsChart months={months} />
      </Sheet>
      <div className="grid gap-4 lg:grid-cols-2">
        <Sheet
          id="categories"
          intro="Para onde foram os Gastos nos últimos seis meses."
          title="Gastos por categoria"
        >
          {categories.length ? (
            <Bars color="#1baf7a" rows={categories} />
          ) : (
            <p className="text-muted-foreground">Nenhum gasto registrado ainda.</p>
          )}
        </Sheet>
        <Sheet id="debts" intro="O Saldo Devedor de cada Operação de Crédito hoje." title="Dívidas">
          {debts.length ? (
            <Bars color="#eb6834" rows={debts} />
          ) : (
            <p className="text-muted-foreground">Nenhuma Operação de Crédito em aberto.</p>
          )}
        </Sheet>
      </div>
    </>
  );
}

type Month = {
  balanceCents: number;
  commitmentsCents: number;
  expensesCents: number;
  incomeCents: number;
  month: string;
};

/** Grouped bars, one group per month, with a hover readout and the same numbers as a table. */
function MonthsChart({ months }: { months: Month[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);
  const max = Math.max(1, ...months.flatMap(month => SERIES.map(series => month[series.key])));
  const shown = hover == null ? months.length - 1 : hover;
  const focus = months[shown]!;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ul aria-label="Legenda" className="flex flex-wrap gap-4 text-sm">
          {SERIES.map(series => (
            <li className="flex items-center gap-2" key={series.key}>
              <span className="size-2.5 rounded-sm" style={{ background: series.color }} />
              {series.label}
            </li>
          ))}
        </ul>
        <Button onClick={() => setAsTable(current => !current)} size="sm" variant="ghost">
          {asTable ? 'Ver gráfico' : 'Ver tabela'}
        </Button>
      </div>

      {asTable ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mês</TableHead>
              {SERIES.map(series => (
                <TableHead className="text-right" key={series.key}>
                  {series.label}
                </TableHead>
              ))}
              <TableHead className="text-right">Saldo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {months.map(month => (
              <TableRow key={month.month}>
                <TableCell>{short(month.month)}</TableCell>
                {SERIES.map(series => (
                  <TableCell className="text-right tabular-nums" key={series.key}>
                    {formatCents(month[series.key])}
                  </TableCell>
                ))}
                <TableCell className="text-right font-medium tabular-nums">
                  {formatCents(month.balanceCents)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            <span className="font-medium text-foreground">{short(focus.month)}</span>
            {SERIES.map(series => (
              <span key={series.key}>
                {' · '}
                {series.label} {formatCents(focus[series.key])}
              </span>
            ))}
            {' · '}Saldo{' '}
            <span className={focus.balanceCents < 0 ? 'text-destructive' : 'text-foreground'}>
              {formatCents(focus.balanceCents)}
            </span>
          </p>
          <div
            className="grid h-56 items-end gap-3"
            onMouseLeave={() => setHover(null)}
            style={{ gridTemplateColumns: `repeat(${months.length}, minmax(0, 1fr))` }}
          >
            {months.map((month, index) => (
              <div
                className="flex h-full flex-col justify-end gap-2"
                key={month.month}
                onMouseEnter={() => setHover(index)}
              >
                <div
                  className={`flex h-full items-end justify-center gap-0.5 rounded-lg px-1 transition-colors ${
                    shown === index ? 'bg-secondary/70' : ''
                  }`}
                >
                  {SERIES.map((series, position) => (
                    <motion.span
                      animate={{ height: `${(month[series.key] / max) * 100}%` }}
                      className="w-full max-w-5 rounded-t-[4px]"
                      initial={{ height: 0 }}
                      key={series.key}
                      style={{ background: series.color, minHeight: month[series.key] ? 2 : 0 }}
                      title={`${series.label}: ${formatCents(month[series.key])}`}
                      transition={{
                        delay: index * 0.05 + position * 0.03,
                        duration: 0.7,
                        ease: EASE,
                      }}
                    />
                  ))}
                </div>
                <span className="text-center text-xs text-muted-foreground">
                  {short(month.month)}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Maior valor no período: {compact.format(max / 100)}.
          </p>
        </>
      )}
    </div>
  );
}

/** One horizontal bar per row, labelled with its name and amount. */
function Bars({ color, rows }: { color: string; rows: [string, number][] }) {
  const max = Math.max(1, ...rows.map(([, cents]) => cents));
  return (
    <ul className="flex flex-col gap-3">
      {rows.map(([name, cents], index) => (
        <li className="flex flex-col gap-1.5" key={name}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate">{name}</span>
            <span className="font-medium tabular-nums">{formatCents(cents)}</span>
          </div>
          <span className="h-2 overflow-hidden rounded-full bg-secondary">
            <motion.span
              animate={{ width: `${(cents / max) * 100}%` }}
              className="block h-full rounded-full"
              initial={{ width: 0 }}
              style={{ background: color }}
              transition={{ delay: index * 0.05, duration: 0.8, ease: EASE }}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}
