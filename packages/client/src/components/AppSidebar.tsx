import { ChevronDownIcon } from 'lucide-react';
import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@zapbots/ui/components/collapsible';
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
} from '@zapbots/ui/components/sidebar';
import { cn } from '@zapbots/ui/lib/utils';

import { useI18n } from '../lib/i18n';
import { activeItem, useNav, type NavGroup, type NavItem } from '../lib/nav';

// 36px entries 2px apart, an 18px icon 16px from the label. The open entry is a white pill; hovering
// one only lightens it. Collapsed, each is its icon alone.
const ITEM =
  'h-9 gap-4 rounded-[10px] px-3.5 text-sm font-medium text-sidebar-foreground hover:bg-white/60 data-[active=true]:bg-sidebar-accent data-[active=true]:shadow-xs dark:hover:bg-sidebar-accent [&>svg]:size-[18px] group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:p-[9px]!';

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
                tooltip={item.label}
              >
                <item.icon />
                <span>{item.label}</span>
              </SidebarMenuButton>
              <SidebarMenuBadge className="top-2 h-5 rounded-full bg-accent px-2 text-[11px] font-medium text-primary">
                {t('nav.soon')}
              </SidebarMenuBadge>
            </>
          ) : (
            <SidebarMenuButton
              asChild
              className={ITEM}
              isActive={item === active}
              tooltip={item.label}
            >
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

const OPEN_KEY = (group: string) => `zapbots.menu.${group}`;

function storedOpen(group: string): boolean {
  try {
    return localStorage.getItem(OPEN_KEY(group)) !== 'closed';
  } catch {
    return true;
  }
}

/**
 * A titled part of the menu that opens and closes by its chevron; this browser remembers which.
 * Collapsed to icons, the menu has no titles, so every group shows its entries.
 */
function Group({ active, group }: { active: NavItem | undefined; group: NavGroup }) {
  const { isMobile, state } = useSidebar();
  const [open, setOpen] = useState(() => storedOpen(group.key));
  const toggle = (next: boolean) => {
    setOpen(next);
    try {
      localStorage.setItem(OPEN_KEY(group.key), next ? 'open' : 'closed');
    } catch {
      // Without storage it opens again next time.
    }
  };
  const iconsOnly = state === 'collapsed' && !isMobile;

  return (
    <Collapsible asChild onOpenChange={toggle} open={open || iconsOnly}>
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
 * The grey menu on the left, under the navy header and rounded where it meets it: the screens used
 * most on top, then Finanças, opening and closing by its title. ⌘B/Ctrl+B (or the command menu)
 * collapses it to its icons. On a phone it slides in from the header's button.
 */
export function AppSidebar() {
  const { pathname } = useLocation();
  const nav = useNav();
  const items = [...nav.main, ...nav.groups.flatMap(group => group.items)];
  const active = activeItem(items, pathname);

  return (
    <Sidebar
      className="top-(--header-height) h-[calc(100svh-var(--header-height))]! overflow-hidden group-data-[side=left]:border-r-0 md:pl-3 md:**:data-[slot=sidebar-inner]:rounded-tl-[20px]"
      collapsible="icon"
    >
      <SidebarContent className="gap-3 px-3 pt-3.5 pb-4 [scrollbar-width:none] group-data-[collapsible=icon]:px-2">
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
