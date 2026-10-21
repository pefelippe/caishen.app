import {
  BuildingIcon,
  CreditCardIcon,
  LanguagesIcon,
  LogOutIcon,
  PlugIcon,
  UserIcon,
  type LucideIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
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

import { authClient } from '../lib/auth';
import { isLanguage, LANGUAGES, useI18n, type Language, type StringKey } from '../lib/i18n';

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

/**
 * The avatar at the right of the header: who is signed in, the account's screens, the language
 * (saved on the User, like on Perfil) and signing out.
 */
export function ProfileMenu({ user }: { user: { email: string; name: string } }) {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useI18n();

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
          className="ml-1 size-9 rounded-full bg-header-muted p-0 text-xs font-semibold text-header-foreground ring-1 ring-white/15 hover:bg-header-muted/80 hover:text-header-foreground"
        >
          {initials(user.name)}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 rounded-xl p-1.5" sideOffset={10}>
        <DropdownMenuLabel className="px-3 py-2.5 font-normal">
          <span className="block truncate text-base font-semibold">{user.name}</span>
          <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ACCOUNT.map(entry => (
          <DropdownMenuItem
            className="gap-3 px-3 py-2"
            key={entry.to}
            onSelect={() => navigate(entry.to)}
          >
            <entry.icon />
            {t(entry.label)}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-3 px-3 py-2">
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
        <DropdownMenuItem className="gap-3 px-3 py-2" onSelect={() => void authClient.signOut()}>
          <LogOutIcon />
          {t('profile.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
