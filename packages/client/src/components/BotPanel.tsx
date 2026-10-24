import { useMutation, useQuery } from '@apollo/client/react';
import {
  BotPanelDocument,
  ConversationsDocument,
  StartConversationDocument,
  type BotKey,
} from '@zapbots/graphql/client';
import { HistoryIcon, PlusIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';

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
import { BotGlyph } from './BotGlyph';
import { ChatThread, type Suggestion } from './ChatThread';

interface Props {
  /** Extra buttons at the end of the header, e.g. to collapse a floating panel. */
  actions?: ReactNode;
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
      <header className="flex items-center gap-3">
        <BotGlyph bot={key} size={32} />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="font-semibold">{bot.name}</div>
          <div className="truncate text-xs text-muted-foreground">Sobre o que está na tela</div>
        </div>
        {Boolean(list?.conversations.length) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                aria-label="Conversas anteriores"
                size="icon-sm"
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
          onClick={() => {
            setChosen(null);
            setThread(current => current + 1);
          }}
          size="icon-sm"
          title="Nova conversa"
          variant="ghost"
        >
          <PlusIcon />
        </Button>
        {actions}
      </header>
      {!data.aiStatus.configured ? (
        <Alert>
          <AlertTitle>{bot.name} ainda está dormindo</AlertTitle>
          <AlertDescription>
            Falta a chave do OpenRouter no servidor (OPENROUTER_API_KEY). Com ela no .env, o Caishen
            passam a responder.
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
          key={thread}
          suggestions={suggestions}
        />
      )}
    </section>
  );
}
