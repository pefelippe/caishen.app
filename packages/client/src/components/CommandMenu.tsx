import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  LogOutIcon,
  MessageSquarePlusIcon,
  MonitorIcon,
  MoonIcon,
  PanelLeftIcon,
  SunIcon,
} from 'lucide-react';
import {
  createContext,
  lazy,
  Suspense,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';

import { AgentIcon } from '@zapbots/ui/blocks/agent-icon';
import {
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@zapbots/ui/components/command';
import { useSidebar } from '@zapbots/ui/components/sidebar';

import { authClient } from '../lib/auth';
import { useI18n } from '../lib/i18n';
import { useNav } from '../lib/nav';
import { isShortcut, isTyping, shortcut } from '../lib/shortcuts';
import { useThemeChoice, type ThemeChoice } from '../lib/theme';
import { useChatPanel } from './ChatPanel';

// The dialog of Adicionar entrada/saída lives with the finance screens; it loads when asked for.
const AddEntryDialog = lazy(async () => ({
  default: (await import('../pages/FinancePage')).AddEntryDialog,
}));

const THEMES: { icon: typeof SunIcon; value: ThemeChoice }[] = [
  { icon: SunIcon, value: 'light' },
  { icon: MoonIcon, value: 'dark' },
  { icon: MonitorIcon, value: 'system' },
];

const CommandMenuContext = createContext<(() => void) | null>(null);

/** Opens the command menu, as ⌘K does (the header's Buscar button). */
export function useOpenCommandMenu(): () => void {
  const open = useContext(CommandMenuContext);
  if (!open) throw new Error('useOpenCommandMenu outside CommandMenu');
  return open;
}

/**
 * ⌘K (Ctrl+K elsewhere): every screen and the actions of the app, found by typing and picked with
 * the keyboard alone. What does not match a screen or an action can be asked to the Agente.
 */
export function CommandMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState<'IN' | 'OUT'>();
  const { t } = useI18n();
  const nav = useNav();
  const navigate = useNavigate();
  const chat = useChatPanel();
  const { open: menuOpen, toggleSidebar } = useSidebar();
  const { setChoice } = useThemeChoice();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!isShortcut(event, 'k')) return;
      // Its own input is a field too: ⌘K there closes it.
      if (!open && isTyping(event)) return;
      event.preventDefault();
      setOpen(current => !current);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const changeOpen = (next: boolean) => {
    setOpen(next);
    if (!next) setQuery('');
  };

  /** Closes the menu, then does what was picked. */
  const run = (action: () => void) => () => {
    changeOpen(false);
    action();
  };

  const asked = query.trim();
  const screens = [...nav.main, ...nav.groups.flatMap(group => group.items), ...nav.account].filter(
    item => !item.soon
  );

  return (
    <CommandMenuContext.Provider value={() => changeOpen(true)}>
      {children}
      <CommandDialog
        className="top-[20%] translate-y-0 sm:max-w-xl"
        description={t('command.description')}
        onOpenChange={changeOpen}
        open={open}
        title={t('command.title')}
      >
        <CommandInput
          onValueChange={setQuery}
          placeholder={t('command.placeholder')}
          value={query}
        />
        <CommandList className="max-h-[min(60vh,420px)]">
          <CommandGroup heading={t('command.goTo')}>
            {screens.map(item => (
              <CommandItem key={item.to} onSelect={run(() => navigate(item.to))}>
                <item.icon />
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading={t('command.actions')}>
            <CommandItem onSelect={run(() => setAdding('IN'))}>
              <ArrowDownLeftIcon />
              {t('command.addIn')}
            </CommandItem>
            <CommandItem onSelect={run(() => setAdding('OUT'))}>
              <ArrowUpRightIcon />
              {t('command.addOut')}
            </CommandItem>
            <CommandItem className="max-md:hidden" onSelect={run(toggleSidebar)}>
              <PanelLeftIcon />
              {menuOpen ? t('nav.collapse') : t('command.expand')}
              <CommandShortcut>{shortcut('B')}</CommandShortcut>
            </CommandItem>
            {THEMES.map(theme => (
              <CommandItem
                key={theme.value}
                keywords={[t('theme.title')]}
                onSelect={run(() => setChoice(theme.value))}
              >
                <theme.icon />
                {t('command.theme', { theme: t(`theme.${theme.value}`) })}
              </CommandItem>
            ))}
            <CommandItem onSelect={run(() => void authClient.signOut())}>
              <LogOutIcon />
              {t('profile.signOut')}
            </CommandItem>
          </CommandGroup>
          <CommandGroup forceMount heading={t('nav.agent')}>
            {/* Always there, last, so Enter picks a match first: whatever was typed goes to the
                Agente as a question. Its value never matches, so it does not climb the list. */}
            <CommandItem
              forceMount
              onSelect={run(() => (asked ? chat.startNew(asked) : chat.openToType()))}
              value="ask-agent"
            >
              <AgentIcon />
              <span className="min-w-0 truncate">
                {asked ? t('command.askThis', { question: asked }) : t('command.ask')}
              </span>
            </CommandItem>
            <CommandItem keywords={[t('command.newChat')]} onSelect={run(() => chat.startNew())}>
              <MessageSquarePlusIcon />
              {t('command.newChat')}
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      {adding && (
        <Suspense fallback={null}>
          <AddEntryDialog direction={adding} onClose={() => setAdding(undefined)} />
        </Suspense>
      )}
    </CommandMenuContext.Provider>
  );
}
