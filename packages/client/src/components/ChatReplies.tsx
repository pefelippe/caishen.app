import { useApolloClient } from '@apollo/client/react';
import {
  ConversationDocument,
  ConversationsDocument,
  StopReplyDocument,
} from '@zapbots/graphql/client';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type { ChatAttachment } from '../lib/attachments';
import { streamChat, type Redo } from '../lib/chat';

/** The exchange in flight in one Conversation: the User's Message and the reply so far. */
export interface PendingReply {
  /** Files sent with it, by name. */
  attached: Pick<ChatAttachment, 'kind' | 'name'>[];
  /** Messages on screen when this one was sent; later ones are the exchange in flight. */
  before: number;
  sent: string;
  text: string;
}

/** A Message written while the Bot was still replying; it goes when the reply ends. */
export interface QueuedMessage {
  attachments: ChatAttachment[];
  content: string;
  screen: string;
}

interface SendOptions {
  attachments: ChatAttachment[];
  content: string;
  conversationId: string;
  /** Waits in the queue even though no reply is known here (one written before a reload). */
  queue?: boolean;
  /** Answers the User's last Message again, as it is or edited to `content`. */
  redo?: Redo;
  screen: string;
}

interface ChatReplies {
  error: (conversationId: string | null) => string | null;
  pending: (conversationId: string | null) => PendingReply | null;
  queued: (conversationId: string | null) => QueuedMessage[];
  /** Sends a Message, or queues it while a reply is still being written. */
  send: (options: SendOptions) => Promise<void>;
  /** Sends the next Message in the queue, if nothing is being written. */
  sendQueued: (conversationId: string) => void;
  setError: (conversationId: string, message: string | null) => void;
  /** Parar: the server ends the reply with what it has and sends it as usual. */
  stop: (conversationId: string) => Promise<void>;
  unqueue: (conversationId: string, index: number) => void;
}

const ChatRepliesContext = createContext<ChatReplies | null>(null);

export function useChatReplies(): ChatReplies {
  const replies = useContext(ChatRepliesContext);
  if (!replies) throw new Error('useChatReplies outside ChatRepliesProvider');
  return replies;
}

const NO_QUEUE: QueuedMessage[] = [];

/**
 * The replies being written, by Conversation, kept above the screens: changing page or closing the
 * chat panel does not drop one, and the thread shows it again when it opens. Messages written
 * meanwhile wait in a queue and go, in order, as each reply ends.
 */
export function ChatRepliesProvider({ children }: { children: ReactNode }) {
  const apollo = useApolloClient();
  const [pending, setPending] = useState<Record<string, PendingReply>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [queues, setQueues] = useState<Record<string, QueuedMessage[]>>({});
  // The same, read outside of rendering, so two sends at once cannot both start a reply.
  const busy = useRef(new Set<string>());
  const waiting = useRef<Record<string, QueuedMessage[]>>({});

  const setQueue = useCallback((id: string, queue: QueuedMessage[]) => {
    waiting.current = { ...waiting.current, [id]: queue };
    setQueues(waiting.current);
  }, []);

  const setError = useCallback((conversationId: string, message: string | null) => {
    setErrors(({ [conversationId]: _, ...rest }) =>
      message ? { ...rest, [conversationId]: message } : rest
    );
  }, []);

  /** What the thread shows while the reply is written, from the Messages already loaded. */
  const pendingFor = useCallback(
    ({ attachments, content, conversationId: id, redo }: SendOptions): PendingReply => {
      const saved =
        apollo.readQuery({ query: ConversationDocument, variables: { id } })?.conversation
          ?.messages ?? [];
      if (!redo) {
        return {
          attached: attachments.map(({ kind, name }) => ({ kind, name })),
          before: saved.length,
          sent: content.trim(),
          text: '',
        };
      }
      const last = saved.findLastIndex(message => message.role === 'USER');
      const message = saved[last];
      return {
        attached: message?.attachments ?? [],
        before: Math.max(last, 0),
        sent: redo === 'edit' ? content.trim() : (message?.content ?? ''),
        text: '',
      };
    },
    [apollo]
  );

  const send = useCallback(
    async (options: SendOptions): Promise<void> => {
      const { attachments, content, conversationId: id, queue, redo, screen } = options;
      if (busy.current.has(id) || queue) {
        if (!redo) setQueue(id, [...(waiting.current[id] ?? []), { attachments, content, screen }]);
        return;
      }
      busy.current.add(id);
      setError(id, null);
      setPending(current => ({ ...current, [id]: pendingFor(options) }));
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
          redo,
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
      busy.current.delete(id);
      setPending(({ [id]: _, ...rest }) => rest);
      sendQueued(id);
    },
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- sendQueued is declared below and stable
    [apollo, pendingFor, setError, setQueue]
  );

  // A function declaration would be hoisted; a stable callback through a ref does the same here.
  const sendRef = useRef(send);
  sendRef.current = send;
  const sendQueued = useCallback(
    (id: string) => {
      const [next, ...rest] = waiting.current[id] ?? [];
      if (!next || busy.current.has(id)) return;
      setQueue(id, rest);
      void sendRef.current({ ...next, conversationId: id });
    },
    [setQueue]
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

  const unqueue = useCallback(
    (id: string, index: number) =>
      setQueue(
        id,
        (waiting.current[id] ?? []).filter((_, at) => at !== index)
      ),
    [setQueue]
  );

  const value = useMemo<ChatReplies>(
    () => ({
      error: id => (id && errors[id]) || null,
      pending: id => (id && pending[id]) || null,
      queued: id => (id && queues[id]) || NO_QUEUE,
      send,
      sendQueued,
      setError,
      stop,
      unqueue,
    }),
    [errors, pending, queues, send, sendQueued, setError, stop, unqueue]
  );

  return <ChatRepliesContext.Provider value={value}>{children}</ChatRepliesContext.Provider>;
}
