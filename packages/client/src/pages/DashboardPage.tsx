import { useQuery } from '@apollo/client/react';
import {
  BotsDocument,
  HolderDocument,
  UsageDocument,
  ViewerHolderDocument,
} from '@zapbots/graphql/client';
import {
  ArrowRightIcon,
  BellIcon,
  CalendarClockIcon,
  ChartNoAxesColumnIcon,
  GaugeIcon,
  MessageCirclePlusIcon,
  WalletIcon,
  WorkflowIcon,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { AlertList } from '../components/AlertList';
import { useChatPanel } from '../components/ChatPanel';
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

/** Where a new Holder adds their income and debts: the Caishen's Finanças tabs. */
const FINANCE_LINKS = BOT_SECTIONS.FINANCE.find(group => group.label === 'Finanças')!.links;

/** What each of those tabs holds, said in one line. */
const START_NOTES: Record<string, StringKey> = {
  '/caishen/income': 'dashboard.startIncome',
  '/caishen/obligations': 'dashboard.startObligations',
};

/**
 * The Dashboard: the day at a glance. The outstanding balance first, then the other figures,
 * what the team points out and the latest Workflows; with nothing registered yet, where to start.
 */
export function DashboardPage({ user }: { user: { name: string } }) {
  const { t } = useI18n();
  const { startNew } = useChatPanel();
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
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-5xl leading-none font-semibold tracking-[-0.03em]">
            {t('welcome.hello', { name: user.name.split(' ')[0]! })}
          </h1>
          <p className="text-muted-foreground first-letter:uppercase">
            {new Date().toLocaleDateString(t('locale'), {
              day: 'numeric',
              month: 'long',
              weekday: 'long',
            })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <Link to="/workflows">
              <WorkflowIcon />
              {t('welcome.giveJob')}
            </Link>
          </Button>
          <Button onClick={startNew}>
            <MessageCirclePlusIcon />
            {t('welcome.newChat')}
          </Button>
        </div>
      </header>

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
