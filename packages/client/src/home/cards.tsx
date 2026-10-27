import { useQuery } from '@apollo/client/react';
import { today } from '@zapbots/finance';
import {
  ConversationsDocument,
  HomeDuesDocument,
  HomeMarketDocument,
  HomeMonthDocument,
  HomeOverviewDocument,
  type HomeCardKey,
  type HomeMarketQuery,
} from '@zapbots/graphql/client';
import { ArrowRightIcon, MessageSquareIcon } from 'lucide-react';
import { motion, type Variants } from 'motion/react';
import type { ComponentType, ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Card } from '@zapbots/ui/components/card';
import { Skeleton } from '@zapbots/ui/components/skeleton';
import { cn } from '@zapbots/ui/lib/utils';

import { MonthSummary } from '../components/MonthSummary';
import { Overview } from '../components/Overview';
import { formatCents, formatDate, formatPercent } from '../lib/format';
import { useI18n, type Language, type StringKey } from '../lib/i18n';
import type { CardSetting } from './layout';
import { Empty, Lines, Panel } from './panel';
import { AgendaCard, GoalsCard, NotesCard, TodayCard } from './personalCards';

const EASE = [0.22, 1, 0.36, 1] as const;

export const stagger: Variants = { hidden: {}, shown: { transition: { staggerChildren: 0.06 } } };
export const rise: Variants = {
  hidden: { opacity: 0, y: 14 },
  shown: { opacity: 1, transition: { duration: 0.5, ease: EASE }, y: 0 },
};

/** Where a card comes from: the menu's groups, so the Personalizar list groups them the same way. */
export type CardArea = 'finance' | 'general' | 'personal';

/** How much of the row a card takes on a wide screen; on a phone each takes the whole row. */
export type CardSize = 'full' | 'third' | 'twoThirds';

export interface HomeCard {
  Component: ComponentType;
  area: CardArea;
  size: CardSize;
  title: StringKey;
}

export const SIZE_CLASS: Record<CardSize, string> = {
  full: 'lg:col-span-3',
  third: 'lg:col-span-1',
  twoThirds: 'lg:col-span-2',
};

type Market = HomeMarketQuery['indicators'];

const brl = new Intl.NumberFormat('pt-BR', {
  currency: 'BRL',
  maximumFractionDigits: 4,
  minimumFractionDigits: 4,
  style: 'currency',
});
const signed = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  signDisplay: 'exceptZero',
  style: 'percent',
});

/** "outubro de 2026". */
const monthName = (month: string, language: Language) =>
  new Date(`${month}-15T12:00:00`).toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', {
    month: 'long',
    year: 'numeric',
  });

/** One market figure: its name, the figure in large digits and where or when it is from. */
function Figure({
  label,
  note,
  noteClassName,
  value,
}: {
  label: string;
  note: ReactNode;
  noteClassName?: string;
  value: string | null;
}) {
  return (
    <motion.div className="min-w-0" variants={rise}>
      <Card className="h-full gap-1.5 p-5">
        <span className="text-sm text-muted-foreground">{label}</span>
        {value === null ? (
          <Skeleton className="h-8 w-28" />
        ) : (
          <strong className="text-2xl font-semibold tracking-tight tabular-nums">{value}</strong>
        )}
        <span className={cn('text-xs text-muted-foreground', noteClassName)}>{note}</span>
      </Card>
    </motion.div>
  );
}

/** The dollar, the Selic, the CDI and the IPCA, from the Banco Central (docs/adr/0025). */
function MarketCard() {
  const { t } = useI18n();
  const { data } = useQuery(HomeMarketDocument, { fetchPolicy: 'cache-and-network' });
  const market: Market | undefined = data?.indicators;
  const unavailable = t('home.market.unavailable');
  const rate = (indicator: Market['selic'] | undefined, note: string) => ({
    note: market ? (indicator ? note : unavailable) : '',
    value: market ? (indicator ? formatPercent(indicator.rate) : '—') : null,
  });
  const dollar = market?.dollar;
  const change = dollar?.change ?? null;
  const figures = [
    {
      label: t('home.market.dollar'),
      note: dollar
        ? change === null
          ? t('home.market.ptax', { date: formatDate(dollar.date) })
          : t('home.market.change', { change: signed.format(change) })
        : market
          ? unavailable
          : '',
      noteClassName: change ? (change > 0 ? 'text-destructive' : 'text-success') : undefined,
      value: market ? (dollar ? brl.format(dollar.rate) : '—') : null,
    },
    { label: t('home.market.selic'), ...rate(market?.selic, t('home.market.selic.note')) },
    { label: t('home.market.cdi'), ...rate(market?.cdi, t('home.market.cdi.note')) },
    {
      label: t('home.market.ipca'),
      ...rate(
        market?.ipca12m,
        market?.ipca12m
          ? t('home.market.ipca.note', { month: formatDate(market.ipca12m.date).slice(3) })
          : ''
      ),
    },
  ];
  return (
    <motion.div
      animate="shown"
      className="grid grid-cols-2 gap-5 lg:grid-cols-4"
      initial="hidden"
      variants={stagger}
    >
      {figures.map(figure => (
        <Figure key={figure.label} {...figure} />
      ))}
    </motion.div>
  );
}

/** The Visão geral: bank balances, Cartões and the Evolução do saldo. */
function OverviewCard() {
  const { data } = useQuery(HomeOverviewDocument, { fetchPolicy: 'cache-and-network' });
  if (!data)
    return (
      <Card className="gap-4">
        <Lines count={4} />
      </Card>
    );
  return <Overview holder={data.viewerHolder} links={data.bankLinks} />;
}

/** The month's cash flow, leading to Lançamentos. */
function MonthCard() {
  const { language, t } = useI18n();
  const month = today().slice(0, 7);
  const { data } = useQuery(HomeMonthDocument, {
    fetchPolicy: 'cache-and-network',
    variables: { month },
  });
  if (!data)
    return (
      <Card className="gap-4">
        <Lines count={3} />
      </Card>
    );
  return (
    <MonthSummary
      figures={data.viewerHolder.month}
      heading={
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">
            {t('home.month', { month: monthName(month, language) })}
          </h2>
          <Link
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            to="/caishen/entries"
          >
            {t('home.month.open')}
            <ArrowRightIcon className="size-3.5" />
          </Link>
        </div>
      }
    />
  );
}

/** What falls due in the next 30 days. */
function DuesCard() {
  const { t } = useI18n();
  const { data } = useQuery(HomeDuesDocument, { fetchPolicy: 'cache-and-network' });
  const dues = data?.viewerHolder.upcomingDues ?? [];
  return (
    <Panel link={{ label: t('home.dues.open'), to: '/caishen/fixed' }} title={t('home.dues')}>
      {!data ? (
        <Lines count={3} />
      ) : dues.length === 0 ? (
        <Empty>{t('home.dues.empty')}</Empty>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {dues.slice(0, 5).map(due => (
            <li className="flex items-center gap-3 text-sm" key={`${due.label}-${due.dueDate}`}>
              <span className="w-11 shrink-0 text-muted-foreground tabular-nums">
                {formatDate(due.dueDate).slice(0, 5)}
              </span>
              <span className="min-w-0 flex-1 truncate">{due.label}</span>
              <span className="font-medium tabular-nums">{formatCents(due.amountCents)}</span>
            </li>
          ))}
          {dues.length > 5 && (
            <li className="text-sm text-muted-foreground">
              {t('home.more', { count: String(dues.length - 5) })}
            </li>
          )}
        </ul>
      )}
    </Panel>
  );
}

/** The latest Conversations, each opening on the Agente page. */
function ChatsCard() {
  const { t } = useI18n();
  const { data } = useQuery(ConversationsDocument, { fetchPolicy: 'cache-and-network' });
  return (
    <Panel link={{ label: t('home.chats.open'), to: '/chat' }} title={t('home.chats')}>
      {!data ? (
        <Lines count={3} />
      ) : data.conversations.length === 0 ? (
        <Empty>{t('home.chats.empty')}</Empty>
      ) : (
        <ul className="flex flex-col gap-3">
          {data.conversations.slice(0, 4).map(conversation => (
            <li key={conversation.id}>
              <Link className="flex gap-3 hover:text-primary" to={`/chat?c=${conversation.id}`}>
                <MessageSquareIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="grid min-w-0 text-sm">
                  <span className="truncate font-medium">{conversation.title}</span>
                  {conversation.lastMessage && (
                    <span className="truncate text-muted-foreground">
                      {conversation.lastMessage.content}
                    </span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

/**
 * Every card the Página inicial can show. A new one goes here, in `HomeCardKey` on the server and
 * in `DEFAULT_LAYOUT`; Users who arranged their page get it in its default place.
 */
export const HOME_CARDS: Record<HomeCardKey, HomeCard> = {
  AGENDA: { Component: AgendaCard, area: 'personal', size: 'third', title: 'home.card.agenda' },
  GOALS: { Component: GoalsCard, area: 'personal', size: 'twoThirds', title: 'nav.goals' },
  NOTES: { Component: NotesCard, area: 'personal', size: 'third', title: 'home.card.notes' },
  TODAY: { Component: TodayCard, area: 'personal', size: 'twoThirds', title: 'home.card.today' },
  CHATS: { Component: ChatsCard, area: 'general', size: 'third', title: 'home.chats' },
  DUES: { Component: DuesCard, area: 'finance', size: 'twoThirds', title: 'home.dues' },
  MARKET: { Component: MarketCard, area: 'finance', size: 'full', title: 'home.card.market' },
  MONTH: { Component: MonthCard, area: 'finance', size: 'full', title: 'home.card.month' },
  OVERVIEW: {
    Component: OverviewCard,
    area: 'finance',
    size: 'full',
    title: 'home.card.overview',
  },
};

/** The Página inicial of a User who never arranged it. */
export const DEFAULT_LAYOUT: CardSetting<HomeCardKey>[] = [
  { hidden: false, key: 'MARKET' },
  { hidden: false, key: 'TODAY' },
  { hidden: false, key: 'AGENDA' },
  { hidden: false, key: 'OVERVIEW' },
  { hidden: false, key: 'MONTH' },
  { hidden: false, key: 'DUES' },
  { hidden: false, key: 'CHATS' },
  { hidden: false, key: 'GOALS' },
  { hidden: false, key: 'NOTES' },
];
