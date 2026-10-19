import { Suspense, type ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { TooltipProvider } from '@/components/ui/tooltip';

import { ChatPanel, ChatPanelProvider } from './ChatPanel';
import { PageSkeleton } from './PageSkeleton';
import { Rail } from './Rail';
import { TopBar } from './TopBar';

interface Props {
  user: { email: string; name: string };
}

/**
 * The app: the dark rail on the left, the top bar with the chat button, the open screen filling
 * the rest of the window, and the chat panel docked on the right when it is open.
 */
export function Layout({ user }: Props) {
  return (
    <TooltipProvider delayDuration={300}>
      <ChatPanelProvider>
        <div className="flex h-svh overflow-hidden bg-background">
          <Rail user={user} />
          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar />
            <div className="flex min-h-0 flex-1">
              <main className="relative min-w-0 flex-1 overflow-hidden">
                <Suspense fallback={<PageSkeleton />}>
                  <Outlet />
                </Suspense>
              </main>
              <ChatPanel />
            </div>
          </div>
        </div>
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
