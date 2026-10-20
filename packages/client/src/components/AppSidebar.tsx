import { ChevronDownIcon } from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

import { activeItem, useNavGroups, type NavItem } from '../lib/nav';

function NavItems({ active, items }: { active: NavItem | undefined; items: NavItem[] }) {
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <SidebarMenu className="gap-0.5">
      {items.map(item => (
        <SidebarMenuItem key={item.to}>
          <SidebarMenuButton
            asChild
            className="h-10 gap-3 rounded-lg px-3 text-[0.9375rem] data-[active=true]:shadow-sm [&>svg]:size-[18px]"
            isActive={item === active}
          >
            <NavLink onClick={() => isMobile && setOpenMobile(false)} to={item.to}>
              <item.icon />
              <span>{item.label}</span>
            </NavLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

/**
 * The gray menu on the left, under the header and flush with the open screen: every screen with its icon, by category. Each
 * category folds; the open screen is a white pill. On a phone it slides in from the header's button.
 */
export function AppSidebar() {
  const { pathname } = useLocation();
  const groups = useNavGroups();
  const active = activeItem(
    groups.flatMap(group => group.items),
    pathname
  );

  return (
    <Sidebar className="top-(--header-height) left-2 h-[calc(100svh-var(--header-height)-0.5rem)]! border-r-0 **:data-[slot=sidebar-inner]:rounded-l-2xl">
      <SidebarContent className="gap-1 px-2 py-3">
        {groups.map(group =>
          group.label ? (
            <Collapsible className="group/collapsible" defaultOpen key={group.id}>
              <SidebarGroup className="py-1">
                <SidebarGroupLabel
                  asChild
                  className="h-9 px-3 text-[0.8125rem] font-medium text-sidebar-foreground/60 hover:text-sidebar-foreground"
                >
                  <CollapsibleTrigger className="w-full justify-between">
                    {group.label}
                    <ChevronDownIcon className="transition-transform duration-200 group-data-[state=closed]/collapsible:-rotate-90" />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <NavItems active={active} items={group.items} />
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          ) : (
            <SidebarGroup className="py-1" key={group.id}>
              <SidebarGroupContent>
                <NavItems active={active} items={group.items} />
              </SidebarGroupContent>
            </SidebarGroup>
          )
        )}
      </SidebarContent>
    </Sidebar>
  );
}
