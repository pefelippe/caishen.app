import { useQuery } from '@apollo/client/react';
import {
  ConversationDocument,
  type BotFieldsFragment,
  type MessageFieldsFragment,
} from '@zapbots/graphql/client';
import {
  ArrowUpIcon,
  CheckIcon,
  CopyIcon,
  FileTextIcon,
  HardDriveIcon,
  ImageIcon,
  PaperclipIcon,
  PencilIcon,
  PlusIcon,
  RotateCcwIcon,
  SquareIcon,
  XIcon,
  type LucideIcon,
} from 'lucide-react';
import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import { useLocation } from 'react-router-dom';

import { Logo } from '@zapbots/ui/blocks/logo';
import { Button } from '@zapbots/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@zapbots/ui/components/dropdown-menu';
import { Textarea } from '@zapbots/ui/components/textarea';
import { cn } from '@zapbots/ui/lib/utils';

import {
  addAttachments,
  ATTACHMENT_ACCEPT,
  MAX_ATTACHMENTS,
  pastedFiles,
  type ChatAttachment,
} from '../lib/attachments';
import { BotGlyph } from './BotGlyph';
import { useChatReplies, type PendingReply } from './ChatReplies';
import { ChatText } from './ChatText';
import { FormError } from './FormError';
import { ProposalCard } from './ProposalCard';

/** How often a thread looks for a reply being written elsewhere, in milliseconds. */
const POLL_WHILE_REPLYING = 2000;

/** A question offered while the Conversation is empty; the page shows each with its icon. */
export interface Suggestion {
  icon: LucideIcon;
  text: string;
}

interface Props {
  bot: BotFieldsFragment;
  className?: string;
  /** `null` until the first Message; `ensureConversation` then creates it. */
  conversationId: string | null;
  ensureConversation: () => Promise<string>;
  /** Sent as soon as the thread opens, e.g. what the User typed on the Dashboard. */
  firstMessage?: string;
  /** Files sent with `firstMessage`. */
  firstFiles?: ChatAttachment[];
  /** The User's first name, greeted on the page while the Conversation is empty. */
  greeting?: string;
  /** Lines offered while the Conversation is empty. */
  suggestions?: Suggestion[];
  /** Why the Bot cannot answer now; the thread shows but nothing can be sent. */
  unavailable?: string;
  /** `page`: the Agente page, centered, with a large input; `panel` (default): the side panel. */
  variant?: 'page' | 'panel';
}

/** One Conversation with a Bot: the Messages so far, the reply being written, and the input. */
export function ChatThread({
  bot,
  className,
  conversationId,
  ensureConversation,
  firstFiles,
  firstMessage,
  greeting,
  suggestions = [],
  unavailable,
  variant = 'panel',
}: Props) {
  const location = useLocation();
  const replies = useChatReplies();
  const [draft, setDraft] = useState('');
  // The input holds the last Message, to answer it again once edited.
  const [editing, setEditing] = useState(false);
  // The first Message of a new Conversation, shown while the Conversation is being created.
  const [starting, setStarting] = useState<PendingReply | null>(null);
  // The Conversation just created, until `conversationId` catches up with it.
  const [created, setCreated] = useState<string | null>(null);
  const pending = replies.pending(conversationId ?? created) ?? starting;
  const { data, startPolling, stopPolling } = useQuery(ConversationDocument, {
    skip: !conversationId,
    variables: { id: conversationId! },
  });
  // A reply started elsewhere (before a reload, in another tab): the dots show and the thread is
  // read again until it is saved.
  const replyingElsewhere = !pending && Boolean(data?.conversation?.replying);
  const replying = Boolean(pending) || replyingElsewhere;
  useEffect(() => {
    if (!replyingElsewhere) return;
    startPolling(POLL_WHILE_REPLYING);
    return stopPolling;
  }, [replyingElsewhere, startPolling, stopPolling]);
  const [files, setFiles] = useState<ChatAttachment[]>([]);
  const picker = useRef<HTMLInputElement>(null);
  const [localError, setError] = useState<string | null>(null);
  const error = localError ?? replies.error(conversationId);
  const end = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  /** A suggestion goes into the input, to be sent as is or edited first. */
  const fill = (text: string) => {
    setDraft(text);
    requestAnimationFrame(() => {
      const field = input.current;
      if (!field) return;
      field.focus();
      field.setSelectionRange(text.length, text.length);
    });
  };

  const saved = (conversationId && data?.conversation?.messages) || [];
  // While a reply is being written, the saved copy of this exchange stays hidden: the pending
  // bubbles show it, and a refetch in the middle would otherwise show the User's Message twice.
  const messages = pending ? saved.slice(0, pending.before) : saved;
  const lastUserIndex = messages.findLastIndex(message => message.role === 'USER');

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, pending?.text]);

  /** Reads files, picked or pasted, and adds them to the ones waiting, within the limits. */
  const attachFiles = async (picked: File[]) => {
    setError(null);
    const added = await addAttachments(files, picked);
    setFiles(added.files);
    setError(added.error);
    input.current?.focus();
  };

  const attach = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = [...(event.target.files ?? [])];
    event.target.value = '';
    void attachFiles(picked);
  };

  /** A pasted screenshot or file joins the Message; pasted text goes in as usual. */
  const onPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = pastedFiles(event.clipboardData);
    if (!pasted.length) return;
    event.preventDefault();
    void attachFiles(pasted);
  };

  const threadId = conversationId ?? created;
  const queued = replies.queued(threadId);

  // A reply written before a reload has ended: what was written meanwhile goes now.
  useEffect(() => {
    if (threadId && !replying && queued.length) replies.sendQueued(threadId);
  }, [threadId, replying, queued.length, replies]);

  const send = async (content: string, extra?: ChatAttachment[]) => {
    const attachments = extra ?? files;
    if ((!content.trim() && !attachments.length) || unavailable) return;
    // The first Message of a new Conversation is still on its way: wait for it.
    if (replying && !threadId) return;
    if (editing && replying) return;
    setError(null);
    setDraft('');
    setFiles([]);
    setEditing(false);
    let id: string;
    try {
      if (threadId) id = threadId;
      else {
        setStarting({
          attached: attachments.map(({ kind, name }) => ({ kind, name })),
          before: 0,
          sent: content.trim(),
          text: '',
        });
        id = await ensureConversation();
        setCreated(id);
      }
    } catch {
      setStarting(null);
      setError('Não foi possível falar com o Caishen.');
      return;
    }
    // The reply lives above the screens from here, so it goes on when this thread closes. Written
    // while the Bot replies, the Message waits in the queue.
    const sending = replies.send({
      attachments,
      content,
      conversationId: id,
      queue: replyingElsewhere,
      redo: editing ? 'edit' : undefined,
      screen: location.pathname,
    });
    setStarting(null);
    await sending;
  };

  const stop = () => {
    if (threadId) void replies.stop(threadId);
  };

  /** Tentar de novo: the last Message is answered again, in place of its reply. */
  const retry = () => {
    if (!threadId || replying) return;
    setError(null);
    void replies.send({
      attachments: [],
      content: '',
      conversationId: threadId,
      redo: 'retry',
      screen: location.pathname,
    });
  };

  /** Editar: the last Message goes into the input; sending it answers it again as edited. */
  const edit = (message: Pick<MessageFieldsFragment, 'attachments' | 'content'>) => {
    setEditing(true);
    setFiles([]);
    fill(message.content);
    setError(
      message.attachments.length
        ? 'Os anexos dessa mensagem não são enviados de novo. Para o Caishen lê-los, mande-os numa nova mensagem.'
        : null
    );
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraft('');
    setError(null);
  };

  // Once only, even when StrictMode runs the effect twice.
  const firstSent = useRef(false);
  useEffect(() => {
    if ((!firstMessage && !firstFiles?.length) || firstSent.current) return;
    firstSent.current = true;
    void send(firstMessage ?? '', firstFiles);
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- runs on open only
  }, []);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void send(draft);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void send(draft);
    }
  };

  const empty = messages.length === 0 && !replying;
  const page = variant === 'page';
  const canSend = Boolean(draft.trim()) || files.length > 0;
  const remove = (index: number) => setFiles(current => current.filter((_, at) => at !== index));

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pr-1 [scrollbar-width:none]',
          page && 'mx-auto w-full max-w-3xl gap-6 px-1 pt-6 pb-4'
        )}
      >
        {empty && !page && (
          <div className="flex flex-col gap-3 py-2">
            <p className="font-serif text-lg leading-snug text-pretty">{bot.personality}</p>
            {suggestions.map(suggestion => (
              <Button
                className="h-auto justify-start px-0 py-0.5 text-left whitespace-normal text-ink"
                key={suggestion.text}
                onClick={() => fill(suggestion.text)}
                variant="link"
              >
                {suggestion.text}
              </Button>
            ))}
          </div>
        )}
        {empty && page && (
          <div className="flex flex-1 flex-col justify-center gap-8 py-6">
            <div className="flex flex-col items-center gap-2 text-center">
              <span className="mb-3 grid size-14 place-items-center rounded-2xl bg-foreground text-background">
                <Logo size={28} />
              </span>
              <p className="text-3xl font-semibold tracking-tight">
                {greeting ? `Olá, ${greeting}` : 'Olá'}
              </p>
              <p className="text-base text-muted-foreground">
                Pergunte sobre o seu dinheiro, ou anexe um extrato pelo +.
              </p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {suggestions.map(suggestion => (
                <li key={suggestion.text}>
                  <Button
                    className="h-full min-h-20 w-full items-start justify-start gap-3 rounded-2xl bg-card p-4 text-left text-[0.9375rem] font-normal whitespace-normal text-foreground shadow-[0_1px_3px_rgb(15_23_42/0.06)] hover:bg-card hover:shadow-[0_6px_20px_-8px_rgb(37_99_235/0.35)]"
                    onClick={() => fill(suggestion.text)}
                    variant="ghost"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-primary">
                      <suggestion.icon className="size-4" />
                    </span>
                    <span className="pt-1 leading-snug">{suggestion.text}</span>
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {messages.map((message, index) => {
          // Only the last exchange can be answered again; never while the Bot is writing.
          const last = index === messages.length - 1 && !replying;
          const lastUser = !replying && index === lastUserIndex;
          return (
            <Fragment key={message.id}>
              <Bubble
                bot={bot}
                message={message}
                onEdit={lastUser && !editing ? () => edit(message) : undefined}
                onRetry={last && message.role === 'BOT' ? retry : undefined}
                saved
              />
              {message.proposals.map(proposal => (
                <ProposalCard key={proposal.id} proposal={proposal} />
              ))}
              {/* The reply never came (an error): ask for it again. */}
              {last && message.role === 'USER' && (
                <Button
                  className="-mt-2 gap-1.5 self-start text-muted-foreground"
                  onClick={retry}
                  size="sm"
                  variant="ghost"
                >
                  <RotateCcwIcon className="size-3.5" />
                  Tentar de novo
                </Button>
              )}
            </Fragment>
          );
        })}
        {pending && (
          <>
            <Bubble
              bot={bot}
              message={{ attachments: pending.attached, content: pending.sent, role: 'USER' }}
            />
            <Bubble bot={bot} message={{ attachments: [], content: pending.text, role: 'BOT' }} />
          </>
        )}
        {replyingElsewhere && (
          <Bubble bot={bot} message={{ attachments: [], content: '', role: 'BOT' }} />
        )}
        {queued.map((message, index) => (
          <div
            className="flex max-w-[85%] flex-col items-end gap-1 self-end opacity-60"
            key={`${index}-${message.content}`}
          >
            <p className="rounded-2xl rounded-br-md bg-primary px-4 py-2.5 whitespace-pre-wrap text-primary-foreground">
              {message.content || message.attachments.map(file => file.name).join(', ')}
            </p>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              Na fila, vai depois desta resposta
              <Button
                aria-label="Tirar da fila"
                className="size-6 rounded-md"
                onClick={() => threadId && replies.unqueue(threadId, index)}
                size="icon"
                title="Tirar da fila"
                variant="ghost"
              >
                <XIcon className="size-3" />
              </Button>
            </span>
          </div>
        ))}
        <div ref={end} />
      </div>
      {error && (
        <div className={cn(page && 'mx-auto w-full max-w-3xl px-1')}>
          <FormError message={error} />
        </div>
      )}
      {editing && (
        <div
          className={cn(
            'mt-2 flex items-center gap-2 text-xs text-muted-foreground',
            page && 'mx-auto w-full max-w-3xl px-2'
          )}
        >
          <PencilIcon className="size-3.5" />
          <span className="flex-1">Editando sua última mensagem; a resposta será refeita.</span>
          <Button className="h-7 px-2 text-xs" onClick={cancelEdit} size="sm" variant="ghost">
            Cancelar
          </Button>
        </div>
      )}
      <input
        accept={ATTACHMENT_ACCEPT}
        className="hidden"
        multiple
        onChange={attach}
        ref={picker}
        type="file"
      />
      {page ? (
        <div className="mx-auto w-full max-w-3xl shrink-0 px-1 pt-2">
          <form
            className="flex flex-col gap-2 rounded-3xl bg-card p-3 pl-4 shadow-[0_12px_40px_-16px_rgb(37_99_235/0.35)] transition-shadow focus-within:shadow-[0_12px_40px_-12px_rgb(37_99_235/0.5)]"
            onSubmit={onSubmit}
          >
            <Waiting files={files} onRemove={remove} />
            <Textarea
              aria-label={`Mensagem para ${bot.name}`}
              data-chat-input
              className="max-h-48 min-h-12 resize-none border-0 bg-transparent px-1 text-base shadow-none focus-visible:ring-0"
              disabled={Boolean(unavailable)}
              onChange={event => setDraft(event.target.value)}
              onKeyDown={onKeyDown}
              onPaste={onPaste}
              placeholder={`Escreva para ${bot.name}…`}
              ref={input}
              value={draft}
            />
            <div className="flex items-center justify-end gap-3">
              <AttachMenu
                disabled={Boolean(unavailable) || files.length >= MAX_ATTACHMENTS}
                onPick={() => picker.current?.click()}
              />
              <p className="mr-auto text-xs text-muted-foreground">
                {unavailable ?? 'Enter envia · Shift + Enter quebra a linha'}
              </p>
              {replying ? (
                <StopButton className="size-10 rounded-full" onStop={stop} />
              ) : (
                <Button
                  aria-label="Enviar"
                  className="size-10 rounded-full"
                  disabled={Boolean(unavailable) || !canSend}
                  size="icon"
                  type="submit"
                >
                  <ArrowUpIcon />
                </Button>
              )}
            </div>
          </form>
          <p className="py-2 text-center text-xs text-muted-foreground">
            {bot.name} é uma IA e pode errar. Confira as respostas importantes.
          </p>
        </div>
      ) : (
        <>
          <form className="relative mt-3 flex shrink-0 flex-col gap-2" onSubmit={onSubmit}>
            <Waiting files={files} onRemove={remove} />
            <Textarea
              aria-label={`Mensagem para ${bot.name}`}
              data-chat-input
              className="max-h-40 min-h-[5.25rem] resize-none bg-card pr-11 pb-10"
              disabled={Boolean(unavailable)}
              onChange={event => setDraft(event.target.value)}
              onKeyDown={onKeyDown}
              onPaste={onPaste}
              placeholder={`Escreva para ${bot.name}…`}
              ref={input}
              value={draft}
            />
            <div className="absolute bottom-2 left-2">
              <AttachMenu
                disabled={Boolean(unavailable) || files.length >= MAX_ATTACHMENTS}
                onPick={() => picker.current?.click()}
                small
              />
            </div>
            {replying ? (
              <StopButton className="absolute right-2 bottom-2 size-8" onStop={stop} />
            ) : (
              <Button
                aria-label="Enviar"
                className="absolute right-2 bottom-2"
                disabled={!canSend}
                size="icon-sm"
                type="submit"
              >
                <ArrowUpIcon />
              </Button>
            )}
          </form>
          <p className="pt-1.5 text-center text-[11px] text-muted-foreground">
            {bot.name} é uma IA e pode errar.
          </p>
        </>
      )}
    </div>
  );
}

/** Parar, in place of Enviar while the Bot writes: it keeps what was written so far. */
function StopButton({ className, onStop }: { className: string; onStop: () => void }) {
  return (
    <Button
      aria-label="Parar"
      className={className}
      onClick={onStop}
      size="icon"
      title="Parar"
      type="button"
    >
      <SquareIcon className="size-3.5 fill-current" />
    </Button>
  );
}

const KIND_ICON: Record<ChatAttachment['kind'], LucideIcon> = {
  IMAGE: ImageIcon,
  PDF: FileTextIcon,
  TEXT: PaperclipIcon,
};

/** A file by its name, with a mark for its kind; with `onRemove`, it can be taken out. */
export function FileChip({
  file,
  onRemove,
}: {
  file: Pick<ChatAttachment, 'kind' | 'name'>;
  onRemove?: () => void;
}) {
  const Icon = KIND_ICON[file.kind];
  return (
    <span className="inline-flex max-w-56 items-center gap-1.5 rounded-lg bg-muted py-1 pr-1.5 pl-2 text-xs text-foreground">
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate">{file.name}</span>
      {onRemove && (
        <Button
          aria-label={`Tirar ${file.name}`}
          className="size-5 rounded-md"
          onClick={onRemove}
          size="icon"
          type="button"
          variant="ghost"
        >
          <XIcon className="size-3" />
        </Button>
      )}
    </span>
  );
}

/** The files waiting to go with the next Message. */
export function Waiting({
  files,
  onRemove,
}: {
  files: ChatAttachment[];
  onRemove: (index: number) => void;
}) {
  if (!files.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {files.map((file, index) => (
        <FileChip file={file} key={`${file.name}-${index}`} onRemove={() => onRemove(index)} />
      ))}
    </div>
  );
}

/**
 * The + beside the input (as in the hPanel's chat): attach files from the computer; the Google
 * Drive comes later (docs/adr/0017).
 */
export function AttachMenu({
  disabled,
  onPick,
  small,
}: {
  disabled: boolean;
  onPick: () => void;
  small?: boolean;
}) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="Adicionar à conversa"
          className={cn('rounded-full', small ? 'size-7' : 'size-9 bg-muted hover:bg-accent')}
          disabled={disabled}
          size="icon"
          type="button"
          variant="ghost"
        >
          <PlusIcon className={small ? 'size-4' : 'size-5'} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-80 rounded-xl p-2" side="top" sideOffset={8}>
        <DropdownMenuLabel className="px-3 pt-1.5 pb-2 text-xs font-medium text-muted-foreground">
          Adicione a esta conversa
        </DropdownMenuLabel>
        <DropdownMenuItem className="items-start gap-3 rounded-lg px-3 py-2.5" onSelect={onPick}>
          <PaperclipIcon className="mt-0.5 size-5 text-primary" />
          <span className="grid gap-0.5">
            <span className="font-medium">Anexar arquivos</span>
            <span className="text-xs text-muted-foreground">
              Planilhas, textos, imagens ou PDF, até 3 MB.
            </span>
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem className="items-start gap-3 rounded-lg px-3 py-2.5" disabled>
          <HardDriveIcon className="mt-0.5 size-5" />
          <span className="grid gap-0.5">
            <span className="font-medium">Do Google Drive</span>
            <span className="text-xs text-muted-foreground">Em breve.</span>
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface BubbleProps {
  bot: BotFieldsFragment;
  message: Pick<MessageFieldsFragment, 'attachments' | 'content' | 'role'>;
  /** Editar, on the User's last Message. */
  onEdit?: () => void;
  /** Tentar de novo, on the Bot's last reply. */
  onRetry?: () => void;
  /** Saved Messages can be copied; the exchange still being written cannot. */
  saved?: boolean;
}

/** A small action under a Message, shown on hover (always on a touch screen). */
function MessageAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      aria-label={label}
      className="size-7 rounded-md text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
      onClick={onClick}
      size="icon"
      title={label}
      type="button"
      variant="ghost"
    >
      <Icon className="size-3.5" />
    </Button>
  );
}

/** Copies a Message's text (the Bot's as its markdown) and says so for a moment. */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);
  const copy = () => {
    void navigator.clipboard.writeText(text).then(() => setCopied(true));
  };
  return (
    <Button
      aria-label={copied ? 'Copiado' : 'Copiar'}
      className="size-7 rounded-md text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
      onClick={copy}
      size="icon"
      title={copied ? 'Copiado' : 'Copiar'}
      type="button"
      variant="ghost"
    >
      {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
    </Button>
  );
}

/** Three dots rising in turn while the Bot has not written anything yet. */
function Typing() {
  return (
    <span aria-label="Escrevendo" className="flex h-6 items-center gap-1" role="status">
      {[0, 150, 300].map(delay => (
        <span
          className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60 motion-reduce:animate-none"
          key={delay}
          style={{ animationDelay: `${delay}ms` }}
        />
      ))}
    </span>
  );
}

/** The User's Messages sit right in a blue bubble; the Bot's are plain text beside its glyph. */
function Bubble({ bot, message, onEdit, onRetry, saved }: BubbleProps) {
  const copyable = saved && Boolean(message.content);
  if (message.role === 'USER') {
    return (
      <div className="group flex max-w-[85%] flex-col items-end gap-1.5 self-end">
        {message.attachments.length > 0 && (
          <div className="flex flex-wrap justify-end gap-1.5">
            {message.attachments.map((file, index) => (
              <FileChip file={file} key={`${file.name}-${index}`} />
            ))}
          </div>
        )}
        {message.content && (
          <p className="rounded-2xl rounded-br-md bg-primary px-4 py-2.5 whitespace-pre-wrap text-primary-foreground">
            {message.content}
          </p>
        )}
        {(copyable || onEdit) && (
          <div className="flex">
            {onEdit && <MessageAction icon={PencilIcon} label="Editar" onClick={onEdit} />}
            {copyable && <CopyButton text={message.content} />}
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="group flex gap-3">
      <BotGlyph bot={bot.key} className="mt-0.5 shrink-0" size={24} />
      <div className="min-w-0 flex-1">
        {message.content ? <ChatText text={message.content} /> : <Typing />}
        {(copyable || onRetry) && (
          <div className="mt-1 -ml-1.5 flex">
            {copyable && <CopyButton text={message.content} />}
            {onRetry && (
              <MessageAction icon={RotateCcwIcon} label="Tentar de novo" onClick={onRetry} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
