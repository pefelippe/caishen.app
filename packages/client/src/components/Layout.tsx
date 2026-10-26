import { Suspense, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { PageSkeleton } from '@zapbots/ui/blocks/page-skeleton';
import { SidebarProvider } from '@zapbots/ui/components/sidebar';
import { TooltipProvider } from '@zapbots/ui/components/tooltip';

import { refreshOnReturn } from '../lib/apollo';
import { isRailPath } from '../lib/nav';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';
import { ChatPanel, ChatPanelProvider } from './ChatPanel';
import { CommandMenu } from './CommandMenu';
import { MobileNav } from './MobileNav';
import { ToasterProvider } from './Toaster';
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

  useEffect(refreshOnReturn, []);

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
      <ToasterProvider>
        <ChatPanelProvider>
          <SidebarProvider
            // Clear of the notch, the rounded corners and the home indicator (index.html sets
            // viewport-fit=cover); the navy frame fills the space they take.
            className="h-svh flex-col overflow-hidden bg-(image:--header-gradient) pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)] md:pb-[env(safe-area-inset-bottom)] print:h-auto print:overflow-visible print:bg-none"
            onOpenChange={changeOpen}
            open={open}
            style={
              {
                '--header-height': 'calc(3.5rem + env(safe-area-inset-top))',
                '--sidebar-width': '17rem',
                '--sidebar-width-icon': '4.25rem',
              } as CSSProperties
            }
          >
            <CommandMenu>
              <AppHeader user={user} />
              <div className="flex min-h-0 flex-1">
                <AppSidebar />
                {/* The screen and the chat panel, square, against the menu. */}
                <div className="flex min-w-0 flex-1 overflow-hidden print:overflow-visible">
                  <main className="relative min-w-0 flex-1 overflow-hidden bg-background print:overflow-visible print:bg-white">
                    {/* Screens without page margins of their own (the chat, a document) still wait in
                    them, as a page does. */}
                    <Suspense
                      fallback={
                        <div className="w-full px-6 pt-12 pb-24 md:px-14">
                          <PageSkeleton />
                        </div>
                      }
                    >
                      <Outlet />
                    </Suspense>
                  </main>
                  <div className="contents print:hidden">
                    <ChatPanel />
                  </div>
                </div>
              </div>
              <MobileNav />
            </CommandMenu>
          </SidebarProvider>
        </ChatPanelProvider>
      </ToasterProvider>
    </TooltipProvider>
  );
}

/** A screen that is a page: it scrolls, with the usual margins, which it keeps while it loads. */
export function Scrolling({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="relative h-full overflow-y-auto print:h-auto print:overflow-visible">
      <div className="page-enter w-full px-6 pt-12 pb-24 md:px-14" key={pathname}>
        <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
      </div>
    </div>
  );
}
