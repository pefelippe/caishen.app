import { useMutation, useQuery } from '@apollo/client/react';
import {
  BillingDocument,
  BotPanelDocument,
  ConversationsDocument,
  StartConversationDocument,
} from '@zapbots/graphql/client';
import { InfoIcon, MessageSquareIcon, XIcon } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import { CHAT_SUGGESTIONS } from '../components/ChatPanel';
import { ChatThread } from '../components/ChatThread';

const BANNER_KEY = 'zapbots.agentBanner';

function bannerClosed(): boolean {
  try {
    return localStorage.getItem(BANNER_KEY) === 'closed';
  } catch {
    return false;
  }
}

/** On the Free Plan, a line pointing to Pro; closed once, it stays closed in this browser. */
function PlanBanner() {
  const { data } = useQuery(BillingDocument);
  const [closed, setClosed] = useState(bannerClosed);
  if (closed || !data || data.billing.plan.key === 'PRO') return null;

  const close = () => {
    setClosed(true);
    try {
      localStorage.setItem(BANNER_KEY, 'closed');
    } catch {
      // Without storage it shows again next time.
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl items-center gap-3 rounded-xl bg-header/5 px-4 py-3">
      <InfoIcon className="size-5 shrink-0 text-header" />
      <p className="min-w-0 flex-1">
        Mais Workflows e mensagens por mês no Plano Pro.{' '}
        <Link className="font-medium text-header underline underline-offset-4" to="/plan">
          Ver planos
        </Link>
      </p>
      <Button aria-label="Fechar aviso" onClick={close} size="icon-sm" variant="ghost">
        <XIcon />
      </Button>
    </div>
  );
}

/**
 * The Agente page: on the left a new chat and the earlier Conversations; on the right the open Conversation, greeting the User while it is empty.
 */
export function ChatPage({ user }: { user: { name: string } }) {
  const { data } = useQuery(BotPanelDocument, { variables: { key: 'FINANCE' } });
  const bot = data?.bot;
  const { data: list } = useQuery(ConversationsDocument, {
    skip: !bot,
    variables: { botId: bot?.id ?? '' },
  });
  const [start] = useMutation(StartConversationDocument, {
    refetchQueries: [ConversationsDocument],
  });
  // `null` is a blank Conversation not yet saved; the page opens on one.
  const [chosen, setChosen] = useState<string | null>(null);
  // Remounts the thread when the User picks another Conversation, not when the first Message
  // saves a blank one (that would drop the reply being streamed).
  const [thread, setThread] = useState(0);

  const open = (id: string | null) => {
    setChosen(id);
    setThread(current => current + 1);
  };

  const ensureConversation = async () => {
    if (chosen) return chosen;
    const result = await start({ variables: { botId: bot!.id } });
    const id = result.data!.startConversation.id;
    setChosen(id);
    return id;
  };

  return (
    <div className="flex h-full min-h-0">
      <aside className="hidden w-72 shrink-0 flex-col gap-4 overflow-y-auto border-r bg-card p-3 md:flex">
        <Button
          className="h-10 rounded-xl bg-header/10 font-medium text-header hover:bg-header/15"
          onClick={() => open(null)}
          variant="ghost"
        >
          Novo chat
        </Button>
        <div className="flex flex-col gap-0.5">
          <span className="px-3 pb-1 text-[0.8125rem] font-medium text-muted-foreground">
            Conversas
          </span>
          {!list?.conversations.length && (
            <p className="px-3 text-muted-foreground">Nenhuma conversa ainda.</p>
          )}
          {list?.conversations.slice(0, 30).map(conversation => (
            <Button
              className={cn(
                'h-10 justify-start gap-3 px-3 text-[0.9375rem] font-normal',
                conversation.id === chosen && 'bg-accent'
              )}
              key={conversation.id}
              onClick={() => open(conversation.id)}
              variant="ghost"
            >
              <MessageSquareIcon />
              <span className="truncate">{conversation.title}</span>
            </Button>
          ))}
        </div>
      </aside>

      <section className="page-enter flex min-w-0 flex-1 flex-col pt-6" data-bot="FINANCE">
        <div className="px-4">
          <PlanBanner />
        </div>
        {bot ? (
          <ChatThread
            bot={bot}
            className="flex-1"
            conversationId={chosen}
            ensureConversation={ensureConversation}
            greeting={user.name.split(' ')[0]}
            key={thread}
            suggestions={CHAT_SUGGESTIONS}
            unavailable={
              data.aiStatus.configured
                ? undefined
                : 'O Caishen ainda não responde: falta a OPENROUTER_API_KEY no .env do servidor.'
            }
            variant="page"
          />
        ) : (
          <Skeleton className="m-6 flex-1" />
        )}
      </section>
    </div>
  );
}
