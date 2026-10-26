import { Suspense, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { PageSkeleton } from '@zapbots/ui/blocks/page-skeleton';
import { SidebarProvider } from '@zapbots/ui/components/sidebar';
import { TooltipProvider } from '@zapbots/ui/components/tooltip';
import { cn } from '@zapbots/ui/lib/utils';

import { refreshOnReturn } from '../lib/apollo';
import { isRailPath } from '../lib/nav';
import { AppHeader } from './AppHeader';
import { AppSidebar } from './AppSidebar';
import { ChatPanel, ChatPanelProvider } from './ChatPanel';
import { ChatRepliesProvider } from './ChatReplies';
import { CommandMenu } from './CommandMenu';
import { MobileNav } from './MobileNav';
import { ToasterProvider } from './Toaster';
import type { ProfileUser } from './ProfileMenu';

interface Props {
  user: ProfileUser;
}

const MENU_KEY = 'zapbots.menu.open';

/** A page's margins, as in Mercado Pago's: centered, at most 1420px wide, under the header. */
const PAGE = 'mx-auto w-full max-w-[1420px] px-4 pt-4 pb-24 sm:px-6 md:px-10 md:pt-6 xl:px-16';

function storedMenuOpen(): boolean {
  try {
    return localStorage.getItem(MENU_KEY) !== 'closed';
  } catch {
    return true;
  }
}

/**
 * The app, after Mercado Pago's: all white, the menu down the left the full height (the mark and
 * the button that collapses it on top), and beside it the header and the open screen, with the chat
 * floating over its bottom right corner when open. On a phone the menu is a bar of tabs along the
 * bottom (`MobileNav`). This browser remembers whether the menu was collapsed; a screen with a
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
        <ChatRepliesProvider>
          <ChatPanelProvider>
            <SidebarProvider
              // Clear of the notch, the rounded corners and the home indicator (index.html sets
              // viewport-fit=cover).
              className="h-svh overflow-hidden bg-background pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)] md:pb-[env(safe-area-inset-bottom)] print:h-auto print:overflow-visible"
              onOpenChange={changeOpen}
              open={open}
              style={
                {
                  '--header-height': 'calc(4rem + env(safe-area-inset-top))',
                  '--sidebar-width': '15.25rem',
                  '--sidebar-width-icon': '4.5rem',
                } as CSSProperties
              }
            >
              <CommandMenu>
                <AppSidebar />
                {/* The header over the screen only; the menu runs the full height beside them. */}
                <div className="flex min-w-0 flex-1 flex-col overflow-hidden print:overflow-visible">
                  <AppHeader user={user} />
                  <main className="relative min-h-0 min-w-0 flex-1 overflow-hidden print:overflow-visible">
                    {/* Screens without page margins of their own (the chat, a document) still wait in
                    them, as a page does. */}
                    <Suspense
                      fallback={
                        <div className={PAGE}>
                          <PageSkeleton />
                        </div>
                      }
                    >
                      <Outlet />
                    </Suspense>
                  </main>
                  <MobileNav />
                </div>
                <div className="contents print:hidden">
                  <ChatPanel />
                </div>
              </CommandMenu>
            </SidebarProvider>
          </ChatPanelProvider>
        </ChatRepliesProvider>
      </ToasterProvider>
    </TooltipProvider>
  );
}

/** A screen that is a page: it scrolls, with the usual margins, which it keeps while it loads. */
export function Scrolling({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className="relative h-full overflow-y-auto print:h-auto print:overflow-visible">
      <div className={cn('page-enter', PAGE)} key={pathname}>
        <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
      </div>
    </div>
  );
}
