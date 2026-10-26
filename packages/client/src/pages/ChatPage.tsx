import { useMutation, useQuery } from '@apollo/client/react';
import {
  BillingDocument,
  BotPanelDocument,
  ConversationsDocument,
  DeleteConversationDocument,
  StartConversationDocument,
  type ConversationsQuery,
} from '@zapbots/graphql/client';
import {
  CpuIcon,
  FileSpreadsheetIcon,
  HistoryIcon,
  MoreHorizontalIcon,
  PlusIcon,
  SearchIcon,
  SparklesIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { Button } from '@zapbots/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@zapbots/ui/components/dropdown-menu';
import { Input } from '@zapbots/ui/components/input';
import { Sheet, SheetContent, SheetTitle } from '@zapbots/ui/components/sheet';
import { Skeleton } from '@zapbots/ui/components/skeleton';
import { cn } from '@zapbots/ui/lib/utils';

import { CHAT_SUGGESTIONS } from '../components/ChatPanel';
import { ChatThread, type Suggestion } from '../components/ChatThread';
import { useUndoableDelete } from '../components/Toaster';
import { localToday } from '../lib/bots';

type Conversation = ConversationsQuery['conversations'][number];

/** On the page there is room for four: the panel's three, and one for a statement to attach. */
const PAGE_SUGGESTIONS: Suggestion[] = [
  ...CHAT_SUGGESTIONS,
  {
    icon: FileSpreadsheetIcon,
    text: 'Vou anexar meu extrato: organize os gastos por categoria.',
  },
];

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
    <div className="flex items-center gap-3 rounded-2xl bg-accent px-4 py-2.5 text-sm">
      <SparklesIcon className="size-4 shrink-0 text-primary" />
      <p className="min-w-0 flex-1">
        Mais Workflows e mensagens por mês no Plano Pro.{' '}
        <Link className="font-medium text-primary hover:underline" to="/plan">
          Ver planos
        </Link>
      </p>
      <Button aria-label="Fechar aviso" onClick={close} size="icon-sm" variant="ghost">
        <XIcon />
      </Button>
    </div>
  );
}

/** The local day (`YYYY-MM-DD`) a moment fell on. */
function localDay(moment: string | Date): string {
  const at = new Date(moment);
  return new Date(at.getTime() - at.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

/** Conversations by when they last moved: today, yesterday, this week, before. */
function byAge(conversations: Conversation[]): { items: Conversation[]; label: string }[] {
  const today = localToday();
  const daysAgo = (count: number) => {
    const at = new Date(`${today}T12:00:00`);
    at.setDate(at.getDate() - count);
    return localDay(at);
  };
  const yesterday = daysAgo(1);
  const weekAgo = daysAgo(7);
  const groups: { items: Conversation[]; label: string; test: (day: string) => boolean }[] = [
    { items: [], label: 'Hoje', test: day => day === today },
    { items: [], label: 'Ontem', test: day => day === yesterday },
    { items: [], label: 'Últimos 7 dias', test: day => day >= weekAgo },
    { items: [], label: 'Mais antigas', test: () => true },
  ];
  for (const conversation of conversations) {
    const day = localDay(conversation.updatedAt);
    groups.find(group => group.test(day))!.items.push(conversation);
  }
  return groups.filter(group => group.items.length > 0);
}

/**
 * The column of Conversations: a new one on top, a search, then the earlier ones by age, each
 * with its ⋯ menu.
 */
function Conversations({
  chosen,
  conversations,
  onDelete,
  onOpen,
}: {
  chosen: string | null;
  conversations: Conversation[] | undefined;
  onDelete: (conversation: Conversation) => void;
  onOpen: (id: string | null) => void;
}) {
  const [search, setSearch] = useState('');
  const groups = useMemo(() => {
    const words = search.trim().toLocaleLowerCase('pt-BR');
    const found = (conversations ?? []).filter(
      conversation =>
        !words ||
        conversation.title.toLocaleLowerCase('pt-BR').includes(words) ||
        (conversation.lastMessage?.content.toLocaleLowerCase('pt-BR').includes(words) ?? false)
    );
    return byAge(found.slice(0, 60));
  }, [conversations, search]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <Button className="h-11 rounded-full text-[0.9375rem]" onClick={() => onOpen(null)}>
        <PlusIcon />
        Nova conversa
      </Button>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Buscar conversas"
          className="h-10 rounded-full border-0 bg-muted pl-10 shadow-none"
          onChange={event => setSearch(event.target.value)}
          placeholder="Buscar conversas"
          value={search}
        />
      </div>

      <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-1 [scrollbar-width:none]">
        {!conversations ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2, 3].map(index => (
              <Skeleton className="h-9 rounded-xl" key={index} />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <p className="px-3 text-sm text-muted-foreground">
            {search ? 'Nenhuma conversa com essas palavras.' : 'Suas conversas aparecem aqui.'}
          </p>
        ) : (
          groups.map(group => (
            <section className="flex flex-col gap-0.5" key={group.label}>
              <h2 className="px-3 pb-1 text-xs font-medium text-muted-foreground">{group.label}</h2>
              {group.items.map(conversation => (
                <div className="group relative" key={conversation.id}>
                  <Button
                    className={cn(
                      'h-10 w-full justify-start rounded-xl px-3 pr-9 text-sm font-normal pointer-coarse:h-11 pointer-coarse:pr-12',
                      conversation.id === chosen
                        ? 'bg-accent font-medium text-primary hover:bg-accent hover:text-primary'
                        : 'hover:bg-muted'
                    )}
                    onClick={() => onOpen(conversation.id)}
                    variant="ghost"
                  >
                    <span className="truncate">{conversation.title}</span>
                  </Button>
                  {/* On a touch screen, with no pointer to hover, the ⋯ always shows, 44px. */}
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        aria-label={`Opções de “${conversation.title}”`}
                        className="absolute top-1.5 right-1 size-7 rounded-lg opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 pointer-coarse:top-0 pointer-coarse:right-0 pointer-coarse:opacity-100"
                        size="icon"
                        variant="ghost"
                      >
                        <MoreHorizontalIcon className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-44">
                      <DropdownMenuItem
                        onSelect={() => onDelete(conversation)}
                        variant="destructive"
                      >
                        <Trash2Icon />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </section>
          ))
        )}
      </div>
    </div>
  );
}

/**
 * The Agente page: a white column of Conversations (a drawer on a phone) beside the open one,
 * which has its title and Model on top and greets the User while it is empty.
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
  // `null` is a blank Conversation not yet saved; the page opens on one, or on `?c=`, as the
  // Dashboard's recent ones link.
  const [searchParams] = useSearchParams();
  const [chosen, setChosen] = useState<string | null>(() => searchParams.get('c'));
  // Remounts the thread when the User picks another Conversation, not when the first Message
  // saves a blank one (that would drop the reply being streamed).
  const [thread, setThread] = useState(0);
  const [removeConversation] = useMutation(DeleteConversationDocument, {
    refetchQueries: [ConversationsDocument],
  });
  // A deleted Conversation leaves the list at once; its toast can bring it back for a moment.
  const { hidden, remove: removeLater } = useUndoableDelete();
  const [drawer, setDrawer] = useState(false);

  const open = (id: string | null) => {
    setChosen(id);
    setThread(count => count + 1);
    setDrawer(false);
  };

  const ensureConversation = async () => {
    if (chosen) return chosen;
    const result = await start({ variables: { botId: bot!.id } });
    const id = result.data!.startConversation.id;
    setChosen(id);
    return id;
  };

  const conversations = list?.conversations.filter(conversation => !hidden.has(conversation.id));
  const remove = (conversation: Conversation) => {
    if (conversation.id === chosen) open(null);
    removeLater({
      commit: () => removeConversation({ variables: { id: conversation.id } }),
      ids: [conversation.id],
      message: `Conversa excluída: ${conversation.title}`,
    });
  };

  const current = conversations?.find(conversation => conversation.id === chosen);
  const column = (
    <Conversations chosen={chosen} conversations={conversations} onDelete={remove} onOpen={open} />
  );

  return (
    <div className="flex h-full min-h-0 gap-4 p-3 md:p-4">
      <aside className="hidden w-72 shrink-0 flex-col rounded-2xl bg-card p-4 shadow-[0_1px_3px_rgb(15_23_42/0.06)] md:flex">
        {column}
      </aside>
      <Sheet onOpenChange={setDrawer} open={drawer}>
        <SheetContent className="flex w-80 flex-col p-4 pt-12" side="left">
          <SheetTitle className="sr-only">Conversas</SheetTitle>
          {column}
        </SheetContent>
      </Sheet>

      <section className="page-enter flex min-w-0 flex-1 flex-col" data-bot="FINANCE">
        <header className="mx-auto flex w-full max-w-3xl items-center gap-2 px-1 pb-3">
          <Button
            aria-label="Conversas"
            className="rounded-full md:hidden"
            onClick={() => setDrawer(true)}
            size="icon"
            variant="ghost"
          >
            <HistoryIcon />
          </Button>
          <h1 className="min-w-0 flex-1 truncate text-base font-semibold">
            {current?.title ?? 'Nova conversa'}
          </h1>
          {bot && (
            <Link
              className="inline-flex max-w-56 items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-[0_1px_3px_rgb(15_23_42/0.06)] hover:text-foreground"
              title="Trocar o Modelo em Integrações"
              to="/integrations#ai"
            >
              <CpuIcon className="size-3.5 shrink-0" />
              <span className="truncate">{bot.model}</span>
            </Link>
          )}
          <Button
            aria-label="Nova conversa"
            className="rounded-full md:hidden"
            onClick={() => open(null)}
            size="icon"
            variant="ghost"
          >
            <PlusIcon />
          </Button>
        </header>
        <div className="mx-auto w-full max-w-3xl px-1">
          <PlanBanner />
        </div>
        {bot ? (
          <ChatThread
            bot={bot}
            className="min-h-0 flex-1"
            conversationId={chosen}
            ensureConversation={ensureConversation}
            greeting={user.name.split(' ')[0]}
            key={thread}
            suggestions={PAGE_SUGGESTIONS}
            unavailable={
              data.aiStatus.configured
                ? undefined
                : 'O Caishen ainda não responde: cole a chave de um provedor de IA em Integrações.'
            }
            variant="page"
          />
        ) : (
          <Skeleton className="mx-auto mt-6 w-full max-w-3xl flex-1 rounded-2xl" />
        )}
      </section>
    </div>
  );
}
