import { useQuery } from '@apollo/client/react';
import { BotsDocument, HolderDocument, ViewerHolderDocument } from '@zapbots/graphql/client';
import {
  ArrowRightIcon,
  ArrowUpIcon,
  BellIcon,
  CalendarClockIcon,
  ChartNoAxesColumnIcon,
  GaugeIcon,
  WalletIcon,
  type LucideIcon,
} from 'lucide-react';
import { motion, type Variants } from 'motion/react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

import { AlertList } from '../components/AlertList';
import { useChatPanel } from '../components/ChatPanel';
import { Logo } from '../components/Logo';
import { PageSkeleton } from '../components/PageSkeleton';
import { ScoreBadge } from '../components/ScoreBadge';
import { BOT_SECTIONS } from '../lib/bots';
import { formatCents, formatDate, formatPercent } from '../lib/format';
import { useI18n, type StringKey } from '../lib/i18n';

const EASE = [0.22, 1, 0.36, 1] as const;

/** The page's blocks rise one after another. */
const stagger: Variants = { hidden: {}, shown: { transition: { staggerChildren: 0.06 } } };
const rise: Variants = {
  hidden: { opacity: 0, y: 14 },
  shown: { opacity: 1, transition: { duration: 0.5, ease: EASE }, y: 0 },
};

/** A white card on the gray screen: the Dashboard's one surface. */
function Tile({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.section
      className={cn('flex min-w-0 flex-col rounded-xl border border-border bg-card p-6', className)}
      variants={rise}
    >
      {children}
    </motion.section>
  );
}

function TileTitle({
  action,
  icon: Icon,
  title,
}: {
  action?: ReactNode;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <header className="flex min-h-8 items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Icon className="size-4" />
        {title}
      </span>
      {action}
    </header>
  );
}

function MoreLink({ children, to }: { children: ReactNode; to: string }) {
  return (
    <Button asChild className="-mr-2 h-8 px-2 text-muted-foreground" size="sm" variant="ghost">
      <Link to={to}>
        {children}
        <ArrowRightIcon />
      </Link>
    </Button>
  );
}

/** A line to ask the Caishen; sending opens the chat panel on it. */
function AskCaishen() {
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
    <form
      className="flex h-12 w-full items-center gap-2 rounded-full border border-border bg-card pr-1.5 pl-4 transition-shadow focus-within:shadow-[0_0_0_4px_rgb(30_26_23/0.06)] md:max-w-md"
      onSubmit={onSubmit}
    >
      <Logo className="text-header" size={18} />
      <Input
        aria-label={t('welcome.ask')}
        className="h-full flex-1 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
        onChange={event => setDraft(event.target.value)}
        placeholder={t('welcome.ask')}
        value={draft}
      />
      <Button
        aria-label={t('welcome.send')}
        className="size-9 rounded-full"
        disabled={!draft.trim()}
        size="icon"
        title={t('welcome.send')}
        type="submit"
      >
        <ArrowUpIcon />
      </Button>
    </form>
  );
}

/** Where a new Holder adds their income and debts: the Caishen's Finanças tabs. */
const FINANCE_LINKS = BOT_SECTIONS.FINANCE.find(group => group.label === 'Finanças')!.links;

/** What each of those tabs holds, said in one line. */
const START_NOTES: Record<string, StringKey> = {
  '/caishen/income': 'dashboard.startIncome',
  '/caishen/obligations': 'dashboard.startObligations',
};

/**
 * The Dashboard: the money at a glance. How much of the month's income the Installments take, the
 * outstanding balance, the Score and what falls due next, then the Alerts and the next 30 days;
 * with nothing registered yet, where to start.
 */
export function DashboardPage({ user }: { user: { name: string } }) {
  const { language, t } = useI18n();
  const { data: bots, loading } = useQuery(BotsDocument, { fetchPolicy: 'cache-and-network' });
  const { data: viewer } = useQuery(ViewerHolderDocument);
  const holderId = viewer?.viewerHolder.id;
  const { data: finance } = useQuery(HolderDocument, {
    fetchPolicy: 'cache-and-network',
    skip: !holderId,
    variables: { id: holderId! },
  });

  if (loading && !bots) return <PageSkeleton />;
  const holder = finance?.holder;
  const latest = holder?.assessments[0];
  const operations = holder?.creditOperations ?? [];
  // Whole cents add up exactly; no rate math happens here (docs/adr/0004).
  const outstanding = operations.reduce((total, item) => total + item.outstandingBalanceCents, 0);
  const installments = operations
    .filter(item => item.paidInstallments < item.termMonths)
    .reduce((total, item) => total + item.installmentCents, 0);
  const income = holder?.monthlyIncomeCents ?? 0;
  const dues = [...(holder?.upcomingDues ?? [])].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const duesTotal = dues.reduce((total, due) => total + due.amountCents, 0);
  const empty =
    holder &&
    !holder.incomeSources.length &&
    !holder.creditOperations.length &&
    !holder.creditCards.length;
  const alerts = bots?.bots.flatMap(bot => bot.alerts) ?? [];
  const today = new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'pt-BR', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  }).format(new Date());

  return (
    <motion.div animate="shown" className="flex flex-col gap-6" initial="hidden" variants={stagger}>
      <motion.header
        className="flex flex-col gap-5 pb-2 md:flex-row md:items-end md:justify-between"
        variants={rise}
      >
        <div className="flex flex-col gap-1">
          <p className="text-sm tracking-wide text-muted-foreground uppercase">{today}</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            {t('welcome.hello', { name: user.name.split(' ')[0]! })}
          </h1>
        </div>
        <AskCaishen />
      </motion.header>

      {empty ? (
        <motion.section
          className="grid gap-8 rounded-xl border border-border bg-card p-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center"
          variants={rise}
        >
          <div className="flex flex-col gap-3">
            <h2 className="text-2xl font-semibold tracking-tight">{t('dashboard.startTitle')}</h2>
            <p className="max-w-prose text-lg leading-relaxed text-muted-foreground">
              {t('dashboard.startText')}
            </p>
          </div>
          <nav className="flex flex-col gap-3">
            {FINANCE_LINKS.map(link => (
              <Link
                className="group flex items-center gap-5 rounded-lg border border-border p-5 transition-colors hover:bg-secondary"
                key={link.to}
                to={link.to}
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
                  <link.icon className="size-5" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-lg font-semibold">{link.label}</span>
                  {START_NOTES[link.to] && (
                    <span className="text-muted-foreground">{t(START_NOTES[link.to]!)}</span>
                  )}
                </span>
                <ArrowRightIcon className="size-5 shrink-0 transition-transform group-hover:translate-x-1" />
              </Link>
            ))}
          </nav>
        </motion.section>
      ) : (
        <Month income={income} installments={installments} />
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Tile>
          <TileTitle icon={ChartNoAxesColumnIcon} title={t('dashboard.outstanding')} />
          <strong className="mt-4 text-3xl font-semibold tracking-tight tabular-nums">
            {formatCents(outstanding)}
          </strong>
          <span className="mt-1 text-sm text-muted-foreground">
            {t('dashboard.operations', { count: operations.length })}
          </span>
        </Tile>
        <Tile>
          <TileTitle icon={GaugeIcon} title={t('dashboard.score')} />
          <div className="mt-4 flex h-9 items-center">
            {latest ? (
              <ScoreBadge band={latest.band} score={latest.score} />
            ) : (
              <strong className="text-3xl font-semibold">—</strong>
            )}
          </div>
          <span className="mt-1 text-sm text-muted-foreground">
            {latest ? formatDate(latest.createdAt) : t('dashboard.noAssessment')}
          </span>
        </Tile>
        <Tile>
          <TileTitle icon={CalendarClockIcon} title={t('dashboard.nextDue')} />
          {dues[0] ? (
            <>
              <strong className="mt-4 text-3xl font-semibold tracking-tight tabular-nums">
                {formatCents(dues[0].amountCents)}
              </strong>
              <span className="mt-1 truncate text-sm text-muted-foreground">
                {formatDate(dues[0].dueDate)} · {dues[0].label}
              </span>
            </>
          ) : (
            <p className="mt-4 text-muted-foreground">{t('dashboard.noDues')}</p>
          )}
        </Tile>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Tile>
          <TileTitle
            action={<MoreLink to="/caishen/overview">{t('welcome.seeFinance')}</MoreLink>}
            icon={BellIcon}
            title={t('dashboard.alerts')}
          />
          <div className="mt-4" data-bot="FINANCE">
            {alerts.length ? (
              <AlertList alerts={alerts} />
            ) : (
              <p className="text-muted-foreground">{t('dashboard.noAlerts')}</p>
            )}
          </div>
        </Tile>
        <Tile>
          <TileTitle
            action={
              dues.length ? (
                <span className="text-sm text-muted-foreground tabular-nums">
                  {t('dashboard.upcomingTotal', { amount: formatCents(duesTotal) })}
                </span>
              ) : undefined
            }
            icon={CalendarClockIcon}
            title={t('dashboard.upcoming')}
          />
          {dues.length ? (
            <ul className="mt-2 flex flex-col">
              {dues.slice(0, 6).map(due => (
                <li
                  className="flex items-center gap-4 border-b py-3 last:border-b-0"
                  key={`${due.label}-${due.dueDate}`}
                >
                  <span className="w-20 shrink-0 text-sm text-muted-foreground tabular-nums">
                    {formatDate(due.dueDate)}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{due.label}</span>
                  <span className="font-medium tabular-nums">{formatCents(due.amountCents)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-muted-foreground">{t('dashboard.noDues')}</p>
          )}
        </Tile>
      </div>
    </motion.div>
  );
}

/** The month in one bar: income, what the Installments take and what is left. */
function Month({ income, installments }: { income: number; installments: number }) {
  const { t } = useI18n();
  const left = income - installments;
  // A ratio for the bar only; the money itself stays in whole cents.
  const committed = income > 0 ? installments / income : 0;
  const tone =
    committed > 0.5 ? 'bg-destructive' : committed > 0.3 ? 'bg-amber-500' : 'bg-emerald-600';

  return (
    <Tile className="gap-6 p-7">
      <TileTitle icon={WalletIcon} title={t('dashboard.thisMonth')} />
      {income > 0 ? (
        <>
          <dl className="grid grid-cols-3 gap-4">
            {(
              [
                ['dashboard.income', income],
                ['dashboard.installments', installments],
                ['dashboard.leftOver', left],
              ] as const
            ).map(([label, cents]) => (
              <div className="flex min-w-0 flex-col gap-1" key={label}>
                <dt className="text-sm text-muted-foreground">{t(label)}</dt>
                <dd
                  className={cn(
                    'truncate text-2xl font-semibold tracking-tight tabular-nums md:text-3xl',
                    label === 'dashboard.leftOver' && cents < 0 && 'text-destructive'
                  )}
                >
                  {formatCents(cents)}
                </dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-col gap-2">
            <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
              <motion.div
                animate={{ width: `${Math.min(committed, 1) * 100}%` }}
                className={cn('h-full rounded-full', tone)}
                initial={{ width: 0 }}
                transition={{ delay: 0.3, duration: 0.9, ease: EASE }}
              />
            </div>
            <span className="text-sm text-muted-foreground">
              {t('dashboard.committed', { percent: formatPercent(committed) })}
            </span>
          </div>
        </>
      ) : (
        <p className="text-muted-foreground">
          {t('dashboard.noIncome')}{' '}
          <Link className="text-foreground underline underline-offset-4" to="/caishen/income">
            {t('dashboard.income')}
          </Link>
        </p>
      )}
    </Tile>
  );
}
