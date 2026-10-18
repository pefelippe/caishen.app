import { useApolloClient, useQuery } from '@apollo/client/react';
import {
  ConversationDocument,
  ConversationsDocument,
  type BotFieldsFragment,
  type MessageFieldsFragment,
} from '@zapbots/graphql/client';
import { ArrowUpIcon } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useLocation } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

import { streamChat } from '../lib/chat';
import { BotGlyph } from './BotGlyph';
import { FormError } from './FormError';

interface Props {
  bot: BotFieldsFragment;
  className?: string;
  /** `null` until the first Message; `ensureConversation` then creates it. */
  conversationId: string | null;
  ensureConversation: () => Promise<string>;
  /** Lines offered while the Conversation is empty. */
  suggestions?: string[];
}

/** One Conversation with a Bot: the Messages so far, the reply being written, and the input. */
export function ChatThread({
  bot,
  className,
  conversationId,
  ensureConversation,
  suggestions = [],
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

  const saved = (conversationId && data?.conversation?.messages) || [];
  // While a reply is being written, the saved copy of this exchange stays hidden: the pending
  // bubbles show it, and a refetch in the middle would otherwise show the User's Message twice.
  const messages = pending ? saved.slice(0, pending.before) : saved;

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, pending?.text]);

  const send = async (content: string) => {
    if (!content.trim() || pending) return;
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
      setError('Não foi possível falar com o Bot.');
    }
    setPending(null);
  };

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

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pr-1">
        {empty && (
          <div className="flex flex-col gap-3 py-2">
            <p className="font-serif text-lg leading-snug text-pretty">{bot.personality}</p>
            {suggestions.map(suggestion => (
              <Button
                className="h-auto justify-start px-0 py-0.5 text-left whitespace-normal text-ink"
                key={suggestion}
                onClick={() => void send(suggestion)}
                variant="link"
              >
                {suggestion}
              </Button>
            ))}
          </div>
        )}
        {messages.map(message => (
          <Bubble bot={bot} key={message.id} message={message} />
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
      <form className="relative mt-3 shrink-0" onSubmit={onSubmit}>
        <Textarea
          aria-label={`Mensagem para ${bot.name}`}
          className="max-h-40 min-h-[4.25rem] resize-none bg-card pr-11"
          disabled={Boolean(pending)}
          onChange={event => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={`Escreva para ${bot.name}…`}
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
      <p className="min-w-0 leading-relaxed whitespace-pre-wrap">{message.content}</p>
    </div>
  );
}
