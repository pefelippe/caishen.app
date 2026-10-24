import {
  CreditCardIcon,
  LanguagesIcon,
  LogOutIcon,
  SettingsIcon,
  UserIcon,
  type LucideIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Avatar, AvatarFallback, AvatarImage } from '@zapbots/ui/components/avatar';
import { Button } from '@zapbots/ui/components/button';
import { Tabs, TabsList, TabsTrigger } from '@zapbots/ui/components/tabs';
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
} from '@zapbots/ui/components/dropdown-menu';
import { cn } from '@zapbots/ui/lib/utils';

import { HEADER_ICON } from '../lib/header';

import { authClient } from '../lib/auth';
import { isLanguage, LANGUAGES, useI18n, type Language, type StringKey } from '../lib/i18n';
import { useThemeChoice, type ThemeChoice } from '../lib/theme';

export interface ProfileUser {
  email: string;
  /** The Google photo, when the User signed in with Google, or the URL set on Perfil. */
  image?: string | null;
  name: string;
}

export const initials = (name: string) =>
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
  { icon: SettingsIcon, label: 'nav.settings', to: '/settings' },
];

const THEMES: { label: StringKey; value: ThemeChoice }[] = [
  { label: 'theme.light', value: 'light' },
  { label: 'theme.dark', value: 'dark' },
  { label: 'theme.system', value: 'system' },
];

/** The User's photo, or their initials, in a circle. */
export function UserAvatar({ className, user }: { className?: string; user: ProfileUser }) {
  return (
    <Avatar className={cn('size-8', className)}>
      {user.image && <AvatarImage alt={user.name} referrerPolicy="no-referrer" src={user.image} />}
      <AvatarFallback className="bg-header-muted text-xs font-semibold text-header-foreground">
        {initials(user.name)}
      </AvatarFallback>
    </Avatar>
  );
}

/**
 * Who is signed in, as their round avatar at the right of the header, its menu after Hostinger's:
 * the name and e-mail, the account's screens, the language (saved on the User), the theme (per
 * browser) and signing out.
 */
export function ProfileMenu({ user }: { user: ProfileUser }) {
  const { language, setLanguage, t } = useI18n();
  const navigate = useNavigate();
  const { choice, setChoice } = useThemeChoice();

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
          className={cn(HEADER_ICON, 'p-0')}
          size="icon"
          variant="ghost"
        >
          <UserAvatar
            className="size-full *:data-[slot=avatar-fallback]:bg-primary *:data-[slot=avatar-fallback]:text-primary-foreground"
            user={user}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 rounded-2xl p-1.5" sideOffset={10}>
        <DropdownMenuLabel className="px-3 py-2.5 font-normal">
          <div className="truncate text-base font-semibold">{user.name}</div>
          <div className="truncate text-sm text-muted-foreground">{user.email}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {ACCOUNT.map(entry => (
            <DropdownMenuItem
              className="gap-3 px-3 py-2.5"
              key={entry.to}
              onSelect={() => navigate(entry.to)}
            >
              <entry.icon className="size-[18px]" />
              {t(entry.label)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-3 px-3 py-2.5">
            <LanguagesIcon className="size-[18px] text-muted-foreground" />
            {t('account.language')}
            <span className="ml-auto pr-1 text-muted-foreground">
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
        <div className="flex flex-col gap-2 px-3 pt-1.5 pb-2.5">
          <span className="text-sm font-medium">{t('theme.title')}</span>
          <Tabs onValueChange={next => setChoice(next as ThemeChoice)} value={choice}>
            <TabsList className="w-full rounded-full">
              {THEMES.map(theme => (
                <TabsTrigger className="rounded-full" key={theme.value} value={theme.value}>
                  {t(theme.label)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-3 px-3 py-2.5" onSelect={() => void authClient.signOut()}>
          <LogOutIcon className="size-[18px]" />
          {t('profile.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
