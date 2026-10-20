import {
  BuildingIcon,
  CoinsIcon,
  CreditCardIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  PlugIcon,
  UserIcon,
  WorkflowIcon,
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
import { useI18n, type StringKey } from '../lib/i18n';
import { BotGlyph } from './BotGlyph';

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]!.toUpperCase())
    .join('');

/** The rail's screens, each lit for its own paths. */
const ENTRIES: {
  icon: LucideIcon;
  label: StringKey;
  to: string;
}[] = [
  { icon: LayoutDashboardIcon, label: 'rail.dashboard', to: '/' },
  { icon: WorkflowIcon, label: 'rail.workflows', to: '/workflows' },
  { icon: FileTextIcon, label: 'rail.documents', to: '/documents' },
  { icon: CoinsIcon, label: 'rail.finance', to: '/caishen' },
];

/** The account's screens, in the avatar menu rather than on the rail. */
const ACCOUNT: { icon: LucideIcon; label: StringKey; to: string }[] = [
  { icon: UserIcon, label: 'menu.profile', to: '/profile' },
  { icon: CreditCardIcon, label: 'rail.plan', to: '/plan' },
  { icon: BuildingIcon, label: 'rail.organization', to: '/organization' },
  { icon: PlugIcon, label: 'rail.integrations', to: '/integrations' },
];

const lit = (to: string, path: string) =>
  to === '/' ? path === '/' : path === to || path.startsWith(`${to}/`);

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
        'relative h-auto w-[88px] shrink-0 flex-col gap-1 rounded-lg px-0.5 py-2.5 has-[>svg]:px-0.5 text-[11px] font-medium text-rail-foreground hover:bg-white/10 hover:text-paper',
        active && 'bg-white/15 text-paper'
      )}
      variant="ghost"
    >
      <NavLink to={to}>
        {active && <span aria-hidden className="absolute -left-1 h-6 w-1 rounded-r bg-paper" />}
        <Icon className="!size-5" />
        <span className="max-w-full truncate leading-none">{label}</span>
      </NavLink>
    </Button>
  );
}

/**
 * The dark rail on the far left: the screens at the top, then the avatar at the bottom, with the
 * account's screens (Perfil, Plano, Organização, Integrações) and signing out. The chat is not here: it opens from the top bar.
 */
export function Rail({ user }: { user: { email: string; name: string } }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <nav className="relative flex w-24 shrink-0 flex-col items-center gap-1 overflow-y-auto bg-rail pt-4 pb-20">
      <NavLink
        aria-label={t('rail.caishen')}
        className="mb-5 flex flex-col items-center gap-1 text-paper"
        to="/"
      >
        <BotGlyph bot="FINANCE" className="bg-paper text-rail" size={32} />
        <span className="text-xs font-semibold tracking-tight">Caishen</span>
      </NavLink>
      {ENTRIES.map(entry => (
        <RailLink
          active={lit(entry.to, pathname)}
          icon={entry.icon}
          key={entry.to}
          label={t(entry.label)}
          to={entry.to}
        />
      ))}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={t('profile.label')}
            className={cn(
              'absolute bottom-4 size-10 shrink-0 cursor-pointer rounded-full bg-paper p-0 text-xs font-semibold text-rail hover:bg-paper/90',
              ACCOUNT.some(entry => lit(entry.to, pathname)) &&
                'ring-2 ring-paper ring-offset-2 ring-offset-rail'
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
          {ACCOUNT.map(entry => (
            <DropdownMenuItem key={entry.to} onSelect={() => navigate(entry.to)}>
              <entry.icon />
              {t(entry.label)}
            </DropdownMenuItem>
          ))}
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
