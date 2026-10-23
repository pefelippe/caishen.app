import { useApolloClient, useQuery } from '@apollo/client/react';
import {
  ConversationDocument,
  ConversationsDocument,
  type BotFieldsFragment,
  type MessageFieldsFragment,
} from '@zapbots/graphql/client';
import { ArrowUpIcon, type LucideIcon } from 'lucide-react';
import { Fragment, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useLocation } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

import { streamChat } from '../lib/chat';
import { BotGlyph } from './BotGlyph';
import { ChatText } from './ChatText';
import { FormError } from './FormError';
import { Logo } from './Logo';
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
    /** Messages on screen when this one was sent; later ones are the exchange in flight. */
    before: number;
    sent: string;
    text: string;
  } | null>(null);
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

  const send = async (content: string) => {
    if (!content.trim() || pending || unavailable) return;
    setError(null);
    setDraft('');
    setPending({ before: saved.length, sent: content.trim(), text: '' });
    try {
      const id = await ensureConversation();
      await streamChat({
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
    if (!firstMessage || firstSent.current) return;
    firstSent.current = true;
    void send(firstMessage);
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

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pr-1 [scrollbar-width:none]',
          page && 'mx-auto w-full max-w-3xl px-4 pt-8'
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
          <div className="flex flex-1 flex-col">
            <div className="flex flex-1 flex-col items-center justify-center gap-1 py-10 text-center">
              <Logo className="mb-4 text-header" size={44} />
              <p className="text-2xl font-semibold tracking-tight">
                {greeting ? `Olá, ${greeting}` : 'Olá'}
              </p>
              <p className="text-base">Como posso te ajudar hoje?</p>
            </div>
            <ul className="flex flex-col">
              {suggestions.map(suggestion => (
                <li className="border-b last:border-b-0" key={suggestion.text}>
                  <Button
                    className="h-auto w-full justify-start gap-4 rounded-lg px-2 py-4 text-left text-base font-normal whitespace-normal text-foreground"
                    onClick={() => fill(suggestion.text)}
                    variant="ghost"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-foreground text-background">
                      <suggestion.icon className="size-4" />
                    </span>
                    {suggestion.text}
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
            <Bubble bot={bot} message={{ content: pending.sent, role: 'USER' }} />
            <Bubble bot={bot} message={{ content: pending.text || '…', role: 'BOT' }} />
          </>
        )}
        <div ref={end} />
      </div>
      {error && <FormError message={error} />}
      {page ? (
        <div className="mx-auto w-full max-w-3xl shrink-0 px-4 pt-3 pb-3">
          <form
            className="flex flex-col gap-2 rounded-2xl border-2 border-header/50 bg-card p-3 transition-colors focus-within:border-header"
            onSubmit={onSubmit}
          >
            <Textarea
              aria-label={`Mensagem para ${bot.name}`}
              data-chat-input
              className="max-h-48 min-h-12 resize-none border-0 bg-transparent px-1 text-base shadow-none focus-visible:ring-0"
              disabled={Boolean(unavailable)}
              onChange={event => setDraft(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder={`Escreva para ${bot.name}…`}
              ref={input}
              value={draft}
            />
            <div className="flex items-center justify-end gap-3">
              {unavailable && (
                <p className="mr-auto text-xs text-muted-foreground">{unavailable}</p>
              )}
              <Button
                aria-label="Enviar"
                className="size-10 rounded-full bg-(image:--header-gradient) text-white"
                disabled={Boolean(pending) || Boolean(unavailable) || !draft.trim()}
                size="icon"
                type="submit"
              >
                <ArrowUpIcon />
              </Button>
            </div>
          </form>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            A IA pode errar. Confira as respostas importantes.
          </p>
        </div>
      ) : (
        <form className="relative mt-3 shrink-0" onSubmit={onSubmit}>
          <Textarea
            aria-label={`Mensagem para ${bot.name}`}
            data-chat-input
            className="max-h-40 min-h-[4.25rem] resize-none bg-card pr-11"
            disabled={Boolean(unavailable)}
            onChange={event => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={`Escreva para ${bot.name}…`}
            ref={input}
            value={draft}
          />
          <Button
            aria-label="Enviar"
            className="absolute right-2 bottom-2"
            disabled={Boolean(pending) || !draft.trim()}
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

interface BubbleProps {
  bot: BotFieldsFragment;
  message: Pick<MessageFieldsFragment, 'content' | 'role'>;
}

/** The User's Messages sit right in a tinted block; the Bot's are plain text beside its glyph. */
function Bubble({ bot, message }: BubbleProps) {
  if (message.role === 'USER') {
    return (
      <p className="max-w-[85%] self-end rounded-md bg-secondary px-3 py-2 whitespace-pre-wrap">
        {message.content}
      </p>
    );
  }
  return (
    <div className="flex gap-2.5">
      <BotGlyph bot={bot.key} className="mt-0.5" size={22} />
      <ChatText text={message.content} />
    </div>
  );
}
