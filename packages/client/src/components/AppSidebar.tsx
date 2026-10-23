import type { LucideIcon } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';

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

import { TEAM, UPCOMING_BOTS } from '../lib/bots';
import { useI18n } from '../lib/i18n';
import { activeItem, useNav, type NavItem } from '../lib/nav';
import { ProfileMenu, type ProfileUser } from './ProfileMenu';

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
 * Every Assistant at once: each working Bot leads to its page and lists its pages under it; the
 * ones still being built follow, greyed out with "Em breve".
 */
function Assistants({ active }: { active: NavItem | undefined }) {
  const { isMobile, setOpenMobile } = useSidebar();
  const { t } = useI18n();
  const nav = useNav();

  return (
    <SidebarMenu className="gap-1.5">
      {TEAM.map(bot => (
        <SidebarMenuItem className="flex flex-col gap-1" key={bot.key}>
          <SidebarMenuButton
            asChild
            className="gap-3 rounded-lg px-2 text-sidebar-foreground"
            size="lg"
          >
            <NavLink onClick={() => isMobile && setOpenMobile(false)} to={bot.path}>
              <BotTile icon={bot.icon} />
              <span className="grid min-w-0 flex-1 text-left leading-tight">
                <span className="truncate font-semibold">{bot.name}</span>
                <span className="truncate text-xs text-sidebar-foreground/70">{bot.field}</span>
              </span>
            </NavLink>
          </SidebarMenuButton>
          <div className="ml-4 border-l border-sidebar-border pl-2">
            <NavItems active={active} items={nav.bots[bot.key]} />
          </div>
        </SidebarMenuItem>
      ))}
      {UPCOMING_BOTS.map(bot => (
        <SidebarMenuItem key={bot.key}>
          <SidebarMenuButton
            aria-disabled
            className="pointer-events-none gap-3 rounded-lg px-2 pr-16 opacity-50"
            size="lg"
            tabIndex={-1}
          >
            <BotTile icon={bot.icon} muted />
            <span className="grid min-w-0 flex-1 text-left leading-tight">
              <span className="truncate font-semibold">{bot.name}</span>
              <span className="truncate text-xs text-sidebar-foreground/70">{bot.field}</span>
            </span>
          </SidebarMenuButton>
          <SidebarMenuBadge className="top-4 text-[11px] font-normal text-sidebar-foreground/70">
            {t('nav.soon')}
          </SidebarMenuBadge>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

/**
 * The navy menu on the left, under the header and of a piece with it: the app's screens on top,
 * then every Assistant with its pages, and who is signed in at the foot. On a phone it slides in
 * from the header's button.
 */
export function AppSidebar({ user }: { user: ProfileUser }) {
  const { pathname } = useLocation();
  const { t } = useI18n();
  const nav = useNav();
  const active = activeItem([...nav.main, ...TEAM.flatMap(bot => nav.bots[bot.key])], pathname);

  return (
    <Sidebar className="top-(--header-height) h-[calc(100svh-var(--header-height))]! group-data-[side=left]:border-r-0">
      <SidebarContent className="gap-2 px-2 py-3 [scrollbar-width:none]">
        <SidebarGroup className="py-1">
          <SidebarGroupContent>
            <NavItems active={active} items={nav.main} />
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="py-1">
          <SidebarGroupLabel className="h-8 px-3 text-xs font-medium tracking-wide text-sidebar-foreground/50 uppercase">
            {t('nav.assistants')}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <Assistants active={active} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-2 pt-1 pb-3">
        <ProfileMenu user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
