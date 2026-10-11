import { useMutation, useQuery } from '@apollo/client/react';
import {
  BuddyPanelDocument,
  ConversationsDocument,
  StartConversationDocument,
  type BuddyArea,
} from '@mny/graphql/client';
import { PlusIcon } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import { AREAS } from '../lib/areas';
import { BuddyGlyph } from './BuddyGlyph';
import { ChatThread } from './ChatThread';

interface Props {
  area: BuddyArea;
  className?: string;
  suggestions?: string[];
}

/** The Buddy of an Area with its latest Conversation, ready to talk about what is on screen. */
export function BuddyPanel({ area, className, suggestions }: Props) {
  const { data } = useQuery(BuddyPanelDocument, { variables: { area } });
  const buddy = data?.buddy;
  const { data: list } = useQuery(ConversationsDocument, {
    skip: !buddy,
    variables: { buddyId: buddy?.id ?? '' },
  });
  const [start] = useMutation(StartConversationDocument, {
    refetchQueries: [ConversationsDocument],
  });
  // `undefined` follows the latest Conversation; `null` is a blank one not yet saved.
  const [chosen, setChosen] = useState<string | null | undefined>(undefined);
  // Remounts the thread only when the User asks for a blank Conversation. Saving the first Message
  // also changes `conversationId`, and a remount there would drop the reply being streamed.
  const [thread, setThread] = useState(0);

  if (!buddy) return <Skeleton className={cn('h-64 w-full', className)} />;

  const conversationId = chosen === undefined ? (list?.conversations[0]?.id ?? null) : chosen;

  const ensureConversation = async () => {
    if (conversationId) return conversationId;
    const result = await start({ variables: { buddyId: buddy.id } });
    const id = result.data!.startConversation.id;
    setChosen(id);
    return id;
  };

  return (
    <section className={cn('flex min-h-0 flex-col gap-4', className)} data-area={area}>
      <header className="flex items-center gap-3 border-b border-ink/40 pb-3">
        <BuddyGlyph area={area} size={40} />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="font-serif text-xl">{buddy.name}</div>
          <div className="text-xs text-muted-foreground">
            {area === 'GENERAL' ? 'Buddy geral' : `Buddy de ${AREAS[area].label}`}
          </div>
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
          <AlertTitle>{buddy.name} ainda está dormindo</AlertTitle>
          <AlertDescription>
            Falta a chave do OpenRouter no servidor (OPENROUTER_API_KEY). Com ela no .env, os
            Buddies passam a responder.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {!buddy.canAct && (
            <p className="text-xs text-muted-foreground">
              Com o Modelo atual, {buddy.name} só conversa e lê seus dados.{' '}
              <Link className="text-ink underline underline-offset-4" to="/buddies">
                Trocar Modelo
              </Link>
            </p>
          )}
          <ChatThread
            buddy={buddy}
            className="flex-1"
            conversationId={conversationId}
            ensureConversation={ensureConversation}
            key={thread}
            suggestions={suggestions}
          />
        </>
      )}
    </section>
  );
}
