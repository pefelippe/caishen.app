import { ChevronDownIcon } from 'lucide-react';
import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Sidebar,
  SidebarContent,
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

import { useI18n } from '../lib/i18n';
import { activeItem, isRailPath, useNav, type NavGroup, type NavItem } from '../lib/nav';

// Measured on the hPanel: 36px entries 2px apart, an 18px icon 16px from the label. The open entry
// is a white pill; hovering one only lightens it.
const ITEM =
  'h-9 gap-4 rounded-[10px] px-3.5 text-sm font-medium text-sidebar-foreground hover:bg-white/60 data-[active=true]:bg-sidebar-accent data-[active=true]:shadow-xs [&>svg]:size-[18px]';

function NavItems({ active, items }: { active: NavItem | undefined; items: NavItem[] }) {
  const { isMobile, setOpenMobile } = useSidebar();
  const { t } = useI18n();

  return (
    <SidebarMenu className="gap-0.5">
      {items.map(item => (
        <SidebarMenuItem key={item.to}>
          {item.soon ? (
            <>
              <SidebarMenuButton
                aria-disabled
                className={cn(ITEM, 'pointer-events-none pr-20 text-muted-foreground')}
                tabIndex={-1}
              >
                <item.icon />
                <span>{item.label}</span>
              </SidebarMenuButton>
              <SidebarMenuBadge className="top-2 h-5 rounded-full bg-accent px-2 text-[11px] font-medium text-primary">
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

// The rail: each entry an icon with its name in small type under it, the open one a white tile.
const RAIL_ITEM =
  'h-auto flex-col gap-1 rounded-xl px-1 py-2 text-center text-[11px] leading-tight font-medium text-sidebar-foreground hover:bg-white/60 data-[active=true]:bg-sidebar-accent data-[active=true]:shadow-xs [&>span]:whitespace-normal [&>svg]:size-5';

/** The menu as a rail of icons, every entry in one column (the groups lose their titles). */
function RailItems({ active, items }: { active: NavItem | undefined; items: NavItem[] }) {
  return (
    <SidebarMenu className="gap-1">
      {items
        .filter(item => !item.soon)
        .map(item => (
          <SidebarMenuItem key={item.to}>
            <SidebarMenuButton asChild className={RAIL_ITEM} isActive={item === active}>
              <NavLink title={item.label} to={item.to}>
                <item.icon />
                <span>{item.label}</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
    </SidebarMenu>
  );
}

const OPEN_KEY = (group: string) => `zapbots.menu.${group}`;

function storedOpen(group: string): boolean {
  try {
    return localStorage.getItem(OPEN_KEY(group)) !== 'closed';
  } catch {
    return true;
  }
}

/** A titled part of the menu that opens and closes by its chevron; this browser remembers which. */
function Group({ active, group }: { active: NavItem | undefined; group: NavGroup }) {
  const [open, setOpen] = useState(() => storedOpen(group.key));
  const toggle = (next: boolean) => {
    setOpen(next);
    try {
      localStorage.setItem(OPEN_KEY(group.key), next ? 'open' : 'closed');
    } catch {
      // Without storage it opens again next time.
    }
  };

  return (
    <Collapsible asChild onOpenChange={toggle} open={open}>
      <SidebarGroup className="p-0">
        <SidebarGroupLabel
          asChild
          className="h-8 px-3.5 text-xs font-medium text-muted-foreground hover:text-sidebar-foreground"
        >
          <CollapsibleTrigger className="w-full">
            {group.label}
            <ChevronDownIcon
              className={cn('ml-auto size-4 transition-transform', !open && '-rotate-90')}
            />
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent>
          <SidebarGroupContent>
            <NavItems active={active} items={group.items} />
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}

/**
 * The grey menu on the left, under the navy header and rounded where it meets it (as in the
 * hPanel): the screens used most on top, then Finanças, Planejamento and Automação, each opening
 * and closing by its title. On a phone it slides in from the header's button. Beside a screen with
 * its own column (`isRailPath`) it shrinks to a rail of icons.
 */
export function AppSidebar() {
  const { pathname } = useLocation();
  const { isMobile } = useSidebar();
  const nav = useNav();
  const items = [...nav.main, ...nav.groups.flatMap(group => group.items)];
  const active = activeItem(items, pathname);

  if (isRailPath(pathname) && !isMobile) {
    return (
      <Sidebar className="top-(--header-height) h-[calc(100svh-var(--header-height))]! overflow-hidden group-data-[side=left]:border-r-0 md:pl-3 md:**:data-[slot=sidebar-inner]:rounded-tl-[20px]">
        <SidebarContent
          className="px-2 pt-3.5 pb-6 [scrollbar-width:none] animate-in fade-in duration-300"
          key="rail"
        >
          <RailItems active={active} items={items} />
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <Sidebar className="top-(--header-height) h-[calc(100svh-var(--header-height))]! overflow-hidden group-data-[side=left]:border-r-0 md:pl-3 md:**:data-[slot=sidebar-inner]:rounded-tl-[20px]">
      {/* As wide as the full menu from the start, so nothing wraps while it grows back. */}
      <SidebarContent
        className="min-w-[calc(17rem-0.75rem)] gap-3 overflow-x-hidden px-3 pt-3.5 pb-6 [scrollbar-width:none] animate-in fade-in duration-300"
        key="full"
      >
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <NavItems active={active} items={nav.main} />
          </SidebarGroupContent>
        </SidebarGroup>
        {nav.groups.map(group => (
          <Group active={active} group={group} key={group.key} />
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
