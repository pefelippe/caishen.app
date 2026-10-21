import { useQuery } from '@apollo/client/react';
import {
  BotsDocument,
  HolderDocument,
  MonthDocument,
  ViewerHolderDocument,
  type AlertKind,
} from '@zapbots/graphql/client';
import {
  ArrowRightIcon,
  ArrowUpIcon,
  CalendarClockIcon,
  CircleAlertIcon,
  CreditCardIcon,
  GaugeIcon,
  HandCoinsIcon,
  TrendingUpIcon,
  WalletIcon,
  type LucideIcon,
} from 'lucide-react';
import { motion, type Variants } from 'motion/react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

import { CHAT_SUGGESTIONS, useChatPanel } from '../components/ChatPanel';
import { Logo } from '../components/Logo';
import { PageSkeleton } from '../components/PageSkeleton';
import { Sheet } from '../components/Sheet';
import { localToday } from '../lib/bots';
import { formatCents, formatDate } from '../lib/format';
import { useI18n, type StringKey } from '../lib/i18n';

const EASE = [0.22, 1, 0.36, 1] as const;

const stagger: Variants = { hidden: {}, shown: { transition: { staggerChildren: 0.07 } } };
const rise: Variants = {
  hidden: { opacity: 0, y: 16 },
  shown: { opacity: 1, transition: { duration: 0.55, ease: EASE }, y: 0 },
};

/** The mark of each kind of Aviso in the notifications. */
const ALERT_ICONS: Record<AlertKind, LucideIcon> = {
  ABOVE_MARKET: TrendingUpIcon,
  DUE_SOON: CalendarClockIcon,
  HIGH_UTILIZATION: CreditCardIcon,
  OVERDUE: CircleAlertIcon,
  ROUTINE_FAILED: CircleAlertIcon,
  STALE_ASSESSMENT: GaugeIcon,
};

/** The greeting, centered, and the line to ask the Caishen AI; sending opens the chat panel. */
function Ask({ name }: { name: string }) {
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
    <motion.section
      className="mx-auto flex w-full max-w-2xl flex-col items-center gap-7 pt-10 text-center md:pt-16"
      variants={stagger}
    >
      <motion.div
        className="grid size-14 place-items-center rounded-2xl bg-foreground text-background"
        variants={{
          hidden: { opacity: 0, rotate: -12, scale: 0.6 },
          shown: {
            opacity: 1,
            rotate: 0,
            scale: 1,
            transition: { damping: 14, stiffness: 200, type: 'spring' },
          },
        }}
      >
        <Logo size={26} />
      </motion.div>
      <motion.h1 className="text-4xl font-semibold tracking-tight md:text-5xl" variants={rise}>
        {t('welcome.hello', { name })}
      </motion.h1>
      <motion.form
        className="flex h-16 w-full items-center gap-2 rounded-full bg-card pr-2 pl-6 shadow-[0_12px_40px_-16px_rgb(13_13_13/0.35)] transition-shadow focus-within:shadow-[0_12px_40px_-12px_rgb(13_13_13/0.45)]"
        onSubmit={onSubmit}
        variants={rise}
      >
        <Input
          aria-label={t('welcome.ask')}
          className="h-full flex-1 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0 md:text-base"
          onChange={event => setDraft(event.target.value)}
          placeholder={t('welcome.askAi')}
          value={draft}
        />
        <Button
          aria-label={t('welcome.send')}
          className="size-12 rounded-full"
          disabled={!draft.trim()}
          size="icon"
          title={t('welcome.send')}
          type="submit"
        >
          <ArrowUpIcon className="size-5" />
        </Button>
      </motion.form>
      <motion.div className="flex flex-wrap justify-center gap-2" variants={rise}>
        {CHAT_SUGGESTIONS.map(suggestion => (
          <Button
            className="h-9 rounded-full bg-card px-4 font-normal"
            key={suggestion.text}
            onClick={() => setDraft(suggestion.text)}
            variant="ghost"
          >
            <suggestion.icon className="size-4" />
            {suggestion.text}
          </Button>
        ))}
      </motion.div>
    </motion.section>
  );
}

/** The month in four figures, each leading to the Mês page. */
function MonthStrip({ holderId }: { holderId: string }) {
  const { t } = useI18n();
  const month = localToday().slice(0, 7);
  const { data } = useQuery(MonthDocument, {
    fetchPolicy: 'cache-and-network',
    variables: { holderId, month },
  });
  const statement = data?.holder?.month;
  const figures: { label: StringKey; value?: number }[] = [
    { label: 'month.incomes', value: statement?.incomeCents },
    { label: 'month.commitments', value: statement?.commitmentsCents },
    { label: 'month.expenses', value: statement?.expensesCents },
    { label: 'month.balance', value: statement?.balanceCents },
  ];
  return (
    <motion.div variants={rise}>
      <Link
        className="group grid gap-px overflow-hidden rounded-2xl bg-border sm:grid-cols-4"
        to="/caishen/entries"
      >
        {figures.map(figure => (
          <span
            className="flex flex-col gap-1 bg-card p-5 transition-colors group-hover:bg-card/80"
            key={figure.label}
          >
            <span className="text-sm text-muted-foreground">{t(figure.label)}</span>
            <strong
              className={cn(
                'text-2xl font-semibold tracking-tight tabular-nums',
                figure.label === 'month.balance' && (figure.value ?? 0) < 0 && 'text-destructive'
              )}
            >
              {formatCents(figure.value)}
            </strong>
          </span>
        ))}
      </Link>
    </motion.div>
  );
}

/**
 * The Dashboard, like a host's home: "Olá" and the Caishen AI in the middle, then the
 * notifications (Avisos and what falls due) and the month at a glance.
 */
export function DashboardPage({ user }: { user: { name: string } }) {
  const { t } = useI18n();
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
  const alerts = bots?.bots.flatMap(bot => bot.alerts) ?? [];
  const dues = [...(holder?.upcomingDues ?? [])]
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5);
  const empty =
    holder &&
    !holder.incomeSources.length &&
    !holder.creditOperations.length &&
    !holder.creditCards.length;

  return (
    <motion.div
      animate="shown"
      className="mx-auto flex w-full max-w-5xl flex-col gap-12"
      initial="hidden"
      variants={stagger}
    >
      <Ask name={user.name.split(' ')[0]!} />

      <motion.div className="flex flex-col gap-4" variants={stagger}>
        {holderId && <MonthStrip holderId={holderId} />}

        <motion.div
          className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
          variants={rise}
        >
          <Sheet
            id="notifications"
            intro={t('dashboard.notificationsIntro')}
            title={t('dashboard.notifications')}
          >
            {empty ? (
              <StartHere />
            ) : alerts.length ? (
              <ul className="flex flex-col gap-2">
                {alerts.map((alert, index) => {
                  const Icon = ALERT_ICONS[alert.kind];
                  const body = (
                    <>
                      <span
                        className={cn(
                          'grid size-9 shrink-0 place-items-center rounded-full',
                          alert.kind === 'OVERDUE'
                            ? 'bg-destructive/10 text-destructive'
                            : 'bg-foreground text-background'
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">{alert.message}</span>
                      {alert.href && (
                        <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1" />
                      )}
                    </>
                  );
                  const row =
                    'group flex items-center gap-3 rounded-xl bg-secondary/60 px-4 py-3 transition-colors hover:bg-secondary';
                  return (
                    <li key={index}>
                      {alert.href ? (
                        <Link className={row} to={alert.href}>
                          {body}
                        </Link>
                      ) : (
                        <div className={row}>{body}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-muted-foreground">{t('dashboard.noAlerts')}</p>
            )}
          </Sheet>

          <Sheet id="upcoming" intro={t('dashboard.upcomingIntro')} title={t('dashboard.upcoming')}>
            {dues.length ? (
              <ul className="flex flex-col gap-2">
                {dues.map(due => (
                  <li
                    className="flex items-center gap-3 rounded-xl bg-secondary/60 px-4 py-3"
                    key={`${due.label}-${due.dueDate}`}
                  >
                    <span className="w-12 shrink-0 text-sm text-muted-foreground tabular-nums">
                      {formatDate(due.dueDate).slice(0, 5)}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{due.label}</span>
                    <span className="font-semibold tabular-nums">
                      {formatCents(due.amountCents)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">{t('dashboard.noDues')}</p>
            )}
          </Sheet>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

/** With nothing registered yet: where to start, in Financeiro. */
function StartHere() {
  const { t } = useI18n();
  const links: { icon: LucideIcon; label: string; note: StringKey; to: string }[] = [
    {
      icon: WalletIcon,
      label: 'Salário',
      note: 'dashboard.startIncome',
      to: '/caishen/entries/fixed#income',
    },
    {
      icon: HandCoinsIcon,
      label: 'Obrigações',
      note: 'dashboard.startObligations',
      to: '/caishen/debts',
    },
  ];
  return (
    <div className="flex flex-col gap-3">
      <p>{t('dashboard.startText')}</p>
      {links.map(link => (
        <Link
          className="group flex items-center gap-4 rounded-xl bg-secondary/60 px-4 py-3.5 transition-colors hover:bg-secondary"
          key={link.to}
          to={link.to}
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-foreground text-background">
            <link.icon className="size-4" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="font-medium">{link.label}</span>
            <span className="text-sm text-muted-foreground">{t(link.note)}</span>
          </span>
          <ArrowRightIcon className="size-4 shrink-0 transition-transform group-hover:translate-x-1" />
        </Link>
      ))}
    </div>
  );
}
