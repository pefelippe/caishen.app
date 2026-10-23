import {
  BuildingIcon,
  ChevronsUpDownIcon,
  CreditCardIcon,
  PlugIcon,
  LanguagesIcon,
  LogOutIcon,
  UserIcon,
  type LucideIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

import { authClient } from '../lib/auth';
import { isLanguage, LANGUAGES, useI18n, type Language, type StringKey } from '../lib/i18n';

export interface ProfileUser {
  email: string;
  /** The Google photo, when the User signed in with Google. */
  image?: string | null;
  name: string;
}

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]!.toUpperCase())
    .join('');

/** The account's screens, in the order the menu lists them. */
const ACCOUNT: { icon: LucideIcon; label: StringKey; to: string }[] = [
  { icon: UserIcon, label: 'menu.profile', to: '/profile' },
  { icon: CreditCardIcon, label: 'rail.plan', to: '/plan' },
  { icon: BuildingIcon, label: 'rail.organization', to: '/organization' },
  { icon: PlugIcon, label: 'integrations.title', to: '/integrations' },
];

/** The User's photo, or their initials, beside their name and e-mail. */
function UserBlock({ user }: { user: ProfileUser }) {
  return (
    <>
      <Avatar className="size-8 rounded-lg">
        {user.image && <AvatarImage alt={user.name} src={user.image} />}
        <AvatarFallback className="rounded-lg bg-header-muted text-xs font-semibold text-header-foreground">
          {initials(user.name)}
        </AvatarFallback>
      </Avatar>
      <span className="grid min-w-0 flex-1 text-left text-sm leading-tight">
        <span className="truncate font-semibold">{user.name}</span>
        <span className="truncate text-xs opacity-70">{user.email}</span>
      </span>
    </>
  );
}

/**
 * Who is signed in, at the foot of the menu (shadcn's NavUser): the account's screens, the
 * language (saved on the User, like on Perfil) and signing out.
 */
export function ProfileMenu({ user }: { user: ProfileUser }) {
  const { language, setLanguage, t } = useI18n();
  const { isMobile, setOpenMobile } = useSidebar();
  const navigate = useNavigate();

  // Saved on the User too: the session's language wins on the next load (App.tsx).
  const changeLanguage = async (next: Language) => {
    const previous = language;
    setLanguage(next);
    const result = await authClient.updateUser({ language: next });
    if (result.error) setLanguage(previous);
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              aria-label={t('profile.label')}
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              size="lg"
            >
              <UserBlock user={user} />
              <ChevronsUpDownIcon className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5">
                <UserBlock user={user} />
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {ACCOUNT.map(entry => (
                <DropdownMenuItem
                  key={entry.to}
                  onSelect={() => {
                    navigate(entry.to);
                    if (isMobile) setOpenMobile(false);
                  }}
                >
                  <entry.icon />
                  {t(entry.label)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <LanguagesIcon className="size-4 text-muted-foreground" />
                {t('account.language')}
                <span className="ml-auto pr-1 text-xs text-muted-foreground">
                  {LANGUAGES.find(option => option.value === language)?.label}
                </span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup
                  onValueChange={next => isLanguage(next) && void changeLanguage(next)}
                  value={language}
                >
                  {LANGUAGES.map(option => (
                    <DropdownMenuRadioItem key={option.value} value={option.value}>
                      {option.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => void authClient.signOut()}>
              <LogOutIcon />
              {t('profile.signOut')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
