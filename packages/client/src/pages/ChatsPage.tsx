import type { BotKey } from '@zapbots/graphql/client';
import { useParams, useSearchParams } from 'react-router-dom';

import { ChatView } from '../components/ChatView';
import { ConversationList } from '../components/ConversationList';
import { TwoPanes } from '../components/TwoPanes';
import { Welcome } from '../components/Welcome';

/** Chats: every Conversation with the team, the WhatsApp way. */
export function ChatsPage({ user }: { user: { name: string } }) {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const conversationId = id && id !== 'new' ? id : null;
  const bot = (params.get('bot') as BotKey | null) ?? 'FINANCE';

  return (
    <TwoPanes
      list={<ConversationList base="" current={conversationId ?? undefined} title="Chats" />}
      open={Boolean(id)}
      side={
        id ? (
          // Not keyed by the id: the first Message turns `new` into an id while the reply streams.
          <ChatView base="" bot={bot} conversationId={conversationId} />
        ) : (
          <Welcome name={user.name} />
        )
      }
    />
  );
}
