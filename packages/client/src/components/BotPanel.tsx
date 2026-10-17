import { useMutation, useQuery } from '@apollo/client/react';
import {
  BotPanelDocument,
  ConversationsDocument,
  StartConversationDocument,
  type BotKey,
} from '@zapbots/graphql/client';
import { PlusIcon } from 'lucide-react';
import { useState } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import { BotGlyph } from './BotGlyph';
import { ChatThread } from './ChatThread';

interface Props {
  bot: BotKey;
  className?: string;
  suggestions?: string[];
}

/** A Bot with its latest Conversation, ready to talk about what is on screen. */
export function BotPanel({ bot: key, className, suggestions }: Props) {
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
  const [chosen, setChosen] = useState<string | null | undefined>(undefined);
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
      <header className="flex items-center gap-3 border-b border-ink/40 pb-3">
        <BotGlyph bot={key} size={40} />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="font-serif text-xl">{bot.name}</div>
          <div className="text-xs text-muted-foreground">Converse sobre o que está na tela</div>
        </div>
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
      </header>
      {!data.aiStatus.configured ? (
        <Alert>
          <AlertTitle>{bot.name} ainda está dormindo</AlertTitle>
          <AlertDescription>
            Falta a chave do OpenRouter no servidor (OPENROUTER_API_KEY). Com ela no .env, os Bots
            passam a responder.
          </AlertDescription>
        </Alert>
      ) : (
        <ChatThread
          bot={bot}
          className="flex-1"
          conversationId={conversationId}
          ensureConversation={ensureConversation}
          key={thread}
          suggestions={suggestions}
        />
      )}
    </section>
  );
}
