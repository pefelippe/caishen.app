import {
  BuildingIcon,
  CreditCardIcon,
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
import { Button } from '@/components/ui/button';

import { cn } from '@/lib/utils';

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
];

/** The User's photo, or their initials, in a circle. */
function UserAvatar({ className, user }: { className?: string; user: ProfileUser }) {
  return (
    <Avatar className={cn('size-8', className)}>
      {user.image && <AvatarImage alt={user.name} src={user.image} />}
      <AvatarFallback className="bg-header-muted text-xs font-semibold text-header-foreground">
        {initials(user.name)}
      </AvatarFallback>
    </Avatar>
  );
}

/**
 * Who is signed in, as their round avatar at the right of the header, beside the Alerts: it opens
 * the account's screens, the language (saved on the User, like on Perfil) and signing out.
 */
export function ProfileMenu({ user }: { user: ProfileUser }) {
  const { language, setLanguage, t } = useI18n();
  const navigate = useNavigate();

  // Saved on the User too: the session's language wins on the next load (App.tsx).
  const changeLanguage = async (next: Language) => {
    const previous = language;
    setLanguage(next);
    const result = await authClient.updateUser({ language: next });
    if (result.error) setLanguage(previous);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={t('profile.label')}
          className="size-9 rounded-full p-0 border border-white/15 bg-white/8 text-header-foreground hover:bg-white/15 hover:text-header-foreground data-[state=open]:bg-white/15"
          size="icon"
          variant="ghost"
        >
          <UserAvatar
            className="size-full *:data-[slot=avatar-fallback]:bg-transparent"
            user={user}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 rounded-xl" sideOffset={10}>
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2.5 px-1 py-1.5">
            <UserAvatar user={user} />
            <span className="grid min-w-0 flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{user.name}</span>
              <span className="truncate text-xs text-muted-foreground">{user.email}</span>
            </span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {ACCOUNT.map(entry => (
            <DropdownMenuItem key={entry.to} onSelect={() => navigate(entry.to)}>
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
  );
}
