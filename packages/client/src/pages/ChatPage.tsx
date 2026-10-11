import { useMutation, useQuery } from '@apollo/client/react';
import {
  BuddyPanelDocument,
  ConversationsDocument,
  DeleteConversationDocument,
  StartConversationDocument,
} from '@mny/graphql/client';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { BuddyGlyph } from '../components/BuddyGlyph';
import { ChatThread } from '../components/ChatThread';
import { PageSkeleton } from '../components/PageSkeleton';

const SUGGESTIONS = [
  'O que merece minha atenção hoje?',
  'Como estou de Treinos e de Tarefas nesta semana?',
  'Tenho alguma Parcela vencendo perto de um prazo de Trabalho?',
];

/** The general Buddy, who sees all four Areas, with the Conversations kept so far. */
export function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data } = useQuery(BuddyPanelDocument, { variables: { area: 'GENERAL' } });
  const buddy = data?.buddy;
  const { data: list } = useQuery(ConversationsDocument, {
    skip: !buddy,
    variables: { buddyId: buddy?.id ?? '' },
  });
  const [start] = useMutation(StartConversationDocument, {
    refetchQueries: [ConversationsDocument],
  });
  const [remove] = useMutation(DeleteConversationDocument, {
    refetchQueries: [ConversationsDocument],
  });

  // A Conversation created by the first Message keeps the thread that is streaming its reply;
  // any other change of Conversation gets a fresh thread.
  const [blank, setBlank] = useState(0);
  const [adopted, setAdopted] = useState<{ id: string; key: string } | null>(null);

  if (!buddy) return <PageSkeleton />;
  const threadKey = id ? (adopted?.id === id ? adopted.key : id) : `new-${blank}`;

  const ensureConversation = async () => {
    if (id) return id;
    const result = await start({ variables: { buddyId: buddy.id } });
    const created = result.data!.startConversation.id;
    setAdopted({ id: created, key: threadKey });
    setBlank(current => current + 1);
    navigate(`/chat/${created}`, { replace: true });
    return created;
  };

  const onDelete = async (conversationId: string) => {
    await remove({ variables: { id: conversationId } });
    if (conversationId === id) navigate('/chat');
  };

  return (
    <div
      className="grid h-[calc(100svh-6.5rem)] gap-10 md:grid-cols-[15rem_minmax(0,1fr)]"
      data-area="GENERAL"
    >
      <aside className="hidden min-h-0 flex-col gap-3 md:flex">
        <Button asChild className="justify-start" variant="outline">
          <Link to="/chat">
            <PlusIcon />
            Nova conversa
          </Link>
        </Button>
        <ul className="flex min-h-0 flex-col overflow-y-auto">
          {list?.conversations.map(conversation => (
            <li className="group flex items-center border-b" key={conversation.id}>
              <Link
                className={cn(
                  'min-w-0 flex-1 truncate py-2 underline-offset-4 hover:underline',
                  conversation.id === id ? 'font-medium' : 'text-muted-foreground'
                )}
                to={`/chat/${conversation.id}`}
              >
                {conversation.title}
              </Link>
              <Button
                aria-label="Excluir conversa"
                className="text-muted-foreground opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                onClick={() => void onDelete(conversation.id)}
                size="icon-xs"
                variant="ghost"
              >
                <Trash2Icon />
              </Button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="mx-auto flex min-h-0 w-full max-w-3xl flex-col gap-4">
        <header className="flex items-center gap-3 border-b border-ink/40 pb-4">
          <BuddyGlyph area="GENERAL" size={48} />
          <div className="leading-tight">
            <h1 className="text-3xl">{buddy.name}</h1>
            <p className="text-muted-foreground">
              Buddy geral: enxerga Finanças, Anotações, Trabalho e Fitness.
            </p>
          </div>
        </header>
        {data.aiStatus.configured ? (
          <>
            {!buddy.canAct && (
              <p className="text-xs text-muted-foreground">
                Com o Modelo atual, {buddy.name} só conversa e lê seus dados.{' '}
                <Link className="underline underline-offset-4" to="/buddies">
                  Trocar Modelo
                </Link>
              </p>
            )}
            <ChatThread
              buddy={buddy}
              className="flex-1"
              conversationId={id ?? null}
              ensureConversation={ensureConversation}
              key={threadKey}
              suggestions={SUGGESTIONS}
            />
          </>
        ) : (
          <Alert>
            <AlertTitle>{buddy.name} ainda está dormindo</AlertTitle>
            <AlertDescription>
              Falta a chave do OpenRouter no servidor (OPENROUTER_API_KEY). Com ela no .env, os
              Buddies passam a responder.
            </AlertDescription>
          </Alert>
        )}
      </section>
    </div>
  );
}
