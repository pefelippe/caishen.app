import { useMutation, useQuery } from '@apollo/client/react';
import {
  BotPanelDocument,
  ConversationsDocument,
  StartConversationDocument,
  type BotKey,
} from '@zapbots/graphql/client';
import { HistoryIcon, PlusIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

import { Alert, AlertDescription, AlertTitle } from '@zapbots/ui/components/alert';
import { Button } from '@zapbots/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@zapbots/ui/components/dropdown-menu';
import { Skeleton } from '@zapbots/ui/components/skeleton';
import { cn } from '@zapbots/ui/lib/utils';

import type { ChatAttachment } from '../lib/attachments';
import { ChatThread, type Suggestion } from './ChatThread';

/** The square light blue buttons of the panel's header, as in Mercado Pago's chat. */
export const PANEL_BUTTON =
  'size-10 rounded-xl bg-accent text-primary hover:bg-accent/70 hover:text-primary [&_svg]:size-5!';

interface Props {
  /** Buttons at the end of the header, given the open Conversation: on the panel, opening it on
   * its own page and closing. */
  actions?: (conversationId: string | null) => ReactNode;
  /** The User's first name, greeted while the Conversation is empty. */
  greeting?: string;
  bot: BotKey;
  className?: string;
  /** Sent as soon as the blank Conversation opens. */
  firstMessage?: string;
  /** Files sent with it. */
  firstFiles?: ChatAttachment[];
  /** Opens on a blank Conversation instead of the latest one. */
  startBlank?: boolean;
  suggestions?: Suggestion[];
}

/** A Bot with its latest Conversation, ready to talk about what is on screen. */
export function BotPanel({
  actions,
  bot: key,
  className,
  firstFiles,
  firstMessage,
  greeting,
  startBlank,
  suggestions,
}: Props) {
  const { data } = useQuery(BotPanelDocument, { variables: { key } });
  const bot = data?.bot;
  const { data: list } = useQuery(ConversationsDocument, {
    skip: !bot,
    variables: { botId: bot?.id ?? '' },
  });
  const [start] = useMutation(StartConversationDocument, {
    refetchQueries: [ConversationsDocument],
  });
  // `undefined` follows the latest Conversation; `null` is a blank one not yet saved.
  const [chosen, setChosen] = useState<string | null | undefined>(startBlank ? null : undefined);
  // Remounts the thread only when the User asks for a blank Conversation. Saving the first Message
  // also changes `conversationId`, and a remount there would drop the reply being streamed.
  const [thread, setThread] = useState(0);

  if (!bot) return <Skeleton className={cn('h-64 w-full', className)} />;

  const conversationId = chosen === undefined ? (list?.conversations[0]?.id ?? null) : chosen;

  const ensureConversation = async () => {
    if (conversationId) return conversationId;
    const result = await start({ variables: { botId: bot.id } });
    const id = result.data!.startConversation.id;
    setChosen(id);
    return id;
  };

  return (
    <section className={cn('flex min-h-0 flex-col gap-4', className)} data-bot={key}>
      <header className="flex items-center gap-2">
        <div className="min-w-0 flex-1 truncate pl-1 text-base font-semibold">{bot.name}</div>
        {Boolean(list?.conversations.length) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                aria-label="Conversas anteriores"
                className={PANEL_BUTTON}
                size="icon"
                title="Conversas anteriores"
                variant="ghost"
              >
                <HistoryIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>Conversas anteriores</DropdownMenuLabel>
              {list!.conversations.slice(0, 15).map(conversation => (
                <DropdownMenuItem
                  className={cn(conversation.id === conversationId && 'font-medium')}
                  key={conversation.id}
                  onSelect={() => {
                    setChosen(conversation.id);
                    setThread(current => current + 1);
                  }}
                >
                  <span className="truncate">{conversation.title}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <Button
          aria-label="Nova conversa"
          className={PANEL_BUTTON}
          onClick={() => {
            setChosen(null);
            setThread(current => current + 1);
          }}
          size="icon"
          title="Nova conversa"
          variant="ghost"
        >
          <PlusIcon />
        </Button>
        {actions?.(conversationId)}
      </header>
      {!data.aiStatus.configured ? (
        <Alert>
          <AlertTitle>{bot.name} ainda estÃ¡ dormindo</AlertTitle>
          <AlertDescription>
            Falta a chave de um provedor de IA. Cole-a em{' '}
            <Link className="underline underline-offset-4" to="/integrations#ai">
              IntegraÃ§Ãµes
            </Link>{' '}
            e o Caishen passa a responder.
          </AlertDescription>
        </Alert>
      ) : (
        <ChatThread
          bot={bot}
          className="flex-1"
          conversationId={conversationId}
          ensureConversation={ensureConversation}
          firstFiles={thread === 0 ? firstFiles : undefined}
          firstMessage={thread === 0 ? firstMessage : undefined}
          greeting={greeting}
          key={thread}
          suggestions={suggestions}
        />
      )}
    </section>
  );
}
