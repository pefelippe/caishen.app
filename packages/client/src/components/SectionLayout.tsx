import type { LucideIcon } from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface SectionLink {
  icon: LucideIcon;
  label: string;
  to: string;
}

export interface SectionGroup {
  label?: string;
  links: SectionLink[];
}

interface Props {
  groups: SectionGroup[];
  icon: LucideIcon;
  title: string;
}

/**
 * An area split in sections, the way admin pages usually are: the menu on the left, the open
 * section on the right. On a phone the menu becomes a row of chips on top.
 */
export function SectionLayout({ groups, icon: Icon, title }: Props) {
  const { pathname } = useLocation();
  const links = groups.flatMap(group => group.links);
  // The longest matching link wins, so /integrations/files does not also light /integrations.
  const current = [...links]
    .sort((a, b) => b.to.length - a.to.length)
    .find(link => pathname === link.to || pathname.startsWith(`${link.to}/`));

  return (
    <div className="grid h-full min-h-0 md:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="hidden min-h-0 overflow-y-auto border-r bg-card px-3 py-6 md:block">
        <div className="mb-4 flex items-center gap-2 px-3 font-semibold">
          <Icon className="size-4" />
          {title}
        </div>
        <div className="flex flex-col gap-5">
          {groups.map((group, index) => (
            <div key={group.label ?? index}>
              {group.label && (
                <div className="mb-1 px-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {group.label}
                </div>
              )}
              <ul className="flex flex-col gap-0.5">
                {group.links.map(link => (
                  <li key={link.to}>
                    <Button
                      asChild
                      className={cn(
                        'h-8 w-full justify-start gap-2 px-3 font-normal text-muted-foreground',
                        current === link && 'bg-secondary font-medium text-foreground'
                      )}
                      variant="ghost"
                    >
                      <NavLink to={link.to}>
                        <link.icon />
                        {link.label}
                      </NavLink>
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </aside>
      <div className="relative min-h-0 overflow-y-auto">
        <nav className="flex gap-1 overflow-x-auto border-b px-4 py-2 md:hidden">
          {links.map(link => (
            <Button
              asChild
              className="shrink-0"
              key={link.to}
              size="sm"
              variant={current === link ? 'default' : 'ghost'}
            >
              <NavLink to={link.to}>{link.label}</NavLink>
            </Button>
          ))}
        </nav>
        <div className="page-enter w-full px-5 pt-10 pb-24 md:px-10" key={pathname}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
