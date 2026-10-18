import { Suspense, type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';

import { TooltipProvider } from '@/components/ui/tooltip';

import { PageSkeleton } from './PageSkeleton';
import { Rail } from './Rail';

interface Props {
  user: { email: string; name: string };
}

/** The app, as in a messaging app: the dark rail on the left, the open screen filling the rest. */
export function Layout({ user }: Props) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-svh overflow-hidden">
        <Rail user={user} />
        <main className="relative min-w-0 flex-1 overflow-hidden">
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </TooltipProvider>
  );
}

/** A screen that is a page, not a list and a Conversation: it scrolls, with the usual margins. */
export function Scrolling({ children }: { children: ReactNode }) {
  return (
    <div className="relative h-full overflow-y-auto">
      <div className="w-full px-5 pt-10 pb-24 md:px-10">{children}</div>
    </div>
  );
}
