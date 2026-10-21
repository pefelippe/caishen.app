import { Suspense, type CSSProperties, type ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';

import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';
import { ChatPanel, ChatPanelProvider } from './ChatPanel';
import { PageSkeleton } from './PageSkeleton';
import { QuickActions } from './QuickActions';

interface Props {
  user: { email: string; name: string };
}

/**
 * The app in a navy frame: the header across the top and the menu down the left, one piece, with
 * the open screen inset as a rounded light panel and the chat panel docked on its right when open.
 */
export function Layout({ user }: Props) {
  return (
    <TooltipProvider delayDuration={300}>
      <ChatPanelProvider>
        <SidebarProvider
          className="h-svh flex-col overflow-hidden bg-(image:--header-gradient) print:h-auto print:overflow-visible print:bg-none"
          style={{ '--header-height': '4rem' } as CSSProperties}
        >
          <AppHeader user={user} />
          <div className="flex min-h-0 flex-1 px-2 pb-2 md:pl-0 print:p-0">
            <AppSidebar />
            {/* The screen and the chat panel, one rounded panel inside the frame. */}
            <div className="flex min-w-0 flex-1 overflow-hidden rounded-2xl print:overflow-visible">
              <main className="relative min-w-0 flex-1 overflow-hidden bg-background print:overflow-visible print:bg-white">
                <Suspense fallback={<PageSkeleton />}>
                  <Outlet />
                </Suspense>
                <QuickActions />
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
      <div className="page-enter w-full px-5 pt-10 pb-24 md:px-10" key={pathname}>
        {children}
      </div>
    </div>
  );
}
