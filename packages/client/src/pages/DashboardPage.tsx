import { useQuery } from '@apollo/client/react';
import {
  BotsDocument,
  HolderDocument,
  UsageDocument,
  ViewerHolderDocument,
} from '@zapbots/graphql/client';
import {
  ArrowRightIcon,
  ArrowUpIcon,
  BellIcon,
  CalendarClockIcon,
  ChartNoAxesColumnIcon,
  GaugeIcon,
  PlusIcon,
  WalletIcon,
  WorkflowIcon,
  type LucideIcon,
} from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

import { AlertList } from '../components/AlertList';
import { useChatPanel } from '../components/ChatPanel';
import { Logo } from '../components/Logo';
import { PageSkeleton } from '../components/PageSkeleton';
import { ScoreBadge } from '../components/ScoreBadge';
import { BOT_SECTIONS } from '../lib/bots';
import { formatCents, formatDate } from '../lib/format';
import { useI18n, type StringKey } from '../lib/i18n';
import { JOB_STATUS } from '../lib/jobs';

/** An icon on a square of paper: the dashboard's one recurring mark. */
function IconTile({ className, icon: Icon }: { className?: string; icon: LucideIcon }) {
  return (
    <span
      className={cn(
        'grid size-10 shrink-0 place-items-center rounded-md bg-background text-foreground',
        className
      )}
    >
      <Icon className="size-5" />
    </span>
  );
}

/** One of the four smaller figures beside the outstanding balance. */
function Figure({
  icon,
  label,
  note,
  value,
}: {
  icon: LucideIcon;
  label: string;
  note?: ReactNode;
  value: ReactNode;
}) {
  return (
    <div className="flex min-w-0 gap-4 rounded-md bg-secondary p-5">
      <IconTile icon={icon} />
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-sm text-muted-foreground">{label}</span>
        <strong className="text-2xl font-semibold tracking-tight tabular-nums">{value}</strong>
        {note && <span className="text-sm text-muted-foreground">{note}</span>}
      </div>
    </div>
  );
}

function Panel({
  action,
  children,
  icon,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-5">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <IconTile className="bg-secondary" icon={icon} />
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

/** What a Panel says when it has nothing yet: one line, not a blank. */
function Quiet({ children }: { children: ReactNode }) {
  return <p className="rounded-md bg-secondary px-5 py-6 text-muted-foreground">{children}</p>;
}

function MoreLink({ children, to }: { children: ReactNode; to: string }) {
  return (
    <Button asChild className="h-8 px-2 text-muted-foreground" size="sm" variant="ghost">
      <Link to={to}>
        {children}
        <ArrowRightIcon />
      </Link>
    </Button>
  );
}

/** The greeting and one line to ask the Caishen; sending opens the chat panel on it. */
function AskCaishen({ name }: { name: string }) {
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
    <section className="flex flex-col items-center gap-8 pt-6">
      <h1 className="text-center text-3xl font-normal tracking-tight md:text-4xl">
        {t('welcome.askHelp', { name })}
      </h1>
      <form
        className="flex h-14 w-full max-w-3xl items-center gap-2 rounded-full bg-card pr-2 pl-5 shadow-[0_1px_4px_rgb(0_0_0/0.08)]"
        onSubmit={onSubmit}
      >
        <Logo className="text-header" size={22} />
        <Input
          aria-label={t('welcome.ask')}
          className="h-full flex-1 border-0 bg-transparent text-base shadow-none focus-visible:ring-0"
          onChange={event => setDraft(event.target.value)}
          placeholder={t('welcome.ask')}
          value={draft}
        />
        <Button
          aria-label={t('welcome.newChat')}
          className="rounded-full"
          onClick={() => startNew()}
          size="icon"
          title={t('welcome.newChat')}
          type="button"
          variant="ghost"
        >
          <PlusIcon />
        </Button>
        <Button
          aria-label={t('welcome.send')}
          className="size-10 rounded-full bg-(image:--header-gradient) text-white"
          disabled={!draft.trim()}
          size="icon"
          title={t('welcome.send')}
          type="submit"
        >
          <ArrowUpIcon />
        </Button>
      </form>
    </section>
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
 * The Dashboard: the day at a glance. A line to ask the Caishen first, then the outstanding balance
 * and the other figures,
 * what the team points out and the latest Workflows; with nothing registered yet, where to start.
 */
export function DashboardPage({ user }: { user: { name: string } }) {
  const { t } = useI18n();
  const { data: bots, loading } = useQuery(BotsDocument, { fetchPolicy: 'cache-and-network' });
  const { data: usage } = useQuery(UsageDocument, { fetchPolicy: 'cache-and-network' });
  const { data: viewer } = useQuery(ViewerHolderDocument);
  const holderId = viewer?.viewerHolder.id;
  const { data: finance } = useQuery(HolderDocument, {
    skip: !holderId,
    variables: { id: holderId! },
  });

  if (loading && !bots) return <PageSkeleton />;
  const holder = finance?.holder;
  const latest = holder?.assessments[0];
  // Whole cents add up exactly; no rate math happens here (docs/adr/0004).
  const outstanding = holder?.creditOperations.reduce(
    (total, operation) => total + operation.outstandingBalanceCents,
    0
  );
  const empty =
    holder &&
    !holder.incomeSources.length &&
    !holder.creditOperations.length &&
    !holder.creditCards.length;
  const alerts = bots?.bots.flatMap(bot => bot.alerts.map(alert => ({ alert, bot }))) ?? [];
  const jobs = (bots?.bots ?? [])
    .flatMap(bot => bot.recentJobs.map(job => ({ bot, job })))
    .sort((a, b) => b.job.createdAt.localeCompare(a.job.createdAt))
    .slice(0, 6);

  return (
    <div className="flex flex-col gap-16">
      <AskCaishen name={user.name.split(' ')[0]!} />

      <div className="grid gap-3 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="flex flex-col justify-between gap-10 rounded-md bg-primary p-7 text-primary-foreground">
          <div className="flex items-center gap-3">
            <IconTile
              className="bg-white/10 text-primary-foreground"
              icon={ChartNoAxesColumnIcon}
            />
            <span className="text-primary-foreground/70">{t('dashboard.outstanding')}</span>
          </div>
          <div className="flex flex-col gap-2">
            <strong className="text-6xl leading-none font-semibold tracking-[-0.04em] tabular-nums">
              {formatCents(outstanding)}
            </strong>
            <span className="text-primary-foreground/70">
              {t('dashboard.operations', { count: holder?.creditOperations.length ?? 0 })}
            </span>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Figure
            icon={GaugeIcon}
            label={t('dashboard.score')}
            note={latest ? formatDate(latest.createdAt) : t('dashboard.noAssessment')}
            value={latest ? <ScoreBadge band={latest.band} score={latest.score} /> : '—'}
          />
          <Figure
            icon={CalendarClockIcon}
            label={t('dashboard.dueNext30')}
            value={formatCents(latest?.indicators.dueNext30DaysCents)}
          />
          <Figure
            icon={WalletIcon}
            label={t('dashboard.income')}
            value={formatCents(holder?.monthlyIncomeCents)}
          />
          <Figure
            icon={WorkflowIcon}
            label={t('dashboard.jobsThisMonth')}
            note={t('usage.routineJobs', { count: usage?.usage.routineJobs ?? 0 })}
            value={usage?.usage.jobs ?? '—'}
          />
        </div>
      </div>

      {empty && (
        <section className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center">
          <div className="flex flex-col gap-3">
            <h2 className="text-2xl font-semibold tracking-tight">{t('dashboard.startTitle')}</h2>
            <p className="max-w-prose text-lg leading-relaxed">{t('dashboard.startText')}</p>
          </div>
          <nav className="flex flex-col gap-3">
            {FINANCE_LINKS.map(link => (
              <Link
                className="group flex items-center gap-5 rounded-md bg-secondary p-5 transition-colors hover:bg-accent"
                key={link.to}
                to={link.to}
              >
                <IconTile className="size-12 bg-primary text-primary-foreground" icon={link.icon} />
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
        </section>
      )}

      <div className="grid gap-x-12 gap-y-16 lg:grid-cols-2">
        <Panel
          action={<MoreLink to="/caishen/overview">{t('welcome.seeFinance')}</MoreLink>}
          icon={BellIcon}
          title={t('dashboard.alerts')}
        >
          {alerts.length ? (
            <div data-bot="FINANCE">
              <AlertList alerts={alerts.map(item => item.alert)} />
            </div>
          ) : (
            <Quiet>{t('dashboard.noAlerts')}</Quiet>
          )}
        </Panel>

        <Panel
          action={<MoreLink to="/documents">{t('rail.documents')}</MoreLink>}
          icon={WorkflowIcon}
          title={t('welcome.recentJobs')}
        >
          {jobs.length ? (
            <ul className="flex flex-col gap-1">
              {jobs.map(({ job }) => (
                <li key={job.id}>
                  <Link
                    className="flex items-center gap-3 rounded-md px-3 py-3 transition-colors hover:bg-secondary"
                    to={`/workflows/${job.id}`}
                  >
                    <span className="min-w-0 flex-1 truncate">{job.instructions}</span>
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {formatDate(job.createdAt)}
                    </span>
                    <Badge variant={JOB_STATUS[job.status].variant}>
                      {JOB_STATUS[job.status].label}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Quiet>{t('dashboard.noJobs')}</Quiet>
          )}
        </Panel>
      </div>

      <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
        {t('dashboard.usageLine', {
          conversations: usage?.usage.conversations ?? 0,
          messages: usage?.usage.messages ?? 0,
        })}
        <Link className="text-foreground underline underline-offset-4" to="/plan">
          {t('menu.usage')}
        </Link>
      </p>
    </div>
  );
}
