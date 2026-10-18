import { useMutation, useQuery } from '@apollo/client/react';
import {
  BotPanelDocument,
  ConversationDocument,
  ConversationsDocument,
  DeleteConversationDocument,
  StartConversationDocument,
  type BotKey,
} from '@zapbots/graphql/client';
import { ArrowLeftIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import { teamBot } from '../lib/bots';
import { BotGlyph } from './BotGlyph';
import { ChatThread } from './ChatThread';

const SUGGESTIONS: Record<BotKey, string[]> = {
  FINANCE: [
    'O que merece minha atenção agora?',
    'Qual das minhas dívidas devo quitar primeiro?',
    'Como está meu Score e o que mais pesa nele?',
  ],
};

interface Props {
  /** Path the Conversation links start from, as in `ConversationList`. */
  base: string;
  bot: BotKey;
  /** `null` for a new Conversation, created by its first Message. */
  conversationId: string | null;
}

/** An open Conversation, filling the right side: who it is with, then the thread. */
export function ChatView({ base, bot: key, conversationId }: Props) {
  const navigate = useNavigate();
  const { data } = useQuery(BotPanelDocument, { variables: { key } });
  const { data: conversation } = useQuery(ConversationDocument, {
    skip: !conversationId,
    variables: { id: conversationId ?? '' },
  });
  const [start] = useMutation(StartConversationDocument, {
    refetchQueries: [ConversationsDocument],
  });
  const [remove] = useMutation(DeleteConversationDocument, {
    refetchQueries: [ConversationsDocument],
  });
  // A Conversation created by the first Message keeps the thread that is streaming its reply.
  const [adopted, setAdopted] = useState<string | null>(null);

  const bot = data?.bot;
  if (!bot || !data) return <Skeleton className="m-6 h-64" />;
  const threadKey = conversationId && adopted !== conversationId ? conversationId : 'new';

  const ensureConversation = async () => {
    if (conversationId) return conversationId;
    const result = await start({ variables: { botId: bot.id } });
    const created = result.data!.startConversation.id;
    setAdopted(created);
    navigate(`${base}/c/${created}${base ? '' : `?bot=${key}`}`, { replace: true });
    return created;
  };

  return (
    <section className="flex h-full min-h-0 flex-col" data-bot={key}>
      <header className="flex items-center gap-3 border-b bg-card px-4 py-3">
        <Button
          asChild
          aria-label="Voltar às conversas"
          className="md:hidden"
          size="icon-sm"
          variant="ghost"
        >
          <NavLink to={base || '/'}>
            <ArrowLeftIcon />
          </NavLink>
        </Button>
        <BotGlyph bot={key} size={40} />
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate font-medium">
            {conversation?.conversation?.title ?? 'Nova conversa'}
          </div>
          <div className="text-xs text-muted-foreground">
            {teamBot(key).name} · {teamBot(key).field}
          </div>
        </div>
        {conversationId && (
          <Button
            aria-label="Excluir conversa"
            onClick={async () => {
              await remove({ variables: { id: conversationId } });
              navigate(base || '/', { replace: true });
            }}
            size="icon-sm"
            title="Excluir conversa"
            variant="ghost"
          >
            <Trash2Icon />
          </Button>
        )}
      </header>
      <div className="flex min-h-0 flex-1 flex-col px-4 pt-4 pb-4 md:px-8">
        {data.aiStatus.configured ? (
          <ChatThread
            bot={bot}
            className="w-full flex-1"
            conversationId={conversationId}
            ensureConversation={ensureConversation}
            key={threadKey}
            suggestions={SUGGESTIONS[key]}
          />
        ) : (
          <Alert>
            <AlertTitle>{bot.name} ainda está dormindo</AlertTitle>
            <AlertDescription>
              Falta a chave do OpenRouter no servidor (OPENROUTER_API_KEY). Com ela no .env, os Bots
              passam a responder.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </section>
  );
}
