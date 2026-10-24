import { useApolloClient, useQuery } from '@apollo/client/react';
import {
  ConversationDocument,
  ConversationsDocument,
  type BotFieldsFragment,
  type MessageFieldsFragment,
} from '@zapbots/graphql/client';
import {
  ArrowUpIcon,
  FileTextIcon,
  HardDriveIcon,
  ImageIcon,
  PaperclipIcon,
  PlusIcon,
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
import { streamChat } from '../lib/chat';
import { BotGlyph } from './BotGlyph';
import { ChatText } from './ChatText';
import { FormError } from './FormError';
import { ProposalCard } from './ProposalCard';

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
  const apollo = useApolloClient();
  const location = useLocation();
  const { data } = useQuery(ConversationDocument, {
    skip: !conversationId,
    variables: { id: conversationId! },
  });
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState<{
    /** Files sent with it, by name. */
    attached: Pick<ChatAttachment, 'kind' | 'name'>[];
    /** Messages on screen when this one was sent; later ones are the exchange in flight. */
    before: number;
    sent: string;
    text: string;
  } | null>(null);
  const [files, setFiles] = useState<ChatAttachment[]>([]);
  const picker = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
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

  const send = async (content: string, extra?: ChatAttachment[]) => {
    const attachments = extra ?? files;
    if ((!content.trim() && !attachments.length) || pending || unavailable) return;
    setError(null);
    setDraft('');
    setFiles([]);
    setPending({
      attached: attachments.map(({ kind, name }) => ({ kind, name })),
      before: saved.length,
      sent: content.trim(),
      text: '',
    });
    try {
      const id = await ensureConversation();
      await streamChat({
        attachments,
        content,
        conversationId: id,
        onEvent: event => {
          if (event.type === 'delta') {
            setPending(current => current && { ...current, text: current.text + event.text });
          } else if (event.type === 'error') setError(event.message);
        },
        screen: location.pathname,
      });
      // Load the saved exchange before dropping the pending bubbles.
      await apollo.query({
        fetchPolicy: 'network-only',
        query: ConversationDocument,
        variables: { id },
      });
      // The list of Conversations shows the latest Message; bring it up to date.
      await apollo.refetchQueries({ include: [ConversationsDocument] });
    } catch {
      setError('Não foi possível falar com o Caishen.');
    }
    setPending(null);
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

  const empty = messages.length === 0 && !pending;
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
        {messages.map(message => (
          <Fragment key={message.id}>
            <Bubble bot={bot} message={message} />
            {message.proposals.map(proposal => (
              <ProposalCard key={proposal.id} proposal={proposal} />
            ))}
          </Fragment>
        ))}
        {pending && (
          <>
            <Bubble
              bot={bot}
              message={{ attachments: pending.attached, content: pending.sent, role: 'USER' }}
            />
            <Bubble bot={bot} message={{ attachments: [], content: pending.text, role: 'BOT' }} />
          </>
        )}
        <div ref={end} />
      </div>
      {error && (
        <div className={cn(page && 'mx-auto w-full max-w-3xl px-1')}>
          <FormError message={error} />
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
              <Button
                aria-label="Enviar"
                className="size-10 rounded-full"
                disabled={Boolean(pending) || Boolean(unavailable) || !canSend}
                size="icon"
                type="submit"
              >
                <ArrowUpIcon />
              </Button>
            </div>
          </form>
          <p className="py-2 text-center text-xs text-muted-foreground">
            A IA pode errar. Confira as respostas importantes.
          </p>
        </div>
      ) : (
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
          <Button
            aria-label="Enviar"
            className="absolute right-2 bottom-2"
            disabled={Boolean(pending) || !canSend}
            size="icon-sm"
            type="submit"
          >
            <ArrowUpIcon />
          </Button>
        </form>
      )}
    </div>
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
function Bubble({ bot, message }: BubbleProps) {
  if (message.role === 'USER') {
    return (
      <div className="flex max-w-[85%] flex-col items-end gap-1.5 self-end">
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
      </div>
    );
  }
  return (
    <div className="flex gap-3">
      <BotGlyph bot={bot.key} className="mt-0.5 shrink-0" size={24} />
      <div className="min-w-0 flex-1">
        {message.content ? <ChatText text={message.content} /> : <Typing />}
      </div>
    </div>
  );
}
