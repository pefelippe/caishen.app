import type { HomeOverviewQuery } from '@zapbots/graphql/client';
import { CreditCardIcon, LandmarkIcon, WalletIcon, type LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Card } from '@zapbots/ui/components/card';
import { cn } from '@zapbots/ui/lib/utils';

import { localToday } from '../lib/bots';
import { formatCents } from '../lib/format';

type Holder = HomeOverviewQuery['viewerHolder'];
type BankLink = HomeOverviewQuery['bankLinks'][number];
type CreditCard = Holder['creditCards'][number];

/** "out/26". */
const shortMonth = (month: string) =>
  new Date(`${month}-15T12:00:00`)
    .toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
    .replace('. de ', '/')
    .replace(' de ', '/');

/** "outubro de 2026". */
const longMonth = (month: string) =>
  new Date(`${month}-15T12:00:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

/** A card of the Visão geral, after Meu Pluggy's: a small title with its icon, a large figure. */
function OverviewCard({
  children,
  className,
  figure,
  icon: Icon,
  title,
}: {
  children: ReactNode;
  className?: string;
  figure: ReactNode;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <Card className={cn('gap-0 overflow-hidden p-0', className)}>
      <div className="flex flex-col gap-1 px-6 pt-6 pb-5">
        <p className="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          <Icon className="size-4 text-primary" />
          {title}
        </p>
        <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{figure}</p>
      </div>
      <div className="flex-1 border-t">{children}</div>
    </Card>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="px-6 py-5 text-sm text-muted-foreground">{children}</p>;
}

/** The banks linked through Open Finance and what is in their accounts (docs/adr/0020). */
function Accounts({ links }: { links: BankLink[] }) {
  const balanceOf = (link: BankLink) =>
    link.accounts
      .filter(account => account.kind === 'BANK')
      .reduce((total, account) => total + (account.balanceCents ?? 0), 0);
  const total = links.reduce((sum, link) => sum + balanceOf(link), 0);
  return (
    <OverviewCard figure={formatCents(total)} icon={LandmarkIcon} title="Contas bancárias">
      {links.length ? (
        <ul>
          {links.map(link => {
            const count = link.accounts.filter(account => account.kind === 'BANK').length;
            return (
              <li
                className="flex items-center gap-3 border-b px-6 py-3 last:border-b-0"
                key={link.id}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-primary">
                  <LandmarkIcon className="size-4" />
                </span>
                <span className="grid min-w-0 flex-1">
                  <span className="truncate font-medium">{link.institution}</span>
                  <span className="text-xs text-muted-foreground">
                    {count} {count === 1 ? 'conta' : 'contas'}
                  </span>
                </span>
                <span className="font-medium tabular-nums">{formatCents(balanceOf(link))}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <Empty>
          Ligue seu banco pelo Open Finance em{' '}
          <Link className="text-primary hover:underline" to="/integrations#finance">
            Integrações
          </Link>{' '}
          e os saldos aparecem aqui.
        </Empty>
      )}
    </OverviewCard>
  );
}

/** The Fatura to pay next: the first one due from today on, or else the latest. */
function openStatement(card: CreditCard) {
  const today = localToday();
  const byDue = [...card.statements].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return byDue.find(statement => statement.dueDate >= today) ?? byDue.at(-1);
}

/** The Cartões, their open Faturas and how much of the limit they take. */
function Cards({ cards }: { cards: CreditCard[] }) {
  const open = cards.map(card => ({ card, statement: openStatement(card) }));
  const total = open.reduce((sum, { statement }) => sum + (statement?.amountCents ?? 0), 0);
  const limit = cards.reduce((sum, card) => sum + card.limitCents, 0);
  // What the bank says is in use (installments to come included), or else the open Fatura.
  const inUse = open.reduce(
    (sum, { card, statement }) => sum + (card.usedCents ?? statement?.amountCents ?? 0),
    0
  );
  const used = limit ? Math.min(inUse / limit, 1) : 0;
  return (
    <OverviewCard figure={formatCents(total)} icon={CreditCardIcon} title="Cartões de crédito">
      {cards.length ? (
        <>
          {limit > 0 && (
            <div className="border-b px-6 py-4">
              <div className="flex justify-between gap-3 text-sm text-muted-foreground">
                <span>{Math.round(used * 100)}% do limite</span>
                <span className="tabular-nums">Limite: {formatCents(limit)}</span>
              </div>
              <div
                aria-label="Uso do limite"
                aria-valuemax={100}
                aria-valuemin={0}
                aria-valuenow={Math.round(used * 100)}
                className="mt-2 h-2 rounded-full bg-muted"
                role="meter"
              >
                <div
                  className="h-full min-w-1 rounded-full bg-primary"
                  style={{ width: `${used * 100}%` }}
                />
              </div>
            </div>
          )}
          <ul>
            {open.map(({ card, statement }) => (
              <li
                className="flex items-center gap-3 border-b px-6 py-3 last:border-b-0"
                key={card.id}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-primary">
                  <CreditCardIcon className="size-4" />
                </span>
                <span className="grid min-w-0 flex-1">
                  <span className="truncate font-medium">{card.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {statement ? `Fatura de ${longMonth(statement.referenceMonth)}` : 'Sem Fatura'}
                  </span>
                </span>
                <span className="font-medium tabular-nums">
                  {formatCents(statement?.amountCents ?? 0)}
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <Empty>
          Cadastre seus Cartões em{' '}
          <Link className="text-primary hover:underline" to="/caishen/fixed#cards">
            Gastos
          </Link>{' '}
          para acompanhar as Faturas e o limite.
        </Empty>
      )}
    </OverviewCard>
  );
}

const CHART_HEIGHT = 200;
const PAD = { bottom: 28, left: 8, right: 8, top: 12 };

/** The width the element has now, following it as the window or the panels change. */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry!.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}

/**
 * Evolução do saldo: what was left each month, added up over the last twelve, as one line with the
 * area under it. One series, so its title names it and no legend is needed; pointing at a month
 * shows its own result and the running total, and a table says the same to screen readers.
 */
function Evolution({ months }: { months: Holder['months'] }) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  let running = 0;
  const points = months.map(month => {
    running += month.balanceCents;
    return { month: month.month, net: month.balanceCents, total: running };
  });
  const last = points.at(-1);
  const values = [0, ...points.map(point => point.total)];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const innerWidth = Math.max(width - PAD.left - PAD.right, 1);
  const innerHeight = CHART_HEIGHT - PAD.top - PAD.bottom;
  const x = (index: number) =>
    PAD.left + (points.length > 1 ? (index / (points.length - 1)) * innerWidth : innerWidth / 2);
  const y = (value: number) => PAD.top + ((max - value) / span) * innerHeight;
  const line = points.map((point, index) => `${index ? 'L' : 'M'}${x(index)},${y(point.total)}`);
  const area = points.length
    ? `${line.join(' ')} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z`
    : '';
  const shown = active === null ? null : points[active];
  const labels = points.length ? [0, Math.floor((points.length - 1) / 2), points.length - 1] : [];

  return (
    <OverviewCard
      className="md:col-span-2"
      figure={formatCents(last?.total ?? 0)}
      icon={WalletIcon}
      title="Evolução do saldo"
    >
      <p className="px-6 pt-4 text-sm text-muted-foreground">
        O que sobrou somando os meses
        {points[0] ? ` desde ${longMonth(points[0].month)}` : ''}: Receitas menos Compromissos e
        Gastos.
      </p>
      <div className="relative px-6 pt-2 pb-5" ref={ref}>
        {width > 0 && points.length > 0 && (
          <svg
            aria-hidden
            className="block overflow-visible"
            height={CHART_HEIGHT}
            onPointerLeave={() => setActive(null)}
            width={width}
          >
            {/* Zero, so a total below it reads at once. */}
            <line
              className="stroke-border"
              strokeDasharray={min < 0 ? '4 4' : undefined}
              x1={PAD.left}
              x2={PAD.left + innerWidth}
              y1={y(0)}
              y2={y(0)}
            />
            <path className="fill-primary/10" d={area} />
            <path
              className="fill-none stroke-primary"
              d={line.join(' ')}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
            {shown && active !== null && (
              <>
                <line
                  className="stroke-muted-foreground/40"
                  x1={x(active)}
                  x2={x(active)}
                  y1={PAD.top}
                  y2={PAD.top + innerHeight}
                />
                <circle
                  className="fill-primary stroke-card"
                  cx={x(active)}
                  cy={y(shown.total)}
                  r={5}
                  strokeWidth={2}
                />
              </>
            )}
            {labels.map(index => (
              <text
                className="fill-muted-foreground text-[11px]"
                key={index}
                textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'}
                x={x(index)}
                y={CHART_HEIGHT - 6}
              >
                {shortMonth(points[index]!.month)}
              </text>
            ))}
            {/* Hit areas wider than the marks: each month's whole column. */}
            {points.map((point, index) => (
              <rect
                fill="transparent"
                height={CHART_HEIGHT}
                key={point.month}
                onPointerEnter={() => setActive(index)}
                width={innerWidth / Math.max(points.length - 1, 1)}
                x={x(index) - innerWidth / Math.max(points.length - 1, 1) / 2}
                y={0}
              />
            ))}
          </svg>
        )}
        {shown && active !== null && (
          <div
            className="pointer-events-none absolute top-0 z-10 rounded-xl border bg-popover px-3 py-2 text-sm shadow-md"
            // Centered on the month (the chart starts 24px in, past the padding), kept inside.
            style={{
              left: Math.min(Math.max(24 + x(active) - 88, 0), Math.max(width + 48 - 176, 0)),
            }}
          >
            <p className="font-medium capitalize">{longMonth(shown.month)}</p>
            <p className="text-muted-foreground tabular-nums">No mês: {formatCents(shown.net)}</p>
            <p className="tabular-nums">Acumulado: {formatCents(shown.total)}</p>
          </div>
        )}
        <table className="sr-only">
          <caption>Evolução do saldo por mês</caption>
          <thead>
            <tr>
              <th>Mês</th>
              <th>No mês</th>
              <th>Acumulado</th>
            </tr>
          </thead>
          <tbody>
            {points.map(point => (
              <tr key={point.month}>
                <td>{longMonth(point.month)}</td>
                <td>{formatCents(point.net)}</td>
                <td>{formatCents(point.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </OverviewCard>
  );
}

/**
 * Visão geral, after Meu Pluggy's Overview: the bank accounts and the Cartões side by side, then
 * how the money left over grew month by month.
 */
export function Overview({ holder, links }: { holder: Holder; links: BankLink[] }) {
  return (
    <section aria-label="Visão geral" className="grid gap-5 md:grid-cols-2">
      <Accounts links={links} />
      <Cards cards={holder.creditCards} />
      <Evolution months={holder.months} />
    </section>
  );
}
