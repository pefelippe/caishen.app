import { useQuery } from '@apollo/client/react';
import { ConversationsDocument, HomeDocument } from '@zapbots/graphql/client';
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
import {
  addAttachments,
  ATTACHMENT_ACCEPT,
  MAX_ATTACHMENTS,
  pastedFiles,
  type ChatAttachment,
} from '../lib/attachments';
import { formatCents, formatDate } from '../lib/format';
import { useI18n } from '../lib/i18n';

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

/**
 * The Dashboard, like the hPanel's home: the greeting and the line to ask the Caishen on top, then
 * white cards for what falls due and the latest Conversations,
 * each leading to its screen.
 */
export function DashboardPage({ user }: { user: { name: string } }) {
  const { t } = useI18n();
  const { data: home } = useQuery(HomeDocument, {
    fetchPolicy: 'cache-and-network',
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

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          link={{ label: t('home.month.open'), to: '/caishen/entries' }}
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
