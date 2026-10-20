import { Suspense, type CSSProperties, type ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';

import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';
import { ChatPanel, ChatPanelProvider } from './ChatPanel';
import { PageSkeleton } from './PageSkeleton';

interface Props {
  user: { email: string; name: string };
}

/**
 * The app on a blue page: the header across the top, then the gray menu and the open screen side
 * by side as one block, and the chat panel docked on the right when it is open.
 */
export function Layout({ user }: Props) {
  return (
    <TooltipProvider delayDuration={300}>
      <ChatPanelProvider>
        <SidebarProvider
          className="h-svh flex-col overflow-hidden bg-(image:--header-gradient)"
          style={{ '--header-height': '4rem' } as CSSProperties}
        >
          <AppHeader user={user} />
          <div className="flex min-h-0 flex-1 px-2 pb-2 md:pl-2">
            <AppSidebar />
            {/* The screen and the chat panel, rounded on the right; the menu rounds the left. */}
            <div className="flex min-w-0 flex-1 overflow-hidden rounded-2xl md:rounded-l-none">
              <main className="relative min-w-0 flex-1 overflow-hidden bg-background">
                <Suspense fallback={<PageSkeleton />}>
                  <Outlet />
                </Suspense>
              </main>
              <ChatPanel />
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
    <div className="relative h-full overflow-y-auto">
      <div className="page-enter w-full px-5 pt-10 pb-24 md:px-10" key={pathname}>
        {children}
      </div>
    </div>
  );
}
