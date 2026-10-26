import { useApolloClient } from '@apollo/client/react';
import {
  ConversationDocument,
  ConversationsDocument,
  StopReplyDocument,
} from '@zapbots/graphql/client';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import type { ChatAttachment } from '../lib/attachments';
import { streamChat } from '../lib/chat';

/** The exchange in flight in one Conversation: the User's Message and the reply so far. */
export interface PendingReply {
  /** Files sent with it, by name. */
  attached: Pick<ChatAttachment, 'kind' | 'name'>[];
  /** Messages on screen when this one was sent; later ones are the exchange in flight. */
  before: number;
  sent: string;
  text: string;
}

interface ChatReplies {
  error: (conversationId: string | null) => string | null;
  pending: (conversationId: string | null) => PendingReply | null;
  send: (options: {
    attachments: ChatAttachment[];
    before: number;
    content: string;
    conversationId: string;
    screen: string;
  }) => Promise<void>;
  setError: (conversationId: string, message: string | null) => void;
  /** Parar: the server ends the reply with what it has and sends it as usual. */
  stop: (conversationId: string) => Promise<void>;
}

const ChatRepliesContext = createContext<ChatReplies | null>(null);

export function useChatReplies(): ChatReplies {
  const replies = useContext(ChatRepliesContext);
  if (!replies) throw new Error('useChatReplies outside ChatRepliesProvider');
  return replies;
}

/**
 * The replies being written, by Conversation, kept above the screens: changing page or closing the
 * chat panel does not drop one, and the thread shows it again when it opens.
 */
export function ChatRepliesProvider({ children }: { children: ReactNode }) {
  const apollo = useApolloClient();
  const [pending, setPending] = useState<Record<string, PendingReply>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setError = useCallback((conversationId: string, message: string | null) => {
    setErrors(({ [conversationId]: _, ...rest }) =>
      message ? { ...rest, [conversationId]: message } : rest
    );
  }, []);

  const send = useCallback<ChatReplies['send']>(
    async ({ attachments, before, content, conversationId: id, screen }) => {
      setError(id, null);
      setPending(current => ({
        ...current,
        [id]: {
          attached: attachments.map(({ kind, name }) => ({ kind, name })),
          before,
          sent: content.trim(),
          text: '',
        },
      }));
      try {
        await streamChat({
          attachments,
          content,
          conversationId: id,
          onEvent: event => {
            if (event.type === 'delta') {
              setPending(current =>
                current[id]
                  ? { ...current, [id]: { ...current[id], text: current[id].text + event.text } }
                  : current
              );
            } else if (event.type === 'error') setError(id, event.message);
          },
          screen,
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
        setError(id, 'Não foi possível falar com o Caishen.');
      }
      setPending(({ [id]: _, ...rest }) => rest);
    },
    [apollo, setError]
  );

  const stop = useCallback(
    async (conversationId: string) => {
      try {
        await apollo.mutate({ mutation: StopReplyDocument, variables: { conversationId } });
      } catch {
        setError(conversationId, 'Não foi possível parar a resposta.');
      }
    },
    [apollo, setError]
  );

  const value = useMemo<ChatReplies>(
    () => ({
      error: id => (id && errors[id]) || null,
      pending: id => (id && pending[id]) || null,
      send,
      setError,
      stop,
    }),
    [errors, pending, send, setError, stop]
  );

  return <ChatRepliesContext.Provider value={value}>{children}</ChatRepliesContext.Provider>;
}
