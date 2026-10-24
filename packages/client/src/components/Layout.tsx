import { Suspense, type CSSProperties, type ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';

import { isRailPath } from '../lib/nav';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';
import { ChatPanel, ChatPanelProvider } from './ChatPanel';
import { PageSkeleton } from './PageSkeleton';
import type { ProfileUser } from './ProfileMenu';

interface Props {
  user: ProfileUser;
}

/**
 * The app as in Hostinger's hPanel: the navy header across the top, the grey menu under it on the
 * left, rounded at the top, and the open screen square beside it, out to the edges, with the chat
 * panel docked on its right when open.
 */
export function Layout({ user }: Props) {
  const { pathname } = useLocation();
  // Beside a screen with its own column the menu is a rail of icons (`AppSidebar`).
  const sidebarWidth = isRailPath(pathname) ? '6.5rem' : '17rem';

  return (
    <TooltipProvider delayDuration={300}>
      <ChatPanelProvider>
        <SidebarProvider
          className="h-svh flex-col overflow-hidden bg-(image:--header-gradient) print:h-auto print:overflow-visible print:bg-none"
          style={{ '--header-height': '4rem', '--sidebar-width': sidebarWidth } as CSSProperties}
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
