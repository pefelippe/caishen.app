import { useQuery } from '@apollo/client/react';
import { BotPanelDocument, ConversationsDocument, type BotKey } from '@zapbots/graphql/client';
import { PlusIcon, SearchIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

import { TEAM } from '../lib/bots';
import { BotGlyph } from './BotGlyph';
import { NewChatMenu } from './NewChatMenu';

interface Props {
  /** Only this Bot's Conversations; without it, the whole team's, with a chip per Bot. */
  bot?: BotKey;
  /** Path the links start from: `/c/:id` in Chats, `/caishen/c/:id` on a Bot's page. */
  base: string;
  /** The Conversation open on the right, to mark it. */
  current?: string;
  title: ReactNode;
}

const time = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
const date = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });

/** "14:05" for today, "16/10" before. */
function when(iso: string) {
  const at = new Date(iso);
  return at.toDateString() === new Date().toDateString() ? time.format(at) : date.format(at);
}

/** The list of Conversations, as in a messaging app: search, filters, newest first. */
export function ConversationList({ base, bot, current, title }: Props) {
  const { data: panel } = useQuery(BotPanelDocument, {
    skip: !bot,
    variables: { key: bot ?? 'FINANCE' },
  });
  const { data } = useQuery(ConversationsDocument, {
    fetchPolicy: 'cache-and-network',
    skip: Boolean(bot) && !panel,
    variables: { botId: bot ? panel?.bot.id : null },
  });
  const [term, setTerm] = useState('');
  const [only, setOnly] = useState<BotKey | null>(null);

  const search = term.trim().toLocaleLowerCase('pt-BR');
  const conversations = (data?.conversations ?? []).filter(
    conversation =>
      (!only || conversation.bot.key === only) &&
      (!search ||
        conversation.title.toLocaleLowerCase('pt-BR').includes(search) ||
        conversation.lastMessage?.content.toLocaleLowerCase('pt-BR').includes(search))
  );

  return (
    <div className="flex h-full min-h-0 flex-col border-r bg-card">
      <header className="flex items-center justify-between gap-2 px-4 pt-4 pb-3">
        <h2 className="font-serif text-2xl">{title}</h2>
        <NewChatMenu align="end">
          <Button
            aria-label="Nova conversa"
            className="rounded-full"
            size="icon"
            title="Nova conversa"
          >
            <PlusIcon />
          </Button>
        </NewChatMenu>
      </header>
      <div className="relative px-4">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-7 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Pesquisar conversas"
          className="rounded-full bg-secondary pl-9"
          onChange={event => setTerm(event.target.value)}
          placeholder="Pesquisar conversas"
          value={term}
        />
      </div>
      {!bot && (
        <div className="flex flex-wrap gap-2 px-4 pt-3">
          {[null, ...TEAM.map(member => member.key)].map(key => (
            <Button
              className={cn(
                'h-7 rounded-full px-3 text-xs',
                only === key ? '' : 'bg-secondary text-foreground hover:bg-accent'
              )}
              key={key ?? 'all'}
              onClick={() => setOnly(key)}
              size="sm"
              variant={only === key ? 'default' : 'ghost'}
            >
              {key ? TEAM.find(member => member.key === key)!.name : 'Tudo'}
            </Button>
          ))}
        </div>
      )}
      <ul className="mt-3 min-h-0 flex-1 overflow-y-auto">
        {conversations.map(conversation => (
          <li key={conversation.id}>
            <NavLink
              className={cn(
                'flex items-center gap-3 border-b px-4 py-3 hover:bg-secondary',
                conversation.id === current && 'bg-secondary'
              )}
              data-bot={conversation.bot.key}
              to={`${base}/c/${conversation.id}${bot ? '' : `?bot=${conversation.bot.key}`}`}
            >
              <BotGlyph bot={conversation.bot.key} size={44} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <span className="min-w-0 flex-1 truncate font-medium">{conversation.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {when(conversation.updatedAt)}
                  </span>
                </span>
                <span className="block truncate text-muted-foreground">
                  {conversation.lastMessage
                    ? `${conversation.lastMessage.role === 'BOT' ? `${conversation.bot.name}: ` : ''}${conversation.lastMessage.content.split('\n')[0]}`
                    : 'Sem mensagens ainda'}
                </span>
              </span>
            </NavLink>
          </li>
        ))}
        {data && conversations.length === 0 && (
          <li className="px-4 py-6 text-muted-foreground">
            {search || only ? 'Nenhuma conversa encontrada.' : 'Nenhuma conversa ainda.'}
          </li>
        )}
      </ul>
    </div>
  );
}
