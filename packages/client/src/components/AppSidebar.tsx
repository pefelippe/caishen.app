import { Link, NavLink, useLocation } from 'react-router-dom';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from '@zapbots/ui/components/sidebar';
import { Logo } from '@zapbots/ui/blocks/logo';
import { cn } from '@zapbots/ui/lib/utils';

import { useI18n } from '../lib/i18n';
import { activeItem, useNav, type NavGroup, type NavItem } from '../lib/nav';
import { shortcut } from '../lib/shortcuts';

// After Mercado Pago's: the menu 24px in from its edges, 43px entries, an 18px icon 10px from the
// label and 20px in from the entry's edge; a group's title is flush with the entries' edge. The open entry is only blue, with no ground; hovering one gives it a light one. Collapsed,
// each is its icon alone.
const ITEM =
  'h-[43px] gap-2.5 rounded-lg px-5 text-[0.9375rem] font-normal text-sidebar-foreground hover:bg-accent/60 hover:text-sidebar-foreground data-[active=true]:bg-transparent data-[active=true]:font-medium data-[active=true]:text-primary hover:data-[active=true]:bg-accent/60 [&>svg]:size-[18px] group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:p-[11px]!';

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

/** A titled part of the menu. Collapsed to icons, the menu has no titles, only the entries. */
function Group({ active, group }: { active: NavItem | undefined; group: NavGroup }) {
  // Each group's icons take its area's colour (`data-area` in styles.css).
  return (
    <SidebarGroup
      className="p-0 [&_[data-sidebar=menu-button]>svg]:text-(--area,currentColor)"
      data-area={group.area}
    >
      <SidebarGroupLabel className="mt-4 h-10 px-0 text-[0.9375rem] font-semibold text-sidebar-foreground">
        {group.label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <NavItems active={active} items={group.items} />
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

/**
 * The mark atop the menu with the button that collapses it beside it, as in Mercado Pago's.
 * Collapsed, the mark gives way to the button under the pointer.
 */
function MenuTop() {
  const { t } = useI18n();
  return (
    <SidebarHeader className="group/top h-(--header-height) shrink-0 flex-row items-center justify-between px-7 py-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
      <Link
        aria-label={t('rail.caishen')}
        className="flex items-center gap-2.5 group-data-[collapsible=icon]:group-hover/top:hidden"
        to="/"
      >
        <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
          <Logo size={22} />
        </span>
        <span className="text-base font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
          Caishen
        </span>
      </Link>
      <SidebarTrigger
        className="size-9 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground group-data-[collapsible=icon]:hidden group-data-[collapsible=icon]:group-hover/top:inline-flex [&_svg]:size-5!"
        title={`${t('nav.collapse')} (${shortcut('B')})`}
      />
    </SidebarHeader>
  );
}

/**
 * The white menu on the left, the full height of the window, after Mercado Pago's: the mark and the
 * button that collapses it on top, the screens used most, then Finanças under its title. ⌘B/Ctrl+B
 * (or the command menu) collapses it to its icons. On a phone it slides in from
 * the header's button.
 */
export function AppSidebar() {
  const { pathname } = useLocation();
  const nav = useNav();
  const items = [...nav.main, ...nav.groups.flatMap(group => group.items)];
  const active = activeItem(items, pathname);

  return (
    <Sidebar className="overflow-hidden" collapsible="icon">
      <MenuTop />
      <SidebarContent className="gap-1 px-6 pt-6 pb-6 [scrollbar-width:none] group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2">
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
