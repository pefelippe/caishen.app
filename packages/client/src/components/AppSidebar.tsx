import type { BotKey } from '@zapbots/graphql/client';
import { CheckIcon, ChevronsUpDownIcon, type LucideIcon } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

import { TEAM, UPCOMING_BOTS, teamBot } from '../lib/bots';
import { useI18n } from '../lib/i18n';
import { activeItem, useNav, type NavItem } from '../lib/nav';

const EASE = [0.22, 1, 0.36, 1] as const;
const ITEM =
  'h-10 gap-3 rounded-lg px-3 text-[0.9375rem] text-sidebar-foreground data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:shadow-[inset_3px_0_0_var(--sidebar-primary)] [&>svg]:size-[18px]';

function NavItems({ active, items }: { active: NavItem | undefined; items: NavItem[] }) {
  const { isMobile, setOpenMobile } = useSidebar();
  const { t } = useI18n();

  return (
    <SidebarMenu className="gap-0.5">
      {items.map(item => (
        <SidebarMenuItem key={item.to}>
          {item.disabled ? (
            <>
              <SidebarMenuButton
                aria-disabled
                className={cn(ITEM, 'pointer-events-none opacity-50')}
                tabIndex={-1}
              >
                <item.icon />
                <span>{item.label}</span>
              </SidebarMenuButton>
              <SidebarMenuBadge className="top-2.5 text-[11px] font-normal text-sidebar-foreground/70">
                {t('nav.soon')}
              </SidebarMenuBadge>
            </>
          ) : (
            <SidebarMenuButton asChild className={ITEM} isActive={item === active}>
              <NavLink onClick={() => isMobile && setOpenMobile(false)} to={item.to}>
                <item.icon />
                <span>{item.label}</span>
              </NavLink>
            </SidebarMenuButton>
          )}
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

function BotTile({ icon: Icon, muted }: { icon: LucideIcon; muted?: boolean }) {
  return (
    <span
      className={cn(
        'grid size-8 shrink-0 place-items-center rounded-lg',
        muted ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground'
      )}
    >
      <Icon className="size-4" />
    </span>
  );
}

/**
 * The Bot whose pages the menu shows: picked in the switcher, and following the address, so
 * opening /caishen/* picks the Caishen.
 */
function useActiveBot(): [BotKey, (key: BotKey) => void] {
  const { pathname } = useLocation();
  const [activeBot, setActiveBot] = useState<BotKey>(TEAM[0]!.key);

  useEffect(() => {
    const here = TEAM.find(bot => pathname === bot.path || pathname.startsWith(`${bot.path}/`));
    if (here) setActiveBot(here.key);
  }, [pathname]);

  return [activeBot, setActiveBot];
}

/** The switcher on top of the Bot's pages: the working Bots, then the ones still to come. */
function BotSwitcher({ activeBot, onPick }: { activeBot: BotKey; onPick: (key: BotKey) => void }) {
  const { t } = useI18n();
  const bot = teamBot(activeBot);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              aria-label={t('nav.switchBot')}
              className="gap-3 rounded-lg bg-sidebar-accent/60 px-2 text-sidebar-accent-foreground hover:bg-sidebar-accent data-[state=open]:bg-sidebar-accent"
              size="lg"
            >
              <BotTile icon={bot.icon} />
              <span className="grid min-w-0 flex-1 text-left leading-tight">
                <span className="truncate font-semibold">{bot.name}</span>
                <span className="truncate text-xs text-sidebar-foreground/70">{bot.field}</span>
              </span>
              <ChevronsUpDownIcon className="ml-auto size-4 text-sidebar-foreground/70" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-(--radix-dropdown-menu-trigger-width) min-w-72 rounded-xl p-1.5"
            sideOffset={6}
          >
            <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
              {t('nav.assistants')}
            </DropdownMenuLabel>
            {TEAM.map(entry => (
              <DropdownMenuItem
                className="gap-3 py-2"
                key={entry.key}
                onSelect={() => onPick(entry.key)}
              >
                <BotTile icon={entry.icon} />
                <span className="grid min-w-0 flex-1 leading-tight">
                  <span className="truncate font-medium">{entry.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{entry.field}</span>
                </span>
                {entry.key === activeBot && <CheckIcon className="text-primary" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            {UPCOMING_BOTS.map(entry => (
              <DropdownMenuItem className="gap-3 py-2" disabled key={entry.key}>
                <BotTile icon={entry.icon} muted />
                <span className="grid min-w-0 flex-1 leading-tight">
                  <span className="truncate font-medium">{entry.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{entry.field}</span>
                </span>
                <Badge variant="secondary">{t('nav.soon')}</Badge>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

/**
 * The navy menu on the left, under the header and of a piece with it: the app's screens on top,
 * then the Assistants (a switcher and the picked Bot's pages, sliding in when it changes) and the
 * account's screens at the foot. On a phone it slides in from the header's button.
 */
export function AppSidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { isMobile, setOpenMobile } = useSidebar();
  const { t } = useI18n();
  const still = useReducedMotion();
  const nav = useNav();
  const [activeBot, setActiveBot] = useActiveBot();
  const active = activeItem([...nav.main, ...nav.bots[activeBot], ...nav.account], pathname);

  const pick = (key: BotKey) => {
    setActiveBot(key);
    navigate(teamBot(key).path);
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar className="top-(--header-height) h-[calc(100svh-var(--header-height))]! border-r-0">
      <SidebarContent className="gap-2 px-2 py-3">
        <SidebarGroup className="py-1">
          <SidebarGroupContent>
            <NavItems active={active} items={nav.main} />
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="py-1">
          <SidebarGroupLabel className="h-8 px-3 text-xs font-medium tracking-wide text-sidebar-foreground/50 uppercase">
            {t('nav.assistants')}
          </SidebarGroupLabel>
          <SidebarGroupContent className="flex flex-col gap-1.5">
            <BotSwitcher activeBot={activeBot} onPick={pick} />
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                animate={{ opacity: 1, x: 0 }}
                className="border-l border-sidebar-border pl-2 ml-4"
                exit={still ? { opacity: 0 } : { opacity: 0, x: -8 }}
                initial={still ? { opacity: 0 } : { opacity: 0, x: 8 }}
                key={activeBot}
                transition={{ duration: 0.2, ease: EASE }}
              >
                <NavItems active={active} items={nav.bots[activeBot]} />
              </motion.div>
            </AnimatePresence>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border px-2 py-3">
        <SidebarGroupLabel className="h-8 px-3 text-xs font-medium tracking-wide text-sidebar-foreground/50 uppercase">
          {t('nav.account')}
        </SidebarGroupLabel>
        <NavItems active={active} items={nav.account} />
      </SidebarFooter>
    </Sidebar>
  );
}
