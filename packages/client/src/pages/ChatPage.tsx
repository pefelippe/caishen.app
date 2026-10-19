import { BotPanel } from '../components/BotPanel';
import { CHAT_SUGGESTIONS } from '../components/ChatPanel';

/** Chat: a page only for talking to the Caishen, his Conversations one click away. */
export function ChatPage() {
  return (
    <div className="page-enter mx-auto flex h-full min-h-0 w-full max-w-3xl flex-col px-5 py-6">
      <BotPanel bot="FINANCE" className="h-full" suggestions={CHAT_SUGGESTIONS} />
    </div>
  );
}
