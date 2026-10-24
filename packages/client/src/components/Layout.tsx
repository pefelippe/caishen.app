import { Suspense, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { PageSkeleton } from '@zapbots/ui/blocks/page-skeleton';
import { SidebarProvider } from '@zapbots/ui/components/sidebar';
import { TooltipProvider } from '@zapbots/ui/components/tooltip';

import { isRailPath } from '../lib/nav';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';
import { ChatPanel, ChatPanelProvider } from './ChatPanel';
import { MobileNav } from './MobileNav';
import type { ProfileUser } from './ProfileMenu';

interface Props {
  user: ProfileUser;
}

const MENU_KEY = 'zapbots.menu.open';

function storedMenuOpen(): boolean {
  try {
    return localStorage.getItem(MENU_KEY) !== 'closed';
  } catch {
    return true;
  }
}

/**
 * The app: the navy header across the top, the grey menu under it on the left, rounded at the top
 * and collapsing to its icons, and the open screen square beside it, with the chat panel docked on
 * its right when open. On a phone the menu is a bar of tabs along the bottom (`MobileNav`). This
 * browser remembers whether the menu was collapsed; a screen with a
 * column of its own (`isRailPath`) collapses it while open.
 */
export function Layout({ user }: Props) {
  const { pathname } = useLocation();
  const rail = isRailPath(pathname);
  const [open, setOpen] = useState(() => !rail && storedMenuOpen());

  useEffect(() => {
    setOpen(!rail && storedMenuOpen());
  }, [rail]);

  const changeOpen = (next: boolean) => {
    setOpen(next);
    try {
      localStorage.setItem(MENU_KEY, next ? 'open' : 'closed');
    } catch {
      // Without storage it opens again next time.
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <ChatPanelProvider>
        <SidebarProvider
          className="h-svh flex-col overflow-hidden bg-(image:--header-gradient) print:h-auto print:overflow-visible print:bg-none"
          onOpenChange={changeOpen}
          open={open}
          style={
            {
              '--header-height': '3.5rem',
              '--sidebar-width': '17rem',
              '--sidebar-width-icon': '4.25rem',
            } as CSSProperties
          }
        >
          <AppHeader user={user} />
          <div className="flex min-h-0 flex-1">
            <AppSidebar />
            {/* The screen and the chat panel, square, against the menu. */}
            <div className="flex min-w-0 flex-1 overflow-hidden print:overflow-visible">
              <main className="relative min-w-0 flex-1 overflow-hidden bg-background print:overflow-visible print:bg-white">
                <Suspense fallback={<PageSkeleton />}>
                  <Outlet />
                </Suspense>
              </main>
              <div className="contents print:hidden">
                <ChatPanel />
              </div>
            </div>
          </div>
          <MobileNav />
        </SidebarProvider>
      </ChatPanelProvider>
    </TooltipProvider>
  );
}

/** A screen that is a page: it scrolls, with the usual margins. */
export function Scrolling({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="relative h-full overflow-y-auto print:h-auto print:overflow-visible">
      <div className="page-enter w-full px-6 pt-12 pb-24 md:px-14" key={pathname}>
        {children}
      </div>
    </div>
  );
}
