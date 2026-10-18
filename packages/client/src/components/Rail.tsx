import {
  BotIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MessageCircleIcon,
  PlusIcon,
  SettingsIcon,
  UserIcon,
  type LucideIcon,
} from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

import { authClient } from '../lib/auth';
import { TEAM } from '../lib/bots';
import { useI18n, type StringKey } from '../lib/i18n';
import { NewChatMenu } from './NewChatMenu';

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]!.toUpperCase())
    .join('');

/** The rail's screens, each lit for its own paths. */
const ENTRIES: { icon: LucideIcon; label: StringKey; matches: (path: string) => boolean; to: string }[] = [
  {
    icon: MessageCircleIcon,
    label: 'rail.chats',
    matches: path => path === '/' || path.startsWith('/c/'),
    to: '/',
  },
  {
    icon: LayoutDashboardIcon,
    label: 'rail.dashboard',
    matches: path => path.startsWith('/dashboard'),
    to: '/dashboard',
  },
  {
    icon: FileTextIcon,
    label: 'rail.documents',
    matches: path => path.startsWith('/documentos'),
    to: '/documentos',
  },
  {
    icon: BotIcon,
    label: 'rail.bots',
    // A Bot's own page belongs to Bots.
    matches: path =>
      path.startsWith('/bots') ||
      TEAM.some(member => path === member.path || path.startsWith(`${member.path}/`)),
    to: '/bots',
  },
];

/** One entry of the rail: the icon with its name under it, lit when its screen is open. */
function RailLink({
  active,
  icon: Icon,
  label,
  to,
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  to: string;
}) {
  return (
    <Button
      asChild
      className={cn(
        'relative h-auto w-16 shrink-0 flex-col gap-1 rounded-lg px-1 py-2 text-[11px] font-medium text-rail-foreground hover:bg-white/10 hover:text-paper',
        active && 'bg-white/15 text-paper'
      )}
      variant="ghost"
    >
      <NavLink to={to}>
        {active && <span aria-hidden className="absolute -left-2 h-6 w-1 rounded-r bg-paper" />}
        <Icon className="!size-5" />
        <span className="max-w-full truncate leading-none">{label}</span>
      </NavLink>
    </Button>
  );
}

/**
 * The dark rail on the far left: a new Conversation, the screens (Chats, Dashboard, Documentos,
 * Bots), then the profile, with Settings and signing out.
 */
export function Rail({ user }: { user: { email: string; name: string } }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <nav className="flex w-20 shrink-0 flex-col items-center gap-1 overflow-y-auto bg-rail py-3">
      <NewChatMenu side="right">
        <Button
          aria-label={t('chat.new')}
          className="mb-2 size-11 shrink-0 rounded-full bg-paper p-0 text-rail hover:bg-paper/90"
          title={t('chat.new')}
        >
          <PlusIcon className="!size-5" />
        </Button>
      </NewChatMenu>
      {ENTRIES.map(entry => (
        <RailLink
          active={entry.matches(pathname)}
          icon={entry.icon}
          key={entry.to}
          label={t(entry.label)}
          to={entry.to}
        />
      ))}
      <div className="flex-1" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={t('profile.label')}
            className={cn(
              'mt-1 size-10 shrink-0 cursor-pointer rounded-full bg-paper p-0 text-xs font-semibold text-rail hover:bg-paper/90',
              pathname.startsWith('/configuracoes') && 'ring-2 ring-paper ring-offset-2 ring-offset-rail'
            )}
          >
            {initials(user.name)}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64" side="right">
          <DropdownMenuLabel className="flex items-center gap-3 py-3 font-normal">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {initials(user.name)}
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate font-medium">{user.name}</span>
              <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => navigate('/configuracoes')}>
            <SettingsIcon />
            {t('profile.settings')}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => navigate('/configuracoes/perfil')}>
            <UserIcon />
            {t('profile.editProfile')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => void authClient.signOut()}>
            <LogOutIcon />
            {t('profile.signOut')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}
