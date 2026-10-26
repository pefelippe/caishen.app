import { useQuery } from '@apollo/client/react';
import { today } from '@zapbots/finance';
import { ConversationsDocument, HomeDocument, type HomeQuery } from '@zapbots/graphql/client';
import { ArrowRightIcon, ArrowUpIcon, MessageSquareIcon } from 'lucide-react';
import { motion, type Variants } from 'motion/react';
import { useRef, useState, type ClipboardEvent, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Logo } from '@zapbots/ui/blocks/logo';
import { Button } from '@zapbots/ui/components/button';
import { Card } from '@zapbots/ui/components/card';
import { Input } from '@zapbots/ui/components/input';
import { Skeleton } from '@zapbots/ui/components/skeleton';
import { cn } from '@zapbots/ui/lib/utils';

import { CHAT_SUGGESTIONS, useChatPanel } from '../components/ChatPanel';
import { AttachMenu, Waiting } from '../components/ChatThread';
import { MonthSummary } from '../components/MonthSummary';
import { Overview } from '../components/Overview';
import {
  addAttachments,
  ATTACHMENT_ACCEPT,
  MAX_ATTACHMENTS,
  pastedFiles,
  type ChatAttachment,
} from '../lib/attachments';
import { formatCents, formatDate, formatPercent } from '../lib/format';
import { useI18n, type Language } from '../lib/i18n';

const EASE = [0.22, 1, 0.36, 1] as const;

const stagger: Variants = { hidden: {}, shown: { transition: { staggerChildren: 0.06 } } };
const rise: Variants = {
  hidden: { opacity: 0, y: 14 },
  shown: { opacity: 1, transition: { duration: 0.5, ease: EASE }, y: 0 },
};

/**
 * The greeting and the line to ask the Caishen, centered on a light blue panel, as the Dashboard
 * opened before; sending, or a suggestion, opens the chat panel with it.
 */
function Ask({ name }: { name: string }) {
  const { t } = useI18n();
  const { startNew } = useChatPanel();
  const [draft, setDraft] = useState('');
  const [files, setFiles] = useState<ChatAttachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const input = useRef<HTMLInputElement>(null);

  /** Files from the + or pasted wait under the line and go with the question. */
  const attach = async (picked: File[]) => {
    setError(null);
    const added = await addAttachments(files, picked);
    setFiles(added.files);
    setError(added.error);
    input.current?.focus();
  };

  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = pastedFiles(event.clipboardData);
    if (!pasted.length) return;
    event.preventDefault();
    void attach(pasted);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.trim() && !files.length) return;
    startNew(draft.trim(), files.length ? files : undefined);
    setDraft('');
    setFiles([]);
    setError(null);
  };

  return (
    <motion.section
      className="flex flex-col items-center gap-6 rounded-3xl bg-accent px-5 py-12 text-center md:py-14"
      variants={rise}
    >
      <span className="grid size-12 place-items-center rounded-2xl bg-foreground text-background">
        <Logo size={24} />
      </span>
      <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
        {t('welcome.hello', { name })}
      </h1>
      <form
        className="flex h-16 w-full max-w-2xl items-center gap-2 rounded-full bg-card pr-2 pl-3 shadow-[0_12px_40px_-16px_rgb(37_99_235/0.35)] transition-shadow focus-within:shadow-[0_12px_40px_-12px_rgb(37_99_235/0.5)]"
        onSubmit={onSubmit}
      >
        <AttachMenu
          disabled={files.length >= MAX_ATTACHMENTS}
          onPick={() => picker.current?.click()}
        />
        <Input
          aria-label={t('welcome.ask')}
          className="h-full flex-1 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0 md:text-base"
          onChange={event => setDraft(event.target.value)}
          onPaste={onPaste}
          placeholder={t('welcome.askAi')}
          ref={input}
          value={draft}
        />
        <Button
          aria-label={t('welcome.send')}
          className="size-12 rounded-full"
          disabled={!draft.trim() && !files.length}
          size="icon"
          type="submit"
        >
          <ArrowUpIcon className="size-5" />
        </Button>
      </form>
      <input
        accept={ATTACHMENT_ACCEPT}
        className="hidden"
        multiple
        onChange={event => {
          const picked = [...(event.target.files ?? [])];
          event.target.value = '';
          void attach(picked);
        }}
        ref={picker}
        type="file"
      />
      {(files.length > 0 || error) && (
        <div className="-mt-2 flex w-full max-w-2xl flex-col items-center gap-2">
          <Waiting
            files={files}
            onRemove={index => setFiles(current => current.filter((_, at) => at !== index))}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      )}
      <div className="flex flex-wrap justify-center gap-2">
        {CHAT_SUGGESTIONS.map(suggestion => (
          <Button
            className="h-9 rounded-full bg-card px-4 font-normal hover:bg-card/70"
            key={suggestion.text}
            onClick={() => startNew(suggestion.text)}
            variant="ghost"
          >
            <suggestion.icon className="size-4" />
            {suggestion.text}
          </Button>
        ))}
      </div>
    </motion.section>
  );
}

/** One card of the Dashboard: a title, a link to its screen, and what it shows. */
function Panel({
  children,
  className,
  link,
  title,
}: {
  children: ReactNode;
  className?: string;
  link?: { label: string; to: string };
  title: string;
}) {
  return (
    <motion.div className={cn('min-w-0', className)} variants={rise}>
      <Card className="h-full gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">{title}</h2>
          {link && (
            <Link
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              to={link.to}
            >
              {link.label}
              <ArrowRightIcon className="size-3.5" />
            </Link>
          )}
        </div>
        {children}
      </Card>
    </motion.div>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

function Lines({ count }: { count: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton className="h-5" key={index} />
      ))}
    </div>
  );
}

type Market = HomeQuery['indicators'];

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
function MarketFigures({ market }: { market: Market | undefined }) {
  const { t } = useI18n();
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
    <div className="grid grid-cols-2 gap-5 lg:grid-cols-4">
      {figures.map(figure => (
        <Figure key={figure.label} {...figure} />
      ))}
    </div>
  );
}

/**
 * The Dashboard, like the hPanel's home: the greeting and the line to ask the Caishen on top, then
 * the market's figures, the month's cash flow, and white cards for what falls due and the latest
 * Conversations, each leading to its screen.
 */
export function DashboardPage({ user }: { user: { name: string } }) {
  const { language, t } = useI18n();
  const month = today().slice(0, 7);
  const { data: home } = useQuery(HomeDocument, {
    fetchPolicy: 'cache-and-network',
    variables: { month },
  });
  const { data: chats } = useQuery(ConversationsDocument, { fetchPolicy: 'cache-and-network' });

  const holder = home?.viewerHolder;
  const dues = holder?.upcomingDues ?? [];

  return (
    <motion.div
      animate="shown"
      className="mx-auto flex w-full max-w-6xl flex-col gap-5"
      initial="hidden"
      variants={stagger}
    >
      <Ask name={user.name.split(' ')[0]!} />

      <MarketFigures market={home?.indicators} />

      {holder && home && (
        <motion.div variants={rise}>
          <Overview holder={holder} links={home.bankLinks} />
        </motion.div>
      )}

      <motion.div variants={rise}>
        {holder ? (
          <MonthSummary
            figures={holder.month}
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
        ) : (
          <Card className="gap-4">
            <Lines count={3} />
          </Card>
        )}
      </motion.div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          link={{ label: t('home.dues.open'), to: '/caishen/fixed' }}
          title={t('home.dues')}
        >
          {!holder ? (
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

        <Panel link={{ label: t('home.chats.open'), to: '/chat' }} title={t('home.chats')}>
          {!chats ? (
            <Lines count={3} />
          ) : chats.conversations.length === 0 ? (
            <Empty>{t('home.chats.empty')}</Empty>
          ) : (
            <ul className="flex flex-col gap-3">
              {chats.conversations.slice(0, 4).map(conversation => (
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
      </div>
    </motion.div>
  );
}
